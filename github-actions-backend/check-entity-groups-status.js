#!/usr/bin/env node

require('dotenv').config();
const { db, end } = require('./postgres-db');

async function checkEntityGroupsStatus() {
    try {
        console.log('Checking entity groups status...\n');
        
        // Check if entity_groups table exists
        const tableExists = await db.get(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'intelligence' 
                AND table_name = 'entity_groups'
            ) as exists
        `);
        
        if (!tableExists.exists) {
            console.log('❌ Entity groups table does not exist!');
            console.log('Run: node apply-entity-groupings.js first');
            return;
        }
        
        // Get statistics
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT eg.id) as total_groups,
                COUNT(DISTINCT ev.variation) as total_variations,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'company' THEN eg.id END) as company_groups,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'product' THEN eg.id END) as product_groups,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'technology' THEN eg.id END) as tech_groups,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'concept' THEN eg.id END) as concept_groups,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'person' THEN eg.id END) as person_groups
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
        `);
        
        console.log('📊 Entity Groups Statistics:');
        console.log(`Total groups: ${stats.total_groups}`);
        console.log(`Total variations: ${stats.total_variations}`);
        console.log(`\nBreakdown by type:`);
        console.log(`  Companies: ${stats.company_groups}`);
        console.log(`  Products: ${stats.product_groups}`);
        console.log(`  Technologies: ${stats.tech_groups}`);
        console.log(`  Concepts: ${stats.concept_groups}`);
        console.log(`  People: ${stats.person_groups}`);
        
        // Get sample groups
        console.log('\n📋 Sample Entity Groups:');
        const samples = await db.all(`
            SELECT 
                eg.canonical_name,
                eg.group_type,
                array_agg(DISTINCT ev.variation) as variations
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
            GROUP BY eg.id, eg.canonical_name, eg.group_type
            ORDER BY COUNT(ev.id) DESC
            LIMIT 10
        `);
        
        for (const sample of samples) {
            console.log(`\n${sample.canonical_name} (${sample.group_type || 'untyped'})`);
            if (sample.variations && sample.variations.length > 0) {
                console.log(`  Variations: ${sample.variations.slice(0, 5).join(', ')}${sample.variations.length > 5 ? '...' : ''}`);
            }
        }
        
        // Check for untyped groups
        const untypedCount = await db.get(`
            SELECT COUNT(*) as count
            FROM intelligence.entity_groups
            WHERE group_type IS NULL
        `);
        
        if (untypedCount.count > 0) {
            console.log(`\n⚠️  Warning: ${untypedCount.count} groups have no type assigned`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await end();
    }
}

checkEntityGroupsStatus();
