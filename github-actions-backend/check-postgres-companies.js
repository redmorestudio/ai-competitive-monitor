#!/usr/bin/env node

// Check PostgreSQL companies
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { db, end } = require('./postgres-db');

async function checkCompanies() {
  try {
    console.log('🔍 Checking PostgreSQL companies...\n');
    
    // Check companies count
    const countResult = await db.get('SELECT COUNT(*) as count FROM intelligence.companies');
    console.log(`📊 Total companies: ${countResult.count}`);
    
    // List all companies
    const companies = await db.all('SELECT id, name, category FROM intelligence.companies ORDER BY name LIMIT 10');
    console.log('\n📋 First 10 companies:');
    companies.forEach(c => {
      console.log(`   - ${c.name} (${c.category}) [ID: ${c.id}]`);
    });
    
    // Check URLs count
    const urlCount = await db.get('SELECT COUNT(*) as count FROM intelligence.urls');
    console.log(`\n🔗 Total URLs: ${urlCount.count}`);
    
    // Check companies with URLs
    const companiesWithUrls = await db.all(`
      SELECT c.name, COUNT(u.id) as url_count
      FROM intelligence.companies c
      LEFT JOIN intelligence.urls u ON c.id = u.company_id
      GROUP BY c.id, c.name
      HAVING COUNT(u.id) > 0
      ORDER BY url_count DESC
      LIMIT 5
    `);
    console.log('\n🏆 Top 5 companies by URL count:');
    companiesWithUrls.forEach(c => {
      console.log(`   - ${c.name}: ${c.url_count} URLs`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await end();
  }
}

checkCompanies();
