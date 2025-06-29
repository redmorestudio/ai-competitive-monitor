#!/usr/bin/env node

require('dotenv').config();
const dbManager = require('./db-manager');

// Configuration
const USE_THREE_DB = process.env.USE_THREE_DB !== 'false'; // Default to true

async function main() {
  console.log('📊 Static Data Generator Starting...');
  console.log(`   Architecture: ${USE_THREE_DB ? 'Three-Database' : 'Legacy'}`);
  
  if (USE_THREE_DB) {
    // Check if three-database architecture exists
    if (!dbManager.hasThreeDbArchitecture()) {
      console.error('❌ Three-database architecture not found!');
      console.error('   Creating sample data files instead...');
    }
    
    // Use three-database generator
    console.log('   ✅ Using three-database static data generator');
    const generator = require('./generate-static-data-three-db.js');
    generator.generateAllStaticData();
  } else {
    // Use legacy generator
    console.log('   ⚠️  Using legacy static data generator (monitor.db)');
    const generator = require('./generate-static-data.js');
    generator.generateAllStaticData();
  }
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
