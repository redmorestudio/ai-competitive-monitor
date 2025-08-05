#!/usr/bin/env node

/**
 * Apply company extraction filtering to static data generation
 * This wrapper filters companies before generating the static data files
 */

// Load environment variables
require('dotenv').config();

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');
const { analyzeCompanyExtractions } = require('./filter-company-extractions');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function updateCompanyFiltering() {
  console.log('🎯 Applying company filtering before static data generation...\n');
  
  try {
    // First, run the analysis to get filtered companies
    console.log('Step 1: Analyzing company extractions...');
    const filterResult = await analyzeCompanyExtractions();
    
    console.log(`\n📊 Filtering Results:`);
    console.log(`  - Total companies found: ${filterResult.statistics.totalUnique}`);
    console.log(`  - After filtering: ${filterResult.statistics.afterFiltering}`);
    console.log(`  - Removed: ${filterResult.statistics.removed}`);
    console.log(`  - Suspicious pages: ${filterResult.statistics.suspicious}`);
    
    // Save the filtered company list
    const filteredDataPath = path.join(__dirname, 'data', 'filtered-companies.json');
    fs.mkdirSync(path.dirname(filteredDataPath), { recursive: true });
    
    fs.writeFileSync(filteredDataPath, JSON.stringify({
      generated_at: new Date().toISOString(),
      valid_companies: filterResult.validCompanies,
      statistics: filterResult.statistics,
      suspicious_pages: filterResult.suspiciousPages
    }, null, 2));
    
    console.log(`\n✅ Saved filtered company list to ${filteredDataPath}`);
    
    // Update database to mark non-valid companies
    console.log('\nStep 2: Updating database with filtering results...');
    
    // Create a temp table with valid companies
    await db.run(`
      CREATE TEMP TABLE valid_companies (
        name TEXT PRIMARY KEY
      )
    `);
    
    // Insert valid companies
    for (const company of filterResult.validCompanies) {
      await db.run(`
        INSERT INTO valid_companies (name) VALUES ($1)
        ON CONFLICT DO NOTHING
      `, [company]);
    }
    
    // Log companies that will be filtered out
    const toRemove = await db.all(`
      SELECT DISTINCT company 
      FROM intelligence.baseline_analysis
      WHERE entities->'companies' IS NOT NULL
        AND company NOT IN (SELECT name FROM valid_companies)
    `);
    
    if (toRemove.length > 0) {
      console.log(`\n🗑️  Marking ${toRemove.length} companies for filtering in visualizations`);
    }
    
    // Now run the actual static data generator
    console.log('\nStep 3: Running static data generator with filtered companies...');
    
    // Export the filtered companies as an environment variable
    process.env.FILTERED_COMPANIES = JSON.stringify(filterResult.validCompanies);
    
    // Run the original static data generator
    const generator = spawn('node', ['generate-static-data-three-db-postgres-with-contexts.js'], {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit'
    });
    
    generator.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Static data generation completed with filtered companies');
      } else {
        console.error(`\n❌ Static data generator exited with code ${code}`);
      }
      end();
      process.exit(code);
    });
    
  } catch (error) {
    console.error('❌ Error in company filtering:', error);
    end();
    process.exit(1);
  }
}

// Run the filtering
updateCompanyFiltering();
