#!/usr/bin/env node

/**
 * Import all companies from SQLite to PostgreSQL
 * One-time migration script
 */

const { db: pgDb, end } = require('./postgres-db');
const Database = require('better-sqlite3');
const path = require('path');

async function importCompanies() {
  const sqliteDb = new Database(path.join(__dirname, 'data/intelligence.db'));
  
  try {
    console.log('🔄 Importing companies from SQLite to PostgreSQL...\n');
    
    // Get all companies from SQLite
    const sqliteCompanies = sqliteDb.prepare(`
      SELECT id, name, category 
      FROM companies 
      ORDER BY id
    `).all();
    
    console.log(`📊 Found ${sqliteCompanies.length} companies in SQLite`);
    
    // Clear PostgreSQL companies (careful!)
    console.log('\n⚠️  Clearing PostgreSQL companies...');
    await pgDb.run('DELETE FROM intelligence.company_urls');
    await pgDb.run('DELETE FROM intelligence.url_metadata');
    await pgDb.run('DELETE FROM intelligence.urls');
    await pgDb.run('DELETE FROM intelligence.companies');
    
    // Import companies
    for (const company of sqliteCompanies) {
      const result = await pgDb.get(`
        INSERT INTO intelligence.companies (name, category)
        VALUES ($1, $2)
        RETURNING id
      `, [company.name, company.category]);
      
      console.log(`✅ Imported ${company.name} (SQLite ID: ${company.id} → PostgreSQL ID: ${result.id})`);
      
      // Get URLs for this company from SQLite
      const urls = sqliteDb.prepare(`
        SELECT url, url_type 
        FROM urls 
        WHERE company_id = ?
      `).all(company.id);
      
      for (const url of urls) {
        // Insert URL
        const urlResult = await pgDb.get(`
          INSERT INTO intelligence.urls (url, url_type)
          VALUES ($1, $2)
          ON CONFLICT (url) DO UPDATE SET url_type = $2
          RETURNING id
        `, [url.url, url.url_type || 'homepage']);
        
        // Link to company
        await pgDb.run(`
          INSERT INTO intelligence.company_urls (company_id, url_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [result.id, urlResult.id]);
      }
      
      console.log(`   → Added ${urls.length} URLs`);
    }
    
    // Final count
    const pgCount = await pgDb.get('SELECT COUNT(*) as count FROM intelligence.companies');
    console.log(`\n✅ Import complete! PostgreSQL now has ${pgCount.count} companies`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
  } finally {
    sqliteDb.close();
    await end();
  }
}

// Confirm before running
console.log('⚠️  WARNING: This will DELETE all existing PostgreSQL companies and import from SQLite!');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  importCompanies();
}, 5000);
