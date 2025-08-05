#!/usr/bin/env node

/**
 * Filter and validate extracted companies
 * Reduces noise by only including companies that appear multiple times
 * and flags suspicious pages with too many company mentions
 */

// Load environment variables
require('dotenv').config();

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');

// Configuration
const MIN_MENTIONS_THRESHOLD = 2;  // Company must appear at least this many times
const MAX_COMPANIES_PER_PAGE = 15; // Pages with more companies are suspicious
const MONITORED_COMPANIES = new Set([
  // Primary AI companies we monitor
  'OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Meta', 'Amazon',
  'NVIDIA', 'Apple', 'Tesla', 'IBM', 'Oracle', 'Salesforce',
  'Adobe', 'SAP', 'Alibaba', 'Baidu', 'Tencent', 'ByteDance',
  'Hugging Face', 'Cohere', 'Stability AI', 'Midjourney', 'Runway',
  'Inflection AI', 'Character.AI', 'Jasper', 'Copy.ai', 'Writer',
  'Adept', 'Perplexity', 'You.com', 'Neeva', 'Glean', 'Hebbia',
  'Scale AI', 'Weights & Biases', 'Anyscale', 'Modal', 'Replicate',
  'Lightning AI', 'Databricks', 'Snowflake', 'Palantir', 'C3.ai',
  'DataRobot', 'H2O.ai', 'Dataiku', 'Domino Data Lab', 'Alteryx'
]);

async function analyzeCompanyExtractions() {
  console.log('🔍 Analyzing company extractions for filtering...\n');
  
  try {
    // Get all baseline analyses with entities
    const analyses = await db.all(`
      SELECT 
        company,
        url,
        entities,
        analysis_date
      FROM intelligence.baseline_analysis
      WHERE entities IS NOT NULL
      ORDER BY analysis_date DESC
    `);
    
    console.log(`Found ${analyses.length} analyses with entities\n`);
    
    // Track company mentions and suspicious pages
    const companyMentions = {};
    const suspiciousPages = [];
    const pageCompanyCounts = {};
    
    // Process each analysis
    for (const analysis of analyses) {
      const pageKey = `${analysis.company}|${analysis.url}`;
      
      try {
        const entities = analysis.entities;
        const companies = entities?.companies || [];
        
        pageCompanyCounts[pageKey] = companies.length;
        
        // Check if page has too many companies
        if (companies.length > MAX_COMPANIES_PER_PAGE) {
          suspiciousPages.push({
            page: pageKey,
            company: analysis.company,
            url: analysis.url,
            count: companies.length,
            date: analysis.analysis_date
          });
          
          console.log(`⚠️  SUSPICIOUS: ${analysis.company} - ${analysis.url}`);
          console.log(`   Found ${companies.length} companies (threshold: ${MAX_COMPANIES_PER_PAGE})`);
          continue; // Skip counting from suspicious pages
        }
        
        // Count mentions from valid pages
        for (const company of companies) {
          let companyName = null;
          if (typeof company === 'string') {
            companyName = company;
          } else if (company && typeof company === 'object' && company.name) {
            companyName = company.name;
          }
          
          if (companyName) {
            companyMentions[companyName] = (companyMentions[companyName] || 0) + 1;
          }
        }
        
      } catch (e) {
        console.error(`Error processing entities for ${pageKey}:`, e);
      }
    }
    
    // Analyze results
    console.log('\n📊 ANALYSIS RESULTS:\n');
    console.log('='.repeat(60));
    
    // Suspicious pages
    if (suspiciousPages.length > 0) {
      console.log('\n🚨 SUSPICIOUS PAGES (excluded from company counts):');
      console.log('-'.repeat(40));
      for (const page of suspiciousPages) {
        console.log(`  ${page.company}: ${page.count} companies`);
        console.log(`    URL: ${page.url}`);
      }
    }
    
    // Company frequency analysis
    const companiesByFrequency = Object.entries(companyMentions)
      .sort((a, b) => b[1] - a[1]);
    
    const validCompanies = companiesByFrequency
      .filter(([name, count]) => count >= MIN_MENTIONS_THRESHOLD);
    
    const singleMentionCompanies = companiesByFrequency
      .filter(([name, count]) => count === 1);
    
    console.log('\n📈 COMPANY MENTION STATISTICS:');
    console.log('-'.repeat(40));
    console.log(`  Total unique companies: ${companiesByFrequency.length}`);
    console.log(`  Companies with ${MIN_MENTIONS_THRESHOLD}+ mentions: ${validCompanies.length}`);
    console.log(`  Single-mention companies: ${singleMentionCompanies.length}`);
    console.log(`  Monitored companies found: ${validCompanies.filter(([name]) => MONITORED_COMPANIES.has(name)).length}`);
    
    // Top companies
    console.log('\n🏆 TOP 20 MOST MENTIONED COMPANIES:');
    console.log('-'.repeat(40));
    for (let i = 0; i < Math.min(20, validCompanies.length); i++) {
      const [name, count] = validCompanies[i];
      const isMonitored = MONITORED_COMPANIES.has(name) ? '✓' : ' ';
      console.log(`  ${(i+1).toString().padStart(2)}. [${isMonitored}] ${name}: ${count} mentions`);
    }
    
    // Companies to be filtered out
    console.log('\n🗑️  COMPANIES TO BE FILTERED (single mention):');
    console.log('-'.repeat(40));
    console.log(`  Removing ${singleMentionCompanies.length} companies with only 1 mention`);
    if (singleMentionCompanies.length <= 20) {
      for (const [name] of singleMentionCompanies) {
        console.log(`    - ${name}`);
      }
    } else {
      console.log(`  (showing first 20 of ${singleMentionCompanies.length})`);
      for (let i = 0; i < 20; i++) {
        console.log(`    - ${singleMentionCompanies[i][0]}`);
      }
    }
    
    // Summary
    console.log('\n📋 FILTERING SUMMARY:');
    console.log('='.repeat(60));
    console.log(`  BEFORE: ${companiesByFrequency.length} companies`);
    console.log(`  AFTER:  ${validCompanies.length} companies (${MIN_MENTIONS_THRESHOLD}+ mentions)`);
    console.log(`  REDUCTION: ${Math.round((1 - validCompanies.length/companiesByFrequency.length) * 100)}%`);
    
    // Create filtered company list
    const filteredCompanies = new Set();
    for (const [name, count] of validCompanies) {
      filteredCompanies.add(name);
    }
    
    // Always include monitored companies even if low mentions
    for (const company of MONITORED_COMPANIES) {
      filteredCompanies.add(company);
    }
    
    console.log(`\n✅ Final company count: ${filteredCompanies.size}`);
    
    return {
      validCompanies: Array.from(filteredCompanies),
      suspiciousPages,
      statistics: {
        totalUnique: companiesByFrequency.length,
        afterFiltering: filteredCompanies.size,
        removed: singleMentionCompanies.length,
        suspicious: suspiciousPages.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error analyzing company extractions:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  analyzeCompanyExtractions()
    .then(result => {
      console.log('\n✅ Analysis complete');
      console.log(`   Valid companies: ${result.validCompanies.length}`);
      console.log(`   Suspicious pages: ${result.suspiciousPages.length}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    })
    .finally(() => {
      end();
    });
}

module.exports = {
  analyzeCompanyExtractions,
  MONITORED_COMPANIES,
  MIN_MENTIONS_THRESHOLD,
  MAX_COMPANIES_PER_PAGE
};
