#!/usr/bin/env node

const { Pool } = require('pg');

// Direct connection
const pool = new Pool({
  connectionString: 'postgres://ufanmu9ia72q5t:p83d9680fde47d0c65c931c0515c404056874c8a20e01f799f4e11db6b65a8333@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d1visgt8nc3hc2',
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking PostgreSQL database directly...\n');
    
    // Check companies
    const companiesResult = await pool.query('SELECT COUNT(*) as count FROM intelligence.companies');
    console.log(`📊 Companies in database: ${companiesResult.rows[0].count}`);
    
    // List first 10 companies
    const companies = await pool.query('SELECT id, name, category FROM intelligence.companies ORDER BY name LIMIT 10');
    if (companies.rows.length > 0) {
      console.log('\n📋 First 10 companies:');
      companies.rows.forEach(c => {
        console.log(`   - ${c.name} (${c.category}) [ID: ${c.id}]`);
      });
    }
    
    // Check URLs
    const urlsResult = await pool.query('SELECT COUNT(*) as count FROM intelligence.urls');
    console.log(`\n🔗 Total URLs: ${urlsResult.rows[0].count}`);
    
    // Check company_urls view
    const viewResult = await pool.query('SELECT COUNT(*) as count FROM intelligence.company_urls');
    console.log(`👁️  company_urls view count: ${viewResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
