#!/usr/bin/env node

/**
 * PostgreSQL Company Management Script
 * Manage companies directly in PostgreSQL database
 */

const { db, end } = require('./postgres-db');

const command = process.argv[2];
const args = process.argv.slice(3);

async function listCompanies() {
  try {
    const companies = await db.all(`
      SELECT 
        c.id, 
        c.name, 
        c.category,
        COUNT(cu.url_id) as url_count
      FROM intelligence.companies c
      LEFT JOIN intelligence.company_urls cu ON c.id = cu.company_id
      GROUP BY c.id, c.name, c.category
      ORDER BY c.name
    `);
    
    console.log('\n📊 Companies in PostgreSQL:\n');
    console.log('ID | Name | Category | URLs');
    console.log('-'.repeat(60));
    
    companies.forEach(c => {
      console.log(`${c.id.toString().padEnd(3)} | ${c.name.padEnd(25)} | ${c.category.padEnd(20)} | ${c.url_count}`);
    });
    
    console.log(`\nTotal: ${companies.length} companies`);
  } catch (error) {
    console.error('❌ Error listing companies:', error);
  }
}

async function addCompany(name, category = 'AI Tools') {
  try {
    // Check if company already exists
    const existing = await db.get(
      'SELECT id FROM intelligence.companies WHERE name = $1',
      [name]
    );
    
    if (existing) {
      console.log(`⚠️  Company "${name}" already exists with ID ${existing.id}`);
      return existing.id;
    }
    
    // Add new company
    const result = await db.get(`
      INSERT INTO intelligence.companies (name, category)
      VALUES ($1, $2)
      RETURNING id
    `, [name, category]);
    
    console.log(`✅ Added company "${name}" with ID ${result.id}`);
    return result.id;
  } catch (error) {
    console.error('❌ Error adding company:', error);
  }
}

async function deleteCompany(name) {
  try {
    const company = await db.get(
      'SELECT id FROM intelligence.companies WHERE name = $1',
      [name]
    );
    
    if (!company) {
      console.log(`⚠️  Company "${name}" not found`);
      return;
    }
    
    // Delete in correct order due to foreign keys
    await db.run('DELETE FROM intelligence.company_urls WHERE company_id = $1', [company.id]);
    await db.run('DELETE FROM intelligence.url_metadata WHERE company_id = $1', [company.id]);
    await db.run('DELETE FROM intelligence.companies WHERE id = $1', [company.id]);
    
    console.log(`✅ Deleted company "${name}" and all associated data`);
  } catch (error) {
    console.error('❌ Error deleting company:', error);
  }
}

async function addUrl(companyName, url, urlType = 'homepage') {
  try {
    const company = await db.get(
      'SELECT id FROM intelligence.companies WHERE name = $1',
      [companyName]
    );
    
    if (!company) {
      console.log(`⚠️  Company "${companyName}" not found`);
      return;
    }
    
    // First add to urls table if not exists
    let urlRecord = await db.get(
      'SELECT id FROM intelligence.urls WHERE url = $1',
      [url]
    );
    
    if (!urlRecord) {
      urlRecord = await db.get(`
        INSERT INTO intelligence.urls (url, url_type)
        VALUES ($1, $2)
        RETURNING id
      `, [url, urlType]);
    }
    
    // Link to company
    await db.run(`
      INSERT INTO intelligence.company_urls (company_id, url_id)
      VALUES ($1, $2)
      ON CONFLICT (company_id, url_id) DO NOTHING
    `, [company.id, urlRecord.id]);
    
    console.log(`✅ Added URL "${url}" to company "${companyName}"`);
  } catch (error) {
    console.error('❌ Error adding URL:', error);
  }
}

async function showHelp() {
  console.log(`
PostgreSQL Company Management Tool

Usage:
  node manage-companies-postgres.js <command> [args]

Commands:
  list                          - List all companies
  add <name> [category]        - Add a new company
  delete <name>                - Delete a company
  add-url <company> <url> [type] - Add URL to company
  help                         - Show this help

Examples:
  node manage-companies-postgres.js list
  node manage-companies-postgres.js add "New AI Company" "LLM Providers"
  node manage-companies-postgres.js add-url "OpenAI" "https://openai.com/api" "api"
  `);
}

async function main() {
  try {
    switch (command) {
      case 'list':
        await listCompanies();
        break;
      case 'add':
        if (!args[0]) {
          console.error('❌ Company name required');
          break;
        }
        await addCompany(args[0], args[1]);
        break;
      case 'delete':
        if (!args[0]) {
          console.error('❌ Company name required');
          break;
        }
        await deleteCompany(args[0]);
        break;
      case 'add-url':
        if (!args[0] || !args[1]) {
          console.error('❌ Company name and URL required');
          break;
        }
        await addUrl(args[0], args[1], args[2]);
        break;
      case 'help':
      default:
        await showHelp();
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await end();
  }
}

main();
