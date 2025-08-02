#!/usr/bin/env node

const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

async function importUrls() {
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

    // Get company mapping
    const pgCompanies = await client.query('SELECT id, name FROM intelligence.companies');
    const companyMap = new Map(pgCompanies.rows.map(c => [c.name, c.id]));
    
    console.log(`Found ${companyMap.size} companies in PostgreSQL\n`);

    // Get all companies with URLs from SQLite
    const sqliteData = sqliteDb.prepare(`
      SELECT c.name as company_name, u.url, u.url_type 
      FROM companies c
      JOIN urls u ON c.id = u.company_id
      ORDER BY c.name
    `).all();

    console.log(`Found ${sqliteData.length} URLs in SQLite\n`);

    // Import URLs
    let imported = 0;
    for (const row of sqliteData) {
      const pgCompanyId = companyMap.get(row.company_name);
      if (pgCompanyId) {
        try {
          await client.query(
            'INSERT INTO intelligence.urls (company_id, url, url_type) VALUES ($1, $2, $3) ON CONFLICT (url) DO UPDATE SET company_id = $1, url_type = $3',
            [pgCompanyId, row.url, row.url_type || 'homepage']
          );
          imported++;
          console.log(`✅ Added URL for ${row.company_name}: ${row.url}`);
        } catch (err) {
          console.log(`❌ Failed to add URL for ${row.company_name}: ${err.message}`);
        }
      } else {
        console.log(`⚠️  Company "${row.company_name}" not found in PostgreSQL`);
      }
    }

    console.log(`\n✅ Imported ${imported} URLs`);

    // Final check
    const urlCount = await client.query('SELECT COUNT(*) FROM intelligence.urls');
    console.log(`\n📊 Total URLs in PostgreSQL: ${urlCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    sqliteDb.close();
    await client.end();
  }
}

importUrls();
