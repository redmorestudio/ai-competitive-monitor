#!/usr/bin/env node

const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

async function importEverything() {
  const client = new Client({
    connectionString: 'postgres://ufanmu9ia72q5t:p83d9680fde47d0c65c931c0515c404056874c8a20e01f799f4e11db6b65a8333@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d1visgt8nc3hc2',
    ssl: {
      rejectUnauthorized: false
    }
  });

  const sqliteDb = new Database(path.join(__dirname, 'data/intelligence.db'));

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM intelligence.urls');
    await client.query('DELETE FROM intelligence.companies');
    
    // Get all companies from SQLite
    const sqliteCompanies = sqliteDb.prepare(`
      SELECT id, name, category 
      FROM companies 
      ORDER BY id
    `).all();
    
    console.log(`📊 Found ${sqliteCompanies.length} companies in SQLite\n`);
    
    // Import companies
    const companyIdMap = new Map(); // Map SQLite ID to PostgreSQL ID
    
    for (const company of sqliteCompanies) {
      const result = await client.query(
        'INSERT INTO intelligence.companies (name, category) VALUES ($1, $2) RETURNING id',
        [company.name, company.category]
      );
      companyIdMap.set(company.id, result.rows[0].id);
      console.log(`✅ Imported ${company.name} (SQLite ID: ${company.id} → PostgreSQL ID: ${result.rows[0].id})`);
    }
    
    console.log(`\n✅ Imported ${sqliteCompanies.length} companies\n`);
    
    // Get all URLs from SQLite
    const sqliteUrls = sqliteDb.prepare(`
      SELECT company_id, url, url_type 
      FROM urls 
      ORDER BY company_id
    `).all();
    
    console.log(`📊 Found ${sqliteUrls.length} URLs in SQLite\n`);
    
    // Import URLs
    let urlCount = 0;
    for (const url of sqliteUrls) {
      const pgCompanyId = companyIdMap.get(url.company_id);
      if (pgCompanyId) {
        await client.query(
          'INSERT INTO intelligence.urls (company_id, url, url_type) VALUES ($1, $2, $3)',
          [pgCompanyId, url.url, url.url_type || 'homepage']
        );
        urlCount++;
      }
    }
    
    console.log(`✅ Imported ${urlCount} URLs\n`);
    
    // Final verification
    const companyCount = await client.query('SELECT COUNT(*) FROM intelligence.companies');
    const urlCountFinal = await client.query('SELECT COUNT(*) FROM intelligence.urls');
    
    console.log('📊 Final PostgreSQL counts:');
    console.log(`   - Companies: ${companyCount.rows[0].count}`);
    console.log(`   - URLs: ${urlCountFinal.rows[0].count}`);
    
    // Show some companies with URLs
    const verification = await client.query(`
      SELECT c.name, COUNT(u.id) as url_count
      FROM intelligence.companies c
      LEFT JOIN intelligence.urls u ON c.id = u.company_id
      GROUP BY c.id, c.name
      HAVING COUNT(u.id) > 0
      ORDER BY c.name
      LIMIT 10
    `);
    
    console.log('\n✅ Sample companies with URLs:');
    verification.rows.forEach(row => {
      console.log(`   - ${row.name}: ${row.url_count} URLs`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    sqliteDb.close();
    await client.end();
  }
}

console.log('🚀 Starting complete import from SQLite to PostgreSQL...\n');
console.log('⚠️  This will REPLACE all existing PostgreSQL data!\n');

importEverything();
