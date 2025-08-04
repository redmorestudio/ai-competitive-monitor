#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Enhanced Markdown Converter for PostgreSQL with OPTIONAL Smart Extraction
 * 
 * This version:
 * - Tries to use smart extraction if available
 * - Falls back gracefully if smart extraction fails
 * - Maintains full backward compatibility
 */

const TurndownService = require('turndown');
const crypto = require('crypto');
const { db, end } = require('./postgres-db');

// Try to load smart extractor if available
let SmartContentExtractor;
let smartExtractor = null;
try {
  SmartContentExtractor = require('./smart-content-extractor');
  smartExtractor = new SmartContentExtractor();
  console.log('✅ Smart content extraction available');
} catch (e) {
  console.log('⚠️ Smart content extraction not available, using basic conversion');
}

// Only load dotenv in development (not in GitHub Actions)
if (!process.env.GITHUB_ACTIONS && !process.env.POSTGRES_CONNECTION_STRING) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not available or no .env file - this is fine
  }
}

// Initialize Turndown with custom rules
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '_'
});

// Add custom rules for better AI readability
turndownService.addRule('removeScripts', {
  filter: ['script', 'style', 'noscript'],
  replacement: () => ''
});

turndownService.addRule('preserveTables', {
  filter: 'table',
  replacement: (content, node) => {
    // Keep table structure for better data extraction
    return '\n\n[TABLE]\n' + content + '\n[/TABLE]\n\n';
  }
});

class MarkdownConverterPostgreSQL {
  constructor() {
    this.hasErrors = false;
    this.errorCount = 0;
    this.warningCount = 0;
    this.stats = {
      total: 0,
      smart: 0,
      basic: 0,
      failed: 0
    };
  }

  async verifyDatabaseSchema() {
    console.log('🔍 Verifying database schema...');
    
    try {
      // Check for required tables
      const requiredTables = [
        { schema: 'raw_content', table: 'scraped_pages' },
        { schema: 'raw_content', table: 'company_pages_baseline' },
        { schema: 'processed_content', table: 'markdown_pages' },
        { schema: 'processed_content', table: 'change_detection' }
      ];

      for (const { schema, table } of requiredTables) {
        const exists = await db.get(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = $1 
            AND table_name = $2
          )`, [schema, table]);
        
        if (!exists.exists) {
          console.error(`❌ Missing table: ${schema}.${table}`);
          this.hasErrors = true;
        } else {
          console.log(`✅ Found table: ${schema}.${table}`);
        }
      }

      // Add optional columns for smart extraction if they don't exist
      if (smartExtractor) {
        console.log('📊 Adding smart extraction columns if needed...');
        const alterStatements = [
          `ALTER TABLE processed_content.markdown_pages 
           ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'basic'`,
          `ALTER TABLE processed_content.markdown_pages 
           ADD COLUMN IF NOT EXISTS is_main_content BOOLEAN DEFAULT FALSE`,
          `ALTER TABLE processed_content.markdown_pages 
           ADD COLUMN IF NOT EXISTS word_count INTEGER`,
          `ALTER TABLE processed_content.markdown_pages 
           ADD COLUMN IF NOT EXISTS extraction_metadata JSONB`
        ];

        for (const stmt of alterStatements) {
          try {
            await db.run(stmt);
          } catch (e) {
            // Ignore if column already exists
            if (!e.message.includes('already exists')) {
              console.warn('⚠️ Warning adding column:', e.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error verifying schema:', error.message);
      this.hasErrors = true;
    }
  }

  generateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async convertHtmlToMarkdownSmart(html, url, title = '') {
    // Try smart extraction if available
    if (smartExtractor) {
      try {
        const extracted = await smartExtractor.extract(html, url);
        
        if (extracted && extracted.mainContent) {
          // Successfully extracted main content
          const titleSection = title ? `# ${title}\n\n` : '';
          const markdown = titleSection + turndownService.turndown(extracted.mainContent);
          
          this.stats.smart++;
          
          return {
            markdown,
            extractionMethod: extracted.method || 'smart',
            isMainContent: true,
            wordCount: extracted.wordCount || markdown.split(/\s+/).length,
            metadata: {
              statistics: extracted.statistics,
              boilerplateRemoved: !!extracted.boilerplate
            }
          };
        }
      } catch (e) {
        console.warn(`⚠️ Smart extraction failed for ${url}, using basic:`, e.message);
      }
    }
    
    // Fallback to basic conversion
    return this.convertHtmlToMarkdownBasic(html, title);
  }

  convertHtmlToMarkdownBasic(html, title = '') {
    try {
      // Add title as H1 if present
      const titleSection = title ? `# ${title}\n\n` : '';
      
      // Convert HTML to markdown
      const markdown = turndownService.turndown(html);
      
      // Clean up excessive whitespace
      const cleanedMarkdown = (titleSection + markdown)
        .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
        .replace(/^\s+|\s+$/g, '');   // Trim start and end
      
      this.stats.basic++;
      
      return {
        markdown: cleanedMarkdown,
        extractionMethod: 'basic',
        isMainContent: false,
        wordCount: cleanedMarkdown.split(/\s+/).length,
        metadata: {}
      };
    } catch (error) {
      console.error('Error converting HTML to markdown:', error.message);
      this.stats.failed++;
      
      return {
        markdown: `Error converting content: ${error.message}`,
        extractionMethod: 'error',
        isMainContent: false,
        wordCount: 0,
        metadata: { error: error.message }
      };
    }
  }

  async processUnconvertedPages() {
    console.log('\n📄 Processing HTML pages to Markdown...');
    
    try {
      // Get all pages that need conversion
      const pages = await db.all(`
        SELECT DISTINCT ON (sp.url) 
          sp.id, sp.company, sp.url, sp.url_name, sp.html, 
          sp.title, sp.content_hash, sp.scraped_at
        FROM raw_content.scraped_pages sp
        LEFT JOIN processed_content.markdown_pages mp 
          ON sp.content_hash = mp.content_hash
        WHERE mp.id IS NULL 
          AND sp.html IS NOT NULL 
          AND sp.html != ''
        ORDER BY sp.url, sp.scraped_at DESC
      `);

      console.log(`Found ${pages.length} pages to convert`);
      
      if (pages.length === 0) {
        console.log('✅ All pages already converted');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const page of pages) {
        this.stats.total++;
        
        try {
          // Convert with smart extraction if available
          const result = await this.convertHtmlToMarkdownSmart(
            page.html, 
            page.url,
            page.title
          );
          
          // Check if we have the smart extraction columns
          const hasSmartColumns = smartExtractor !== null;
          
          // Build the insert query based on available columns
          let insertQuery;
          let insertParams;
          
          if (hasSmartColumns) {
            insertQuery = `
              INSERT INTO processed_content.markdown_pages 
              (scraped_page_id, company, url, url_name, markdown_content, 
               content_hash, created_at, extraction_method, is_main_content,
               word_count, extraction_metadata)
              VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)
            `;
            insertParams = [
              page.id,
              page.company,
              page.url,
              page.url_name,
              result.markdown,
              page.content_hash,
              result.extractionMethod,
              result.isMainContent,
              result.wordCount,
              JSON.stringify(result.metadata || {})
            ];
          } else {
            // Basic insert without smart columns
            insertQuery = `
              INSERT INTO processed_content.markdown_pages 
              (scraped_page_id, company, url, url_name, markdown_content, 
               content_hash, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `;
            insertParams = [
              page.id,
              page.company,
              page.url,
              page.url_name,
              result.markdown,
              page.content_hash
            ];
          }
          
          await db.run(insertQuery, insertParams);
          
          successCount++;
          console.log(`  ✅ ${page.url_name} (${result.extractionMethod})`);
          
        } catch (error) {
          errorCount++;
          this.errorCount++;
          console.error(`  ❌ Error processing ${page.url_name}:`, error.message);
          
          // Still try to store an error record
          try {
            await db.run(`
              INSERT INTO processed_content.markdown_pages 
              (scraped_page_id, company, url, url_name, markdown_content, 
               content_hash, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
              page.id,
              page.company,
              page.url,
              page.url_name,
              `Error: ${error.message}`,
              page.content_hash
            ]);
          } catch (insertError) {
            console.error('    Failed to store error record:', insertError.message);
          }
        }
      }

      console.log(`\n✅ Converted ${successCount} pages successfully`);
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} pages had errors`);
        this.hasErrors = true;
      }

      // Print extraction statistics if using smart extraction
      if (smartExtractor && this.stats.total > 0) {
        console.log('\n📊 Extraction Method Statistics:');
        console.log(`  Smart: ${this.stats.smart} (${(this.stats.smart/this.stats.total*100).toFixed(1)}%)`);
        console.log(`  Basic: ${this.stats.basic} (${(this.stats.basic/this.stats.total*100).toFixed(1)}%)`);
        console.log(`  Failed: ${this.stats.failed}`);
      }

    } catch (error) {
      console.error('❌ Fatal error processing pages:', error);
      this.hasErrors = true;
    }
  }

  async extractKeywordContexts() {
    console.log('\n🔍 Extracting keyword contexts...');
    
    try {
      // Get all markdown pages that need context extraction
      const pages = await db.all(`
        SELECT DISTINCT ON (mp.url)
          mp.id, mp.company, mp.url, mp.url_name, 
          mp.markdown_content, mp.content_hash
        FROM processed_content.markdown_pages mp
        LEFT JOIN processed_content.keyword_contexts kc 
          ON mp.content_hash = kc.content_hash
        WHERE kc.id IS NULL
          AND mp.markdown_content IS NOT NULL
          AND mp.markdown_content != ''
        ORDER BY mp.url, mp.created_at DESC
      `);

      console.log(`Found ${pages.length} pages needing context extraction`);

      let successCount = 0;
      let contextCount = 0;

      for (const page of pages) {
        try {
          // Extract sentences for context
          const sentences = page.markdown_content
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 20); // Min 20 chars for meaningful context

          // Get entities mentioned in this content
          const entities = await db.all(`
            SELECT DISTINCT keyword, entity_type 
            FROM baseline_analysis ba
            WHERE ba.company = $1
              AND ba.entities IS NOT NULL
          `, [page.company]);

          // Find contexts for each entity
          for (const sentence of sentences) {
            const lowerSentence = sentence.toLowerCase();
            
            for (const entity of entities) {
              if (entity.keyword && lowerSentence.includes(entity.keyword.toLowerCase())) {
                // Found a context
                await db.run(`
                  INSERT INTO processed_content.keyword_contexts
                  (company, url, keyword, entity_type, context_text, 
                   content_hash, created_at)
                  VALUES ($1, $2, $3, $4, $5, $6, NOW())
                  ON CONFLICT DO NOTHING
                `, [
                  page.company,
                  page.url,
                  entity.keyword,
                  entity.entity_type || 'unknown',
                  sentence,
                  page.content_hash
                ]);
                contextCount++;
              }
            }
          }

          successCount++;
          
        } catch (error) {
          console.error(`  ❌ Error extracting contexts for ${page.url_name}:`, error.message);
        }
      }

      console.log(`✅ Extracted ${contextCount} contexts from ${successCount} pages`);
      
    } catch (error) {
      console.error('❌ Error extracting contexts:', error);
      this.hasErrors = true;
    }
  }

  async run() {
    try {
      console.log('🚀 Markdown Converter for PostgreSQL');
      console.log('=' .repeat(80));
      
      // Verify database schema
      await this.verifyDatabaseSchema();
      
      if (this.hasErrors) {
        console.error('\n❌ Schema verification failed. Exiting.');
        process.exit(1);
      }

      // Process unconverted pages
      await this.processUnconvertedPages();
      
      // Extract keyword contexts
      await this.extractKeywordContexts();
      
      console.log('\n' + '=' .repeat(80));
      
      if (this.hasErrors) {
        console.log('⚠️  Processing completed with some errors');
        process.exit(1);
      } else {
        console.log('✅ All processing completed successfully!');
      }
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    } finally {
      await end();
    }
  }
}

// Run the converter
const converter = new MarkdownConverterPostgreSQL();
converter.run().catch(console.error);
