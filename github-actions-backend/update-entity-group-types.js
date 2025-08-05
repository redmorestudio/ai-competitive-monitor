#!/usr/bin/env node

/**
 * Update Entity Group Types
 * This script updates the group_type field in entity_groups table
 * based on the entity type detection logic
 */

require('dotenv').config();
const { db, end } = require('./postgres-db');

// Import type detection logic
const { detectEntityType } = require('./entity-type-handler');

async function updateEntityGroupTypes() {
    console.log('Updating entity group types...\n');
    
    try {
        // Get all entity groups without a type
        const untypedGroups = await db.all(`
            SELECT id, canonical_name
            FROM intelligence.entity_groups
            WHERE group_type IS NULL OR group_type = ''
        `);
        
        console.log(`Found ${untypedGroups.length} untyped entity groups\n`);
        
        let updated = 0;
        const typeCount = {};
        
        for (const group of untypedGroups) {
            const detectedType = detectEntityType(group.canonical_name);
            
            if (detectedType && detectedType !== 'unknown') {
                await db.run(`
                    UPDATE intelligence.entity_groups
                    SET group_type = $1, updated_at = NOW()
                    WHERE id = $2
                `, [detectedType, group.id]);
                
                typeCount[detectedType] = (typeCount[detectedType] || 0) + 1;
                updated++;
                
                if (updated % 100 === 0) {
                    console.log(`Updated ${updated} entities...`);
                }
            }
        }
        
        console.log(`\n✅ Updated ${updated} entity groups with types:`);
        for (const [type, count] of Object.entries(typeCount)) {
            console.log(`   ${type}: ${count}`);
        }
        
        // Also update types based on the baseline analysis data
        console.log('\nUpdating types from baseline analysis data...');
        
        const typeMapping = {
            'companies': 'company',
            'products': 'product',
            'people': 'person',
            'organizations': 'organization',
            'technologies': 'technology',
            'ai_ml_concepts': 'concept',
            'methodologies': 'methodology',
            'capabilities': 'capability',
            'concepts': 'concept',
            'standards': 'standard'
        };
        
        for (const [jsonKey, groupType] of Object.entries(typeMapping)) {
            const result = await db.run(`
                UPDATE intelligence.entity_groups eg
                SET group_type = $1, updated_at = NOW()
                WHERE group_type IS NULL
                AND EXISTS (
                    SELECT 1 
                    FROM intelligence.baseline_analysis ba
                    WHERE ba.entities ? $2
                    AND ba.entities->$2 @> to_jsonb(ARRAY[eg.canonical_name])
                )
            `, [groupType, jsonKey]);
            
            console.log(`   Set ${result.changes || 0} entities as ${groupType} from ${jsonKey}`);
        }
        
        // Get final statistics
        const stats = await db.all(`
            SELECT 
                group_type,
                COUNT(*) as count
            FROM intelligence.entity_groups
            GROUP BY group_type
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Final Entity Type Distribution:');
        let total = 0;
        for (const stat of stats) {
            console.log(`   ${stat.group_type || 'untyped'}: ${stat.count}`);
            total += parseInt(stat.count);
        }
        console.log(`   Total: ${total}`);
        
    } catch (error) {
        console.error('Error updating entity types:', error);
        throw error;
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    updateEntityGroupTypes().catch(console.error);
}

module.exports = { updateEntityGroupTypes };
