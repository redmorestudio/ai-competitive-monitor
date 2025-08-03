#!/usr/bin/env node

// Load env
if (!process.env.GITHUB_ACTIONS && !process.env.POSTGRES_CONNECTION_STRING) {
  try {
    require('dotenv').config();
  } catch (e) {}
}

const { db, end } = require('./postgres-db');

async function checkColumns() {
  console.log('Checking smart extraction columns...\n');
  
  // Check markdown_pages columns
  const markdownCols = await db.all(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'processed_content' 
    AND table_name = 'markdown_pages'
    AND column_name IN ('extraction_method', 'is_main_content', 'word_count', 'extraction_metadata')
    ORDER BY column_name
  `);
  
  console.log('markdown_pages columns:');
  markdownCols.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
  });
  
  // Check change_detection columns
  const changeCols = await db.all(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'processed_content' 
    AND table_name = 'change_detection'
    AND column_name IN ('change_location', 'is_boilerplate_change', 'main_content_hash', 'boilerplate_hash')
    ORDER BY column_name
  `);
  
  console.log('\nchange_detection columns:');
  changeCols.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
  });
  
  // Check if keyword_contexts table exists
  const keywordTable = await db.get(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'processed_content' 
      AND table_name = 'keyword_contexts'
    )
  `);
  
  console.log('\nkeyword_contexts table exists:', keywordTable.exists);
  
  await end();
}

checkColumns().catch(console.error);
