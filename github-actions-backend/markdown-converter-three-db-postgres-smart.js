#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Enhanced Markdown Converter for PostgreSQL
 * 
 * This version ensures that ALL content referenced in change_detection
 * has corresponding markdown, even if we missed processing runs.
 */

const TurndownService = require('turndown');
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

class MarkdownConverterPostgreSQL {
  constructor() {
    this.hasErrors = false;
    this.errorCount = 0;
    this.warningCount = 0;
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
    } catch (error) {
      console.error('❌ Error verifying schema:', error.message);
      this.hasErrors = true;
    }
  }

  generateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  convertHtmlToMarkdown(html, title = '') {
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
    console.log('\n📄 Processing scraped pages into markdown...');
    
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
      
      // Get unprocessed pages - FIXED: use 'company' not 'company_name'
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
          
          // Convert to markdown
          const markdown = this.convertHtmlToMarkdown(page.html, title);
          const markdownHash = this.generateContentHash(markdown);
          
          // Store markdown version
          await db.run(`
            INSERT INTO processed_content.markdown_pages 
            (company, url, url_name, content, markdown_hash, source_hash, 
             source_type, created_at, title)
            VALUES ($1, $2, $3, $4, $5, $6, 'scraped_page', NOW(), $7)
            ON CONFLICT (source_hash) DO NOTHING
          `, [
            page.company,
            page.url,
            new URL(page.url).pathname || '/',
            markdown,
            markdownHash,
            page.content_hash,
            title
          ]);
          
          converted++;
          
          if (converted % 10 === 0) {
            console.log(`  Processed ${converted}/${unprocessedPages.length} pages...`);
          }
        } catch (error) {
          console.error(`❌ Error processing page ${page.url}:`, error.message);
          errors++;
          this.errorCount++;
        }
      }
      
      console.log(`✅ Converted ${converted} scraped pages to markdown (${errors} errors)`);
      return { converted, errors };
      
    } catch (error) {
      console.error('❌ Fatal error processing scraped pages:', error);
      this.hasErrors = true;
      throw error;
    }
  }

  async processBaselines() {
    console.log('\n📊 Processing baseline pages into markdown...');
    
    try {
      // Count unprocessed baselines
      const unprocessedCount = await db.get(`
        SELECT COUNT(*) as count
        FROM raw_content.company_pages_baseline cpb
        WHERE NOT EXISTS (
          SELECT 1 FROM processed_content.markdown_pages mp
          WHERE mp.source_hash = cpb.content_hash
          AND mp.source_type = 'baseline'
        )
      `);
      
      console.log(`Found ${unprocessedCount.count} unprocessed baseline pages`);
      
      if (unprocessedCount.count === 0) {
        console.log('✅ All baseline pages already processed');
        return { converted: 0, errors: 0 };
      }
      
      // Get unprocessed baselines
      const unprocessedBaselines = await db.all(`
        SELECT cpb.*
        FROM raw_content.company_pages_baseline cpb
        WHERE NOT EXISTS (
          SELECT 1 FROM processed_content.markdown_pages mp
          WHERE mp.source_hash = cpb.content_hash
          AND mp.source_type = 'baseline'
        )
        ORDER BY cpb.last_updated DESC
      `);
      
      let converted = 0;
      let errors = 0;
      
      for (const baseline of unprocessedBaselines) {
        try {
          // Convert to markdown
          const markdown = this.convertHtmlToMarkdown(baseline.html, baseline.title);
          const markdownHash = this.generateContentHash(markdown);
          
          // Store markdown version
          await db.run(`
            INSERT INTO processed_content.markdown_pages 
            (company, url, url_name, content, markdown_hash, source_hash, 
             source_type, created_at, title)
            VALUES ($1, $2, $3, $4, $5, $6, 'baseline', NOW(), $7)
            ON CONFLICT (source_hash) DO NOTHING
          `, [
            baseline.company,
            baseline.url,
            baseline.url_name,
            markdown,
            markdownHash,
            baseline.content_hash,
            baseline.title
          ]);
          
          converted++;
          
          if (converted % 10 === 0) {
            console.log(`  Processed ${converted}/${unprocessedBaselines.length} baselines...`);
          }
        } catch (error) {
          console.error(`❌ Error processing baseline ${baseline.url}:`, error.message);
          errors++;
          this.errorCount++;
        }
      }
      
      console.log(`✅ Converted ${converted} baseline pages to markdown (${errors} errors)`);
      return { converted, errors };
      
    } catch (error) {
      console.error('❌ Fatal error processing baselines:', error);
      this.hasErrors = true;
      throw error;
    }
  }

  async backfillMissingMarkdown() {
    console.log('\n🔧 Checking for missing markdown from change_detection references...');
    
    try {
      // Find content hashes referenced in change_detection but missing markdown
      const missingMarkdown = await db.all(`
        WITH referenced_hashes AS (
          SELECT DISTINCT old_hash as hash FROM processed_content.change_detection WHERE old_hash IS NOT NULL
          UNION
          SELECT DISTINCT new_hash as hash FROM processed_content.change_detection WHERE new_hash IS NOT NULL
        )
        SELECT 
          rh.hash, 
          sp.company, 
          sp.url, 
          sp.html,
          sp.title
        FROM referenced_hashes rh
        JOIN raw_content.scraped_pages sp ON sp.content_hash = rh.hash
        WHERE NOT EXISTS (
          SELECT 1 FROM processed_content.markdown_pages mp
          WHERE mp.source_hash = rh.hash
        )
        AND sp.html IS NOT NULL
        LIMIT 100
      `);
      
      if (missingMarkdown.length === 0) {
        console.log('✅ No missing markdown found');
        return { converted: 0 };
      }
      
      console.log(`Found ${missingMarkdown.length} missing markdown entries to backfill`);
      
      let converted = 0;
      
      for (const missing of missingMarkdown) {
        try {
          // Use existing title or extract from HTML
          let title = missing.title;
          if (!title && missing.html) {
            const titleMatch = missing.html.match(/<title[^>]*>([^<]+)<\/title>/i);
            title = titleMatch ? titleMatch[1].trim() : '';
          }
          
          const markdown = this.convertHtmlToMarkdown(missing.html, title);
          const markdownHash = this.generateContentHash(markdown);
          
          await db.run(`
            INSERT INTO processed_content.markdown_pages 
            (company, url, url_name, content, markdown_hash, source_hash, 
             source_type, created_at, title)
            VALUES ($1, $2, $3, $4, $5, $6, 'backfill', NOW(), $7)
            ON CONFLICT (source_hash) DO NOTHING
          `, [
            missing.company,
            missing.url,
            new URL(missing.url).pathname || '/',
            markdown,
            markdownHash,
            missing.hash,
            title
          ]);
          
          converted++;
        } catch (error) {
          console.error(`❌ Error backfilling markdown for hash ${missing.hash}:`, error.message);
          this.errorCount++;
        }
      }
      
      console.log(`✅ Backfilled ${converted} missing markdown entries`);
      return { converted };
      
    } catch (error) {
      console.error('❌ Error during backfill:', error);
      this.warningCount++;
      return { converted: 0 };
    }
  }

  async generateStats() {
    console.log('\n📊 Generating conversion statistics...');
    
    try {
      const stats = await db.get(`
        SELECT 
          (SELECT COUNT(*) FROM raw_content.scraped_pages) as total_scraped,
          (SELECT COUNT(*) FROM raw_content.company_pages_baseline) as total_baselines,
          (SELECT COUNT(*) FROM processed_content.markdown_pages) as total_markdown,
          (SELECT COUNT(DISTINCT source_hash) FROM processed_content.markdown_pages) as unique_markdown,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE source_type = 'scraped_page') as markdown_from_scraped,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE source_type = 'baseline') as markdown_from_baseline,
          (SELECT COUNT(*) FROM processed_content.markdown_pages WHERE source_type = 'backfill') as markdown_from_backfill
      `);
      
      console.log('\n📈 Conversion Statistics:');
      console.log(`  Total scraped pages: ${stats.total_scraped}`);
      console.log(`  Total baseline pages: ${stats.total_baselines}`);
      console.log(`  Total markdown pages: ${stats.total_markdown}`);
      console.log(`  Unique content hashes: ${stats.unique_markdown}`);
      console.log(`  Markdown from scraped: ${stats.markdown_from_scraped}`);
      console.log(`  Markdown from baseline: ${stats.markdown_from_baseline}`);
      console.log(`  Markdown from backfill: ${stats.markdown_from_backfill}`);
      
      // Check coverage
      const coverage = await db.get(`
        WITH all_hashes AS (
          SELECT content_hash FROM raw_content.scraped_pages WHERE content_hash IS NOT NULL
          UNION
          SELECT content_hash FROM raw_content.company_pages_baseline WHERE content_hash IS NOT NULL
        )
        SELECT 
          COUNT(DISTINCT ah.content_hash) as total_unique_content,
          COUNT(DISTINCT mp.source_hash) as markdown_coverage
        FROM all_hashes ah
        LEFT JOIN processed_content.markdown_pages mp ON ah.content_hash = mp.source_hash
      `);
      
      const coveragePercent = coverage.total_unique_content > 0 
        ? (coverage.markdown_coverage / coverage.total_unique_content * 100).toFixed(1)
        : 0;
      console.log(`\n  Coverage: ${coverage.markdown_coverage}/${coverage.total_unique_content} (${coveragePercent}%)`);
      
    } catch (error) {
      console.error('❌ Error generating stats:', error);
      this.warningCount++;
    }
  }

  async run() {
    console.log('🚀 Markdown Converter for PostgreSQL');
    console.log('=' .repeat(60));
    
    try {
      // Verify schema
      await this.verifyDatabaseSchema();
      if (this.hasErrors) {
        throw new Error('Database schema verification failed');
      }
      
      // Process in order
      const scrapedResults = await this.processScrapedPages();
      const baselineResults = await this.processBaselines();
      const backfillResults = await this.backfillMissingMarkdown();
      
      // Generate statistics
      await this.generateStats();
      
      // Summary
      const totalConverted = scrapedResults.converted + baselineResults.converted + backfillResults.converted;
      const totalErrors = scrapedResults.errors + baselineResults.errors;
      
      console.log('\n' + '=' .repeat(60));
      console.log('✅ Markdown conversion complete!');
      console.log(`  Total converted: ${totalConverted}`);
      console.log(`  Total errors: ${totalErrors}`);
      console.log(`  Warnings: ${this.warningCount}`);
      
      if (this.hasErrors || totalErrors > 0) {
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
const converter = new MarkdownConverterPostgreSQL();
converter.run().catch(console.error);
