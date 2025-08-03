#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Enhanced Markdown Converter with Smart Content Extraction
 * 
 * This version uses Mozilla Readability to:
 * - Extract main article content from boilerplate
 * - Provide cleaner markdown for AI analysis
 * - Track extraction methods and quality
 */

const TurndownService = require('turndown');
const SmartContentExtractor = require('./smart-content-extractor');
const crypto = require('crypto');
const { db, end } = require('./postgres-db');

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

class EnhancedMarkdownConverter {
  constructor() {
    this.hasErrors = false;
    this.errorCount = 0;
    this.warningCount = 0;
    this.smartExtractor = new SmartContentExtractor();
    this.conversionStats = {
      readability: 0,
      basic: 0,
      fallback: 0,
      failed: 0
    };
  }

  async verifyDatabaseSchema() {
    console.log('🔍 Verifying and updating database schema...');
    
    try {
      // Add new columns if they don't exist
      const schemaUpdates = [
        `ALTER TABLE processed_content.markdown_pages 
         ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'legacy'`,
        
        `ALTER TABLE processed_content.markdown_pages 
         ADD COLUMN IF NOT EXISTS is_main_content BOOLEAN DEFAULT FALSE`,
        
        `ALTER TABLE processed_content.markdown_pages 
         ADD COLUMN IF NOT EXISTS word_count INTEGER`,
        
        `ALTER TABLE processed_content.markdown_pages 
         ADD COLUMN IF NOT EXISTS extraction_metadata JSONB`,
        
        `ALTER TABLE processed_content.change_detection
         ADD COLUMN IF NOT EXISTS change_location TEXT DEFAULT 'unknown'`,
        
        `ALTER TABLE processed_content.change_detection
         ADD COLUMN IF NOT EXISTS is_boilerplate_change BOOLEAN DEFAULT FALSE`,
        
        `ALTER TABLE processed_content.change_detection
         ADD COLUMN IF NOT EXISTS main_content_hash TEXT`,
        
        `ALTER TABLE processed_content.change_detection
         ADD COLUMN IF NOT EXISTS boilerplate_hash TEXT`
      ];

      for (const update of schemaUpdates) {
        try {
          await db.run(update);
          console.log('✅ Schema update applied');
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error('❌ Schema update failed:', err.message);
          }
        }
      }

      // Create indexes for performance
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_extraction_method 
         ON processed_content.markdown_pages(extraction_method)`,
        
        `CREATE INDEX IF NOT EXISTS idx_change_location 
         ON processed_content.change_detection(change_location)`
      ];

      for (const index of indexes) {
        try {
          await db.run(index);
        } catch (err) {
          // Index might already exist
        }
      }

      console.log('✅ Database schema verified and updated');
    } catch (error) {
      console.error('❌ Error verifying schema:', error.message);
      this.hasErrors = true;
    }
  }

  generateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  convertHtmlToMarkdownSmart(html, url, title = '') {
    try {
      // Try smart extraction first
      const extracted = this.smartExtractor.extractMainContent(html, url);
      
      if (extracted.success && extracted.content) {
        // Convert extracted HTML to markdown
        let markdown;
        if (extracted.contentHtml) {
          markdown = turndownService.turndown(extracted.contentHtml);
        } else {
          // For basic extraction, use plain text
          markdown = extracted.content;
        }
        
        // Add metadata as frontmatter
        const frontmatter = `---
title: ${extracted.title || title}
extraction_method: ${extracted.method}
word_count: ${extracted.wordCount}
byline: ${extracted.byline}
excerpt: ${extracted.excerpt}
---

`;
        
        // Update stats
        this.conversionStats[extracted.method]++;
        
        return {
          markdown: frontmatter + markdown,
          metadata: extracted,
          success: true
        };
      }
      
      // Fallback to original method
      this.conversionStats.fallback++;
      return {
        markdown: this.convertHtmlToMarkdownLegacy(html, title),
        metadata: { method: 'fallback' },
        success: false
      };
      
    } catch (error) {
      console.error('Smart extraction failed:', error);
      this.conversionStats.failed++;
      return {
        markdown: this.convertHtmlToMarkdownLegacy(html, title),
        metadata: { method: 'error', error: error.message },
        success: false
      };
    }
  }

  convertHtmlToMarkdownLegacy(html, title = '') {
    try {
      // Add title as H1 if present
      const titleSection = title ? `# ${title}\n\n` : '';
      
      // Convert HTML to markdown
      const markdown = turndownService.turndown(html);
      
      // Clean up excessive whitespace
      const cleaned = markdown
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+$/gm, '')
        .trim();
      
      return titleSection + cleaned;
    } catch (error) {
      console.error('Error converting HTML:', error.message);
      return `# ${title}\n\n[Error converting content: ${error.message}]`;
    }
  }

  async processScrapedPages() {
    console.log('\n📄 Processing scraped pages with smart extraction...');
    
    try {
      // Count unprocessed pages
      const unprocessedCount = await db.get(`
        SELECT COUNT(*) as count
        FROM raw_content.scraped_pages sp
        WHERE NOT EXISTS (
          SELECT 1 FROM processed_content.markdown_pages mp
          WHERE mp.source_hash = sp.content_hash
        )
      `);
      
      console.log(`Found ${unprocessedCount.count} unprocessed pages`);
      
      if (unprocessedCount.count === 0) {
        console.log('✅ All scraped pages already processed');
        return { converted: 0, errors: 0 };
      }
      
      // Get unprocessed pages
      const unprocessedPages = await db.all(`
        SELECT 
          sp.id,
          sp.company,
          sp.url,
          sp.html,
          sp.content_hash,
          sp.scraped_at,
          sp.scrape_status,
          sp.title
        FROM raw_content.scraped_pages sp
        WHERE NOT EXISTS (
          SELECT 1 FROM processed_content.markdown_pages mp
          WHERE mp.source_hash = sp.content_hash
        )
        AND sp.html IS NOT NULL
        AND sp.content_hash IS NOT NULL
        ORDER BY sp.scraped_at DESC
        LIMIT 100
      `);
      
      let converted = 0;
      let errors = 0;
      
      for (const page of unprocessedPages) {
        try {
          // Use existing title or extract from HTML
          let title = page.title;
          if (!title && page.html) {
            const titleMatch = page.html.match(/<title[^>]*>([^<]+)<\/title>/i);
            title = titleMatch ? titleMatch[1].trim() : '';
          }
          
          // Convert to markdown with smart extraction
          const result = this.convertHtmlToMarkdownSmart(page.html, page.url, title);
          const markdownHash = this.generateContentHash(result.markdown);
          
          // Extract boilerplate for separate tracking
          const boilerplate = this.smartExtractor.extractBoilerplate(page.html, page.url);
          
          // Store markdown version with metadata
          await db.run(`
            INSERT INTO processed_content.markdown_pages 
            (company, url, url_name, content, markdown_hash, source_hash, 
             source_type, created_at, title, extraction_method, is_main_content,
             word_count, extraction_metadata)
            VALUES ($1, $2, $3, $4, $5, $6, 'scraped_page', NOW(), $7, $8, $9, $10, $11)
            ON CONFLICT (source_hash) DO UPDATE SET
              extraction_method = EXCLUDED.extraction_method,
              is_main_content = EXCLUDED.is_main_content,
              word_count = EXCLUDED.word_count,
              extraction_metadata = EXCLUDED.extraction_metadata
          `, [
            page.company,
            page.url,
            new URL(page.url).pathname || '/',
            result.markdown,
            markdownHash,
            page.content_hash,
            title,
            result.metadata.method || 'unknown',
            result.success,
            result.metadata.wordCount || 0,
            JSON.stringify({
              ...result.metadata,
              boilerplateHash: boilerplate?.hash
            })
          ]);
          
          converted++;
          
          if (converted % 10 === 0) {
            console.log(`  Processed ${converted}/${unprocessedPages.length} pages...`);
            console.log(`  Methods: Readability: ${this.conversionStats.readability}, Basic: ${this.conversionStats.basic}, Fallback: ${this.conversionStats.fallback}`);
          }
        } catch (error) {
          console.error(`❌ Error processing page ${page.url}:`, error.message);
          errors++;
          this.errorCount++;
        }
      }
      
      console.log(`✅ Converted ${converted} scraped pages to markdown (${errors} errors)`);
      console.log(`   Extraction methods used:`);
      console.log(`   - Readability: ${this.conversionStats.readability}`);
      console.log(`   - Basic: ${this.conversionStats.basic}`);
      console.log(`   - Fallback: ${this.conversionStats.fallback}`);
      console.log(`   - Failed: ${this.conversionStats.failed}`);
      
      return { converted, errors };
      
    } catch (error) {
      console.error('❌ Fatal error processing scraped pages:', error);
      this.hasErrors = true;
      throw error;
    }
  }

  async generateStats() {
    console.log('\n📊 Generating conversion statistics...');
    
    try {
      const stats = await db.get(`
        SELECT 
          (SELECT COUNT(*) FROM raw_content.scraped_pages) as total_scraped,
          (SELECT COUNT(*) FROM processed_content.markdown_pages) as total_markdown,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE extraction_method = 'readability') as readability_count,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE extraction_method = 'basic') as basic_count,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE extraction_method = 'fallback') as fallback_count,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE extraction_method = 'legacy') as legacy_count,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE is_main_content = true) as main_content_count,
          (SELECT AVG(word_count) FROM processed_content.markdown_pages WHERE word_count IS NOT NULL) as avg_word_count
      `);
      
      console.log('\n📈 Conversion Statistics:');
      console.log(`  Total scraped pages: ${stats.total_scraped}`);
      console.log(`  Total markdown pages: ${stats.total_markdown}`);
      console.log(`  Extraction methods:`);
      console.log(`    - Readability: ${stats.readability_count}`);
      console.log(`    - Basic: ${stats.basic_count}`);
      console.log(`    - Fallback: ${stats.fallback_count}`);
      console.log(`    - Legacy: ${stats.legacy_count}`);
      console.log(`  Main content extracted: ${stats.main_content_count}`);
      console.log(`  Average word count: ${Math.round(stats.avg_word_count || 0)}`);
      
      // Calculate extraction success rate
      const smartExtractionRate = stats.total_markdown > 0 
        ? ((stats.readability_count + stats.basic_count) / stats.total_markdown * 100).toFixed(1)
        : 0;
      console.log(`  Smart extraction rate: ${smartExtractionRate}%`);
      
    } catch (error) {
      console.error('❌ Error generating stats:', error);
      this.warningCount++;
    }
  }

  async run() {
    console.log('🚀 Enhanced Markdown Converter with Smart Content Extraction');
    console.log('=' .repeat(60));
    
    try {
      // Verify and update schema
      await this.verifyDatabaseSchema();
      if (this.hasErrors) {
        throw new Error('Database schema verification failed');
      }
      
      // Process pages with smart extraction
      const results = await this.processScrapedPages();
      
      // Generate statistics
      await this.generateStats();
      
      // Get extractor stats
      const extractorStats = this.smartExtractor.getStats();
      console.log('\n📊 Extractor Performance:');
      console.log(`  Total processed: ${extractorStats.totalProcessed}`);
      console.log(`  Readability success rate: ${extractorStats.successRate}`);
      
      // Summary
      console.log('\n' + '=' .repeat(60));
      console.log('✅ Smart markdown conversion complete!');
      console.log(`  Total converted: ${results.converted}`);
      console.log(`  Total errors: ${results.errors}`);
      console.log(`  Warnings: ${this.warningCount}`);
      
      if (this.hasErrors || results.errors > 0) {
        console.log('\n⚠️  Some errors occurred during processing');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    } finally {
      await end(); // Close PostgreSQL connection pool
    }
  }
}

// Run the converter
const converter = new EnhancedMarkdownConverter();
converter.run().catch(console.error);
