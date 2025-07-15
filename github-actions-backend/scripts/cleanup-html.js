#!/usr/bin/env node

/**
 * HTML Cleanup Utility for AI Competitive Monitor
 * 
 * This script implements a rolling retention policy for raw HTML content
 * to prevent the raw_content.db from growing indefinitely.
 * 
 * Retention Policy:
 * 1. Keep the latest HTML for each URL (for hash comparison)
 * 2. Keep HTML for changes detected in the last 7 days (for diff generation)
 * 3. Delete everything else
 */

const path = require('path');
const dbManager = require('../db-manager');

// Configuration
const RETENTION_DAYS = 7; // Keep HTML for changes in the last N days
const VACUUM_THRESHOLD = 100 * 1024 * 1024; // 100MB - vacuum if we free more than this

function cleanupRawContent() {
    console.log('🧹 Starting HTML cleanup process...');
    
    try {
        // Get database connection
        const rawDb = dbManager.getRawDb();
        
        // Get initial database size
        const initialStats = rawDb.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
        const initialSize = initialStats.size;
        console.log(`📊 Initial database size: ${(initialSize / 1024 / 1024).toFixed(2)} MB`);
        
        // Create index if it doesn't exist for efficient cleanup
        console.log('📇 Ensuring indexes exist...');
        rawDb.exec(`
            CREATE INDEX IF NOT EXISTS idx_raw_html_scraped_at ON raw_html(scraped_at);
            CREATE INDEX IF NOT EXISTS idx_raw_html_url_id_id ON raw_html(url_id, id DESC);
        `);
        
        // Get count before cleanup
        const beforeCount = rawDb.prepare('SELECT COUNT(*) as count FROM raw_html').get().count;
        console.log(`📈 Records before cleanup: ${beforeCount}`);
        
        // Step 1: Identify records to keep
        console.log('🔍 Identifying records to keep...');
        
        // Get the latest HTML ID for each URL
        const latestHtmlIds = rawDb.prepare(`
            SELECT MAX(id) as id
            FROM raw_html
            GROUP BY url_id
        `).all().map(row => row.id);
        
        console.log(`✅ Found ${latestHtmlIds.length} latest HTML records to keep`);
        
        // Get HTML IDs referenced by recent changes
        // First, attach the processed content database
        const processedDbPath = path.join(__dirname, '..', 'data', 'processed_content.db');
        const intelligenceDbPath = path.join(__dirname, '..', 'data', 'intelligence.db');
        
        rawDb.exec(`ATTACH DATABASE '${processedDbPath}' AS processed`);
        rawDb.exec(`ATTACH DATABASE '${intelligenceDbPath}' AS intelligence`);
        
        const recentChangeHtmlIds = rawDb.prepare(`
            SELECT DISTINCT rh.id
            FROM raw_html rh
            JOIN processed.markdown_content mc ON rh.id = mc.raw_html_id
            JOIN processed.change_detection cd ON mc.id IN (cd.old_content_id, cd.new_content_id)
            WHERE cd.detected_at > datetime('now', '-${RETENTION_DAYS} days')
        `).all().map(row => row.id);
        
        console.log(`✅ Found ${recentChangeHtmlIds.length} HTML records referenced by recent changes`);
        
        // Combine all IDs to keep
        const idsToKeep = new Set([...latestHtmlIds, ...recentChangeHtmlIds]);
        console.log(`📋 Total unique records to keep: ${idsToKeep.size}`);
        
        // Step 2: Delete old records
        console.log('🗑️ Deleting old HTML records...');
        
        // Convert Set to comma-separated string for SQL
        const idsToKeepStr = Array.from(idsToKeep).join(',');
        
        if (idsToKeepStr.length > 0) {
            const deleteResult = rawDb.prepare(`
                DELETE FROM raw_html 
                WHERE id NOT IN (${idsToKeepStr})
            `).run();
            
            console.log(`✅ Deleted ${deleteResult.changes} old HTML records`);
        } else {
            console.log('⚠️ No records to keep found, skipping deletion for safety');
        }
        
        // Step 3: Clean up orphaned records in scrape_runs
        console.log('🧹 Cleaning up orphaned scrape run records...');
        
        const scrapeRunCleanup = rawDb.prepare(`
            DELETE FROM scrape_runs
            WHERE started_at < datetime('now', '-${RETENTION_DAYS} days')
        `).run();
        
        console.log(`✅ Deleted ${scrapeRunCleanup.changes} old scrape run records`);
        
        // Get count after cleanup
        const afterCount = rawDb.prepare('SELECT COUNT(*) as count FROM raw_html').get().count;
        console.log(`📉 Records after cleanup: ${afterCount} (removed ${beforeCount - afterCount})`);
        
        // Detach databases
        rawDb.exec('DETACH DATABASE processed');
        rawDb.exec('DETACH DATABASE intelligence');
        
        // Step 4: Vacuum if we freed significant space
        const afterStats = rawDb.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
        const afterSize = afterStats.size;
        const freedSpace = initialSize - afterSize;
        
        console.log(`💾 Database size after cleanup: ${(afterSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`🎯 Space freed: ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
        
        if (freedSpace > VACUUM_THRESHOLD) {
            console.log('🔧 Running VACUUM to reclaim disk space...');
            rawDb.exec('VACUUM');
            
            const vacuumStats = rawDb.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
            const vacuumSize = vacuumStats.size;
            console.log(`✅ Database size after VACUUM: ${(vacuumSize / 1024 / 1024).toFixed(2)} MB`);
        }
        
        // Summary
        console.log('\n📊 Cleanup Summary:');
        console.log(`- Records removed: ${beforeCount - afterCount}`);
        console.log(`- Space reclaimed: ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
        console.log(`- Final database size: ${(afterSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('✅ HTML cleanup completed successfully!');
        
        return {
            recordsRemoved: beforeCount - afterCount,
            spaceReclaimed: freedSpace,
            finalSize: afterSize
        };
        
    } catch (error) {
        console.error('❌ Error during HTML cleanup:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    try {
        cleanupRawContent();
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

module.exports = { cleanupRawContent };
