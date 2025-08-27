#!/usr/bin/env node

/**
 * Diagnose PostgreSQL Data Issues
 * Check what data is actually in the database
 */

require('dotenv').config();

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');

async function diagnose() {
    console.log('🔍 PostgreSQL Database Diagnostic');
    console.log('=' .repeat(60));
    
    try {
        // Check companies
        const companyCount = await db.get(`
            SELECT COUNT(*) as count FROM intelligence.companies
        `);
        console.log(`\n📊 Companies: ${companyCount.count}`);
        
        if (companyCount.count > 0) {
            const sampleCompanies = await db.all(`
                SELECT name, category FROM intelligence.companies LIMIT 5
            `);
            console.log('Sample companies:');
            sampleCompanies.forEach(c => console.log(`  - ${c.name} (${c.category})`));
        }
        
        // Check URLs
        const urlCount = await db.get(`
            SELECT COUNT(*) as count FROM intelligence.urls
        `);
        console.log(`\n🔗 URLs: ${urlCount.count}`);
        
        // Check scraped pages
        const scrapedCount = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT company) as companies,
                COUNT(DISTINCT url) as urls,
                MAX(scraped_at) as latest
            FROM raw_content.scraped_pages
        `);
        console.log(`\n📄 Scraped Pages:`);
        console.log(`  Total: ${scrapedCount.total}`);
        console.log(`  Companies: ${scrapedCount.companies}`);
        console.log(`  URLs: ${scrapedCount.urls}`);
        console.log(`  Latest: ${scrapedCount.latest}`);
        
        // Check recent scrapes
        const recentScrapes = await db.get(`
            SELECT COUNT(*) as count 
            FROM raw_content.scraped_pages
            WHERE scraped_at > NOW() - INTERVAL '24 hours'
        `);
        console.log(`  Last 24h: ${recentScrapes.count}`);
        
        // Check changes
        const changeCount = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN detected_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                COUNT(CASE WHEN detected_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
                MAX(detected_at) as latest
            FROM intelligence.changes
        `);
        console.log(`\n🔄 Changes:`);
        console.log(`  Total: ${changeCount.total}`);
        console.log(`  Last 24h: ${changeCount.last_24h}`);
        console.log(`  Last 7d: ${changeCount.last_7d}`);
        console.log(`  Latest: ${changeCount.latest}`);
        
        // Check change_detection table
        const changeDetectionCount = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN detected_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                COUNT(CASE WHEN detected_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
                MAX(detected_at) as latest
            FROM processed_content.change_detection
        `);
        console.log(`\n🔍 Change Detection:`);
        console.log(`  Total: ${changeDetectionCount.total}`);
        console.log(`  Last 24h: ${changeDetectionCount.last_24h}`);
        console.log(`  Last 7d: ${changeDetectionCount.last_7d}`);
        console.log(`  Latest: ${changeDetectionCount.latest}`);
        
        // Check baseline analysis
        const analysisCount = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT company) as companies,
                COUNT(CASE WHEN analysis_date > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                MAX(analysis_date) as latest
            FROM intelligence.baseline_analysis
        `);
        console.log(`\n🧠 Baseline Analysis:`);
        console.log(`  Total: ${analysisCount.total}`);
        console.log(`  Companies: ${analysisCount.companies}`);
        console.log(`  Last 24h: ${analysisCount.last_24h}`);
        console.log(`  Latest: ${analysisCount.latest}`);
        
        // Check enhanced analysis
        const enhancedCount = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT company) as companies,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                MAX(created_at) as latest
            FROM intelligence.enhanced_analysis
        `);
        console.log(`\n✨ Enhanced Analysis:`);
        console.log(`  Total: ${enhancedCount.total}`);
        console.log(`  Companies: ${enhancedCount.companies}`);
        console.log(`  Last 24h: ${enhancedCount.last_24h}`);
        console.log(`  Latest: ${enhancedCount.latest}`);
        
        // Check entity groups
        const entityCount = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN group_type = 'company' THEN 1 END) as companies,
                COUNT(CASE WHEN group_type = 'product' THEN 1 END) as products,
                COUNT(CASE WHEN group_type = 'technology' THEN 1 END) as technologies
            FROM intelligence.entity_groups
        `);
        console.log(`\n🏷️ Entity Groups:`);
        console.log(`  Total: ${entityCount.total}`);
        console.log(`  Companies: ${entityCount.companies}`);
        console.log(`  Products: ${entityCount.products}`);
        console.log(`  Technologies: ${entityCount.technologies}`);
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ Diagnostic complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    diagnose().catch(console.error);
}

module.exports = diagnose;