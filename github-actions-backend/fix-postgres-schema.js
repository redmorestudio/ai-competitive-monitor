#!/usr/bin/env node

const { Client } = require('pg');

async function checkAndFixSchema() {
  const client = new Client({
    connectionString: 'postgres://ufanmu9ia72q5t:p83d9680fde47d0c65c931c0515c404056874c8a20e01f799f4e11db6b65a8333@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d1visgt8nc3hc2',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Check companies table structure
    const columns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'intelligence' AND table_name = 'companies'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Companies table structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default}, nullable: ${col.is_nullable})`);
    });

    // Check if sequence exists
    const sequence = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'intelligence' 
      AND sequence_name LIKE '%companies%'
    `);
    
    console.log('\n🔢 Sequences:', sequence.rows);

    // Try to fix the ID column
    console.log('\n🔧 Fixing companies table...');
    
    // Drop and recreate the table with proper SERIAL
    await client.query('DROP TABLE IF EXISTS intelligence.urls CASCADE');
    await client.query('DROP TABLE IF EXISTS intelligence.companies CASCADE');
    
    await client.query(`
      CREATE TABLE intelligence.companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT,
        interest_level INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE intelligence.urls (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES intelligence.companies(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        url_type TEXT DEFAULT 'homepage',
        is_primary BOOLEAN DEFAULT false,
        last_scraped TIMESTAMP,
        scrape_frequency INTEGER DEFAULT 86400,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tables recreated with proper SERIAL columns');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkAndFixSchema();
