#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * EMERGENCY FIX: Change key_insights column type from text[] to JSONB
 * This fixes the analyzer failure where it's trying to insert JSONB into text[] column
 */

const { db, end } = require('./postgres-db');

async function fixKeyInsightsColumn() {
  console.log('🚨 EMERGENCY FIX: Changing key_insights column type from text[] to JSONB');
  console.log('=' .repeat(60));
  
  try {
    // First check the current column type
    const columnInfo = await db.get(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'intelligence'
      AND table_name = 'enhanced_analysis'
      AND column_name = 'key_insights'
    `);
    
    console.log('Current column info:', columnInfo);
    
    if (columnInfo && columnInfo.udt_name === '_text') {
      console.log('❌ Column is text[] - needs fixing!');
      
      // Drop the column and recreate as JSONB
      console.log('📝 Altering column type to JSONB...');
      await db.run(`
        ALTER TABLE intelligence.enhanced_analysis 
        ALTER COLUMN key_insights TYPE JSONB USING key_insights::text::jsonb
      `);
      
      console.log('✅ Column type changed to JSONB');
    } else if (columnInfo && columnInfo.data_type === 'jsonb') {
      console.log('✅ Column is already JSONB - no fix needed');
    } else {
      console.log('⚠️ Column not found or unexpected type:', columnInfo);
      
      // Add the column if it doesn't exist
      console.log('📝 Adding key_insights column as JSONB...');
      await db.run(`
        ALTER TABLE intelligence.enhanced_analysis 
        ADD COLUMN IF NOT EXISTS key_insights JSONB
      `);
      console.log('✅ Column added as JSONB');
    }
    
    // Verify the fix
    const verifyInfo = await db.get(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'intelligence'
      AND table_name = 'enhanced_analysis'
      AND column_name = 'key_insights'
    `);
    
    console.log('✅ Verification - Column is now:', verifyInfo);
    
  } catch (error) {
    console.error('❌ Error fixing column:', error);
    process.exit(1);
  } finally {
    await end();
  }
}

// Run the fix
fixKeyInsightsColumn().catch(console.error);
