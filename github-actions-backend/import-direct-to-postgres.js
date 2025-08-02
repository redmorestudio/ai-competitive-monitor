#!/usr/bin/env node

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

// Direct connection to Heroku PostgreSQL
const pool = new Pool({
  connectionString: 'postgres://ufanmu9ia72q5t:p83d9680fde47d0c65c931c0515c404056874c8a20e01f799f4e11db6b65a8333@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d1visgt8nc3hc2',
  ssl: { rejectUnauthorized: false }
});

async function importCompanies() {
  const sqliteDb = new Database(path.join(__dirname, 'data/intelligence.db'));
  
  try {
    console.log('🔄 Importing companies from SQLite to PostgreSQL (Heroku)...\n');
    
    // Get all companies from SQLite
    const sqliteCompanies = sqliteDb.prepare(`
      SELECT id, name, category 
      FROM companies 
      ORDER BY id
    `).all();
    
    console.log(`📊 Found ${sqliteCompanies.length} companies in SQLite`);
    
    // Clear PostgreSQL companies (careful!)
    console.log('\n⚠️  Clearing PostgreSQL companies...');
    await pool.query('DELETE FROM intelligence.urls');
    await pool.query('DELETE FROM intelligence.companies');
    
    // Import companies
    for (const company of sqliteCompanies) {
      // First, check if this company already exists
      const existing = await pool.query(
        'SELECT id FROM intelligence.companies WHERE name = $1',
        [company.name]
      );
      
      let newId;
      if (existing.rows.length > 0) {
        newId = existing.rows[0].id;
        console.log(`⚠️  ${company.name} already exists (ID: ${newId})`);
      } else {
        // Insert with explicit ID to maintain consistency
        const result = await pool.query(
          'INSERT INTO intelligence.companies (id, name, category) VALUES ($1, $2, $3) RETURNING id',
          [company.id, company.name, company.category]
        );
        newId = result.rows[0].id;
        console.log(`✅ Imported ${company.name} (ID: ${newId})`);
      }
      
      // Get URLs for this company from SQLite
      const urls = sqliteDb.prepare(`
        SELECT url, url_type 
        FROM urls 
        WHERE company_id = ?
      `).all(company.id);
      
      for (const url of urls) {
        // Insert URL directly with company_id (no ON CONFLICT)
        try {
          await pool.query(
            'INSERT INTO intelligence.urls (company_id, url, url_type) VALUES ($1, $2, $3)',
            [newId, url.url, url.url_type || 'homepage']
          );
        } catch (err) {
          // Ignore duplicate URL errors
          if (err.code !== '23505') {
            console.log(`   ⚠️  Error adding URL ${url.url}: ${err.message}`);
          }
        }
      }
      
      console.log(`   → Added ${urls.length} URLs`);
    }
    
    // Final count
    const pgCount = await pool.query('SELECT COUNT(*) as count FROM intelligence.companies');
    console.log(`\n✅ Import complete! PostgreSQL now has ${pgCount.rows[0].count} companies`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

// Run immediately
importCompanies();
