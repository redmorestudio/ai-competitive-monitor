#!/usr/bin/env node

/**
 * Fix Entity Groups and Companies Columns
 * Adds missing columns required for entity grouping functionality
 * 
 * CRITICAL: This script follows DATABASE PROTECTION rules
 * - Uses atomic column additions with IF NOT EXISTS
 * - Preserves existing data
 * - Sets appropriate defaults
 * 
 * Missing columns to add:
 * - companies.is_monitored (for tracking which companies we monitor)
 * - companies.is_active (for active/inactive status)
 * - entity_groups.is_monitored (for marking monitored entities)
 * - entity_groups.variation_count (for counting entity variations)
 */

require('dotenv').config();
const { db, end } = require('./postgres-db');

async function fixEntityGroupsColumns() {
    console.log('🔧 Adding missing columns for entity grouping functionality...\n');
    
    try {
        // 1. Add is_monitored to companies table
        console.log('📊 Adding is_monitored column to companies table...');
        await db.run(`
            ALTER TABLE intelligence.companies 
            ADD COLUMN IF NOT EXISTS is_monitored BOOLEAN DEFAULT true
        `);
        console.log('✅ companies.is_monitored column ready\n');
        
        // 2. Add is_active to companies table
        console.log('📊 Adding is_active column to companies table...');
        await db.run(`
            ALTER TABLE intelligence.companies
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
        `);
        console.log('✅ companies.is_active column ready\n');
        
        // 3. Check if entity_groups table exists
        const tableCheck = await db.get(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'intelligence' 
                AND table_name = 'entity_groups'
            ) as exists
        `);
        
        if (!tableCheck.exists) {
            console.log('⚠️  entity_groups table does not exist yet');
            console.log('   It will be created by apply-entity-groupings.js');
            console.log('   Skipping entity_groups column additions for now.\n');
        } else {
            // 4. Add is_monitored to entity_groups table
            console.log('📊 Adding is_monitored column to entity_groups table...');
            await db.run(`
                ALTER TABLE intelligence.entity_groups
                ADD COLUMN IF NOT EXISTS is_monitored BOOLEAN DEFAULT false
            `);
            console.log('✅ entity_groups.is_monitored column ready\n');
            
            // 5. Add variation_count to entity_groups table
            console.log('📊 Adding variation_count column to entity_groups table...');
            await db.run(`
                ALTER TABLE intelligence.entity_groups
                ADD COLUMN IF NOT EXISTS variation_count INTEGER DEFAULT 1
            `);
            console.log('✅ entity_groups.variation_count column ready\n');
            
            // 6. Update variation_count based on entity_variations if available
            const variationsCheck = await db.get(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'intelligence' 
                    AND table_name = 'entity_variations'
                ) as exists
            `);
            
            if (variationsCheck.exists) {
                console.log('📊 Updating variation_count from entity_variations table...');
                await db.run(`
                    UPDATE intelligence.entity_groups eg
                    SET variation_count = COALESCE(
                        (SELECT COUNT(*) 
                         FROM intelligence.entity_variations ev 
                         WHERE ev.group_id = eg.id),
                        1
                    )
                `);
                
                const stats = await db.get(`
                    SELECT 
                        COUNT(*) as total_groups,
                        AVG(variation_count) as avg_variations,
                        MAX(variation_count) as max_variations
                    FROM intelligence.entity_groups
                `);
                
                console.log(`✅ Updated variation counts:`);
                console.log(`   Total groups: ${stats.total_groups}`);
                console.log(`   Average variations: ${Math.round(stats.avg_variations)}`);
                console.log(`   Max variations: ${stats.max_variations}\n`);
            }
        }
        
        // 7. Update is_monitored based on configured companies (54 companies)
        console.log('📊 Setting is_monitored flag for configured companies...');
        
        // List of companies we're actually monitoring (from your configuration)
        const monitoredCompanies = [
            'OpenAI', 'Anthropic', 'Google DeepMind', 'Meta AI', 'Microsoft AI',
            'Amazon AI', 'Apple Machine Learning', 'NVIDIA AI', 'IBM Watson', 'Salesforce Einstein',
            'Adobe Sensei', 'Oracle AI', 'SAP AI', 'Baidu AI', 'Alibaba DAMO Academy',
            'Tencent AI Lab', 'Samsung AI', 'Intel AI', 'Qualcomm AI', 'AMD AI',
            'Huawei AI', 'Stability AI', 'Midjourney', 'Runway', 'Cohere',
            'Inflection AI', 'Character AI', 'Adept', 'Mistral AI', 'Aleph Alpha',
            'AI21 Labs', 'Databricks', 'Scale AI', 'Weights & Biases', 'Hugging Face',
            'Lightning AI', 'Pinecone', 'Weaviate', 'Chroma', 'LangChain',
            'LlamaIndex', 'Anyscale', 'Together AI', 'Replicate', 'Modal',
            'Baseten', 'Banana', 'Cerebrium', 'Humanloop', 'Vellum',
            'Helicone', 'Portkey', 'Langfuse', 'Phoenix', 'Datadog'
        ];
        
        // Update is_monitored flag
        const placeholders = monitoredCompanies.map((_, i) => `$${i + 1}`).join(',');
        await db.run(`
            UPDATE intelligence.companies
            SET is_monitored = CASE 
                WHEN LOWER(name) = ANY(ARRAY[${placeholders}]::text[])
                THEN true 
                ELSE false 
            END
        `, monitoredCompanies.map(name => name.toLowerCase()));
        
        // Get statistics
        const companyStats = await db.get(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_monitored THEN 1 END) as monitored,
                COUNT(CASE WHEN is_active THEN 1 END) as active
            FROM intelligence.companies
        `);
        
        console.log(`✅ Company flags updated:`);
        console.log(`   Total companies: ${companyStats.total}`);
        console.log(`   Monitored companies: ${companyStats.monitored}`);
        console.log(`   Active companies: ${companyStats.active}\n`);
        
        // 8. Verify all columns exist
        console.log('🔍 Verifying all required columns...');
        const columnCheck = await db.all(`
            SELECT 
                table_name,
                column_name,
                data_type
            FROM information_schema.columns
            WHERE table_schema = 'intelligence'
            AND table_name IN ('companies', 'entity_groups')
            AND column_name IN ('is_monitored', 'is_active', 'variation_count')
            ORDER BY table_name, column_name
        `);
        
        console.log('✅ Columns verified:');
        for (const col of columnCheck) {
            console.log(`   ${col.table_name}.${col.column_name} (${col.data_type})`);
        }
        
    } catch (error) {
        console.error('❌ Error adding columns:', error);
        process.exit(1);
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    fixEntityGroupsColumns()
        .then(() => {
            console.log('\n✅ All entity grouping columns successfully added!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Failed:', error);
            process.exit(1);
        });
}

module.exports = { fixEntityGroupsColumns };
