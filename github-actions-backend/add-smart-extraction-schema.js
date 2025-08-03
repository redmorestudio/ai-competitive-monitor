#!/usr/bin/env node

/**
 * Add Smart Content Extraction Schema Updates
 * Uses Schema Protector for safe database modifications
 */

// Only load dotenv in development (not in GitHub Actions)
if (!process.env.GITHUB_ACTIONS && !process.env.POSTGRES_CONNECTION_STRING) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not available or no .env file - this is fine
  }
}

const { SchemaProtector } = require('./schema-protector');
const { db, end } = require('./postgres-db');

async function addSmartExtractionSchema() {
  const protector = new SchemaProtector();
  
  await protector.executeWithProtection(
    'add-smart-extraction-schema.js',
    'Adding smart content extraction columns and tables',
    async () => {
      console.log('🔧 Adding smart content extraction schema updates...');
      
      // Add columns to markdown_pages for extraction tracking
      const markdownPageUpdates = [
        {
          column: 'extraction_method',
          definition: "ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'legacy'"
        },
        {
          column: 'is_main_content',
          definition: 'ADD COLUMN IF NOT EXISTS is_main_content BOOLEAN DEFAULT FALSE'
        },
        {
          column: 'word_count',
          definition: 'ADD COLUMN IF NOT EXISTS word_count INTEGER'
        },
        {
          column: 'extraction_metadata',
          definition: 'ADD COLUMN IF NOT EXISTS extraction_metadata JSONB'
        }
      ];
      
      for (const update of markdownPageUpdates) {
        try {
          await db.run(`
            ALTER TABLE processed_content.markdown_pages 
            ${update.definition}
          `);
          console.log(`✅ Added column: ${update.column} to markdown_pages`);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            throw err;
          }
          console.log(`ℹ️  Column ${update.column} already exists`);
        }
      }
      
      // Add columns to change_detection for boilerplate tracking
      const changeDetectionUpdates = [
        {
          column: 'change_location',
          definition: "ADD COLUMN IF NOT EXISTS change_location TEXT DEFAULT 'unknown'"
        },
        {
          column: 'is_boilerplate_change',
          definition: 'ADD COLUMN IF NOT EXISTS is_boilerplate_change BOOLEAN DEFAULT FALSE'
        },
        {
          column: 'main_content_hash',
          definition: 'ADD COLUMN IF NOT EXISTS main_content_hash TEXT'
        },
        {
          column: 'boilerplate_hash',
          definition: 'ADD COLUMN IF NOT EXISTS boilerplate_hash TEXT'
        }
      ];
      
      for (const update of changeDetectionUpdates) {
        try {
          await db.run(`
            ALTER TABLE processed_content.change_detection 
            ${update.definition}
          `);
          console.log(`✅ Added column: ${update.column} to change_detection`);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            throw err;
          }
          console.log(`ℹ️  Column ${update.column} already exists`);
        }
      }
      
      // Create keyword_contexts table for enhanced extraction
      console.log('📋 Creating keyword_contexts table...');
      await db.run(`
        CREATE TABLE IF NOT EXISTS processed_content.keyword_contexts (
          id SERIAL PRIMARY KEY,
          company VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          keyword VARCHAR(255) NOT NULL,
          keyword_type VARCHAR(50),
          contexts JSONB,
          main_content_count INTEGER DEFAULT 0,
          boilerplate_count INTEGER DEFAULT 0,
          avg_quality DECIMAL(3,2),
          extraction_method VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP,
          UNIQUE(company, url, keyword)
        )
      `);
      console.log('✅ Created keyword_contexts table');
      
      // Create indexes for performance
      const indexes = [
        {
          name: 'idx_extraction_method',
          definition: 'CREATE INDEX IF NOT EXISTS idx_extraction_method ON processed_content.markdown_pages(extraction_method)'
        },
        {
          name: 'idx_change_location',
          definition: 'CREATE INDEX IF NOT EXISTS idx_change_location ON processed_content.change_detection(change_location)'
        },
        {
          name: 'idx_keyword_contexts_company',
          definition: 'CREATE INDEX IF NOT EXISTS idx_keyword_contexts_company ON processed_content.keyword_contexts(company)'
        },
        {
          name: 'idx_keyword_contexts_keyword',
          definition: 'CREATE INDEX IF NOT EXISTS idx_keyword_contexts_keyword ON processed_content.keyword_contexts(keyword)'
        },
        {
          name: 'idx_keyword_contexts_quality',
          definition: 'CREATE INDEX IF NOT EXISTS idx_keyword_contexts_quality ON processed_content.keyword_contexts(avg_quality DESC)'
        }
      ];
      
      for (const index of indexes) {
        try {
          await db.run(index.definition);
          console.log(`✅ Created index: ${index.name}`);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.warn(`⚠️  Index ${index.name} might already exist:`, err.message);
          }
        }
      }
      
      console.log('\n✅ Smart content extraction schema updates complete!');
      
      // Show summary of changes
      const summary = await db.get(`
        SELECT 
          (SELECT COUNT(*) 
           FROM information_schema.columns 
           WHERE table_schema = 'processed_content' 
           AND table_name = 'markdown_pages'
           AND column_name IN ('extraction_method', 'is_main_content', 'word_count', 'extraction_metadata')
          ) as markdown_columns_added,
          (SELECT COUNT(*) 
           FROM information_schema.columns 
           WHERE table_schema = 'processed_content' 
           AND table_name = 'change_detection'
           AND column_name IN ('change_location', 'is_boilerplate_change', 'main_content_hash', 'boilerplate_hash')
          ) as change_columns_added,
          EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'processed_content' 
            AND table_name = 'keyword_contexts'
          ) as keyword_table_exists
      `);
      
      console.log('\n📊 Schema Update Summary:');
      console.log(`  Markdown pages columns added: ${summary.markdown_columns_added}/4`);
      console.log(`  Change detection columns added: ${summary.change_columns_added}/4`);
      console.log(`  Keyword contexts table exists: ${summary.keyword_table_exists}`);
    }
  );
}

// Main execution
async function main() {
  console.log('🚀 Smart Content Extraction Schema Updater');
  console.log('=' .repeat(60));
  console.log('This script uses the Schema Protector for safe updates\n');
  
  try {
    await addSmartExtractionSchema();
    console.log('\n✅ All schema updates completed successfully!');
  } catch (error) {
    console.error('\n❌ Error updating schema:', error);
    process.exit(1);
  } finally {
    await end();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addSmartExtractionSchema };
