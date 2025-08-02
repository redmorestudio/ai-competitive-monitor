#!/usr/bin/env node

const { Pool } = require('pg');

// Direct connection to Heroku PostgreSQL
const pool = new Pool({
  connectionString: 'postgres://ufanmu9ia72q5t:p83d9680fde47d0c65c931c0515c404056874c8a20e01f799f4e11db6b65a8333@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d1visgt8nc3hc2',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('🔍 Checking PostgreSQL schema...\n');
    
    // Check companies table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'intelligence' AND table_name = 'companies'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Companies table structure:');
    result.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
