#!/usr/bin/env node

/**
 * Fix Company Entity Classification
 * Distinguishes between:
 * - 'monitored_company': Companies we're actually tracking (54 configured)
 * - 'mentioned_company': Other companies found in content but not monitored
 */

require('dotenv').config();
const { db, end } = require('./postgres-db');

async function fixCompanyClassification() {
    console.log('🔧 Fixing company entity classification...\n');
    
    try {
        // 1. Get all configured/monitored companies
        const monitoredCompanies = await db.all(`
            SELECT id, name 
            FROM intelligence.companies 
            WHERE is_monitored = true
            ORDER BY name
        `);
        
        console.log(`📊 Found ${monitoredCompanies.length} monitored companies\n`);
        
        // Create a set of monitored company names (lowercase for matching)
        const monitoredNames = new Set(
            monitoredCompanies.map(c => c.name.toLowerCase())
        );
        
        // 2. Get all entity groups currently marked as 'company'
        const companyEntities = await db.all(`
            SELECT id, canonical_name, group_type
            FROM intelligence.entity_groups
            WHERE group_type = 'company'
            ORDER BY canonical_name
        `);
        
        console.log(`Found ${companyEntities.length} entities marked as 'company'\n`);
        
        let monitoredCount = 0;
        let mentionedCount = 0;
        
        // 3. Update each entity with proper classification
        for (const entity of companyEntities) {
            const isMonitored = monitoredNames.has(entity.canonical_name.toLowerCase());
            const newType = isMonitored ? 'monitored_company' : 'mentioned_company';
            
            await db.run(`
                UPDATE intelligence.entity_groups
                SET group_type = $1
                WHERE id = $2
            `, [newType, entity.id]);
            
            if (isMonitored) {
                monitoredCount++;
                console.log(`✅ ${entity.canonical_name} → monitored_company`);
            } else {
                mentionedCount++;
                console.log(`📝 ${entity.canonical_name} → mentioned_company`);
            }
        }
        
        console.log('\n📊 Classification Summary:');
        console.log(`Monitored Companies: ${monitoredCount}`);
        console.log(`Mentioned Companies: ${mentionedCount}`);
        
        // 4. Verify the update
        const verification = await db.all(`
            SELECT 
                group_type,
                COUNT(*) as count
            FROM intelligence.entity_groups
            WHERE group_type LIKE '%company%'
            GROUP BY group_type
            ORDER BY group_type
        `);
        
        console.log('\n✅ Final Entity Group Distribution:');
        for (const row of verification) {
            console.log(`  ${row.group_type}: ${row.count}`);
        }
        
        // 5. Show some examples of each type
        console.log('\n📋 Sample Monitored Companies:');
        const sampleMonitored = await db.all(`
            SELECT canonical_name 
            FROM intelligence.entity_groups 
            WHERE group_type = 'monitored_company'
            LIMIT 5
        `);
        for (const company of sampleMonitored) {
            console.log(`  - ${company.canonical_name}`);
        }
        
        console.log('\n📋 Sample Mentioned Companies:');
        const sampleMentioned = await db.all(`
            SELECT canonical_name 
            FROM intelligence.entity_groups 
            WHERE group_type = 'mentioned_company'
            LIMIT 5
        `);
        for (const company of sampleMentioned) {
            console.log(`  - ${company.canonical_name}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    fixCompanyClassification()
        .then(() => {
            console.log('\n✅ Company classification fixed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = { fixCompanyClassification };
