#!/usr/bin/env node

const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    connectionString: 'postgres://ufanmu9ia72q5t:p83d9680fde47d0c65c931c0515c404056874c8a20e01f799f4e11db6b65a8333@cee3ebbhveeoab.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d1visgt8nc3hc2',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database\n');

    // Check companies
    const companiesResult = await client.query('SELECT COUNT(*) FROM intelligence.companies');
    console.log(`📊 Total companies: ${companiesResult.rows[0].count}`);

    // List some companies
    const companiesList = await client.query('SELECT id, name, category FROM intelligence.companies ORDER BY name LIMIT 10');
    console.log('\n📋 First 10 companies:');
    companiesList.rows.forEach(c => {
      console.log(`   - ${c.name} (${c.category}) [ID: ${c.id}]`);
    });

    // Check URLs
    const urlsResult = await client.query('SELECT COUNT(*) FROM intelligence.urls');
    console.log(`\n🔗 Total URLs: ${urlsResult.rows[0].count}`);

    // Check companies with URLs
    const companiesWithUrls = await client.query(`
      SELECT c.name, COUNT(u.id) as url_count
      FROM intelligence.companies c
      LEFT JOIN intelligence.urls u ON c.id = u.company_id
      GROUP BY c.id, c.name
      HAVING COUNT(u.id) > 0
      ORDER BY url_count DESC
      LIMIT 5
    `);
    console.log('\n🏆 Top 5 companies by URL count:');
    companiesWithUrls.rows.forEach(c => {
      console.log(`   - ${c.name}: ${c.url_count} URLs`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
