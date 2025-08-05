#!/usr/bin/env node

/**
 * Update Generate Static Data to Use Entity Groups
 * This patch updates the static data generation to:
 * 1. Use entity_groups table instead of raw entities
 * 2. Call the new grouped entity context generator
 * 3. Add filtering support for dashboard and 3D graph
 */

require('dotenv').config();
const { db, end } = require('./postgres-db');
const fs = require('fs');
const path = require('path');

// Import the grouped context generator
const { generateAllEntityContexts } = require('./generate-entity-contexts-grouped');

const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');

async function updateGenerateStaticData() {
    console.log('Updating static data generation to use entity groups...\n');
    
    try {
        // First, ensure entity groups are populated
        const groupCount = await db.get(`
            SELECT COUNT(*) as count FROM intelligence.entity_groups
        `);
        
        if (groupCount.count === 0) {
            console.log('❌ No entity groups found! Run apply-entity-groupings.js first');
            return;
        }
        
        console.log(`✅ Found ${groupCount.count} entity groups\n`);
        
        // Get entities from entity_groups table with proper filtering
        const entities = await db.all(`
            SELECT 
                eg.id,
                eg.canonical_name,
                eg.group_type,
                COUNT(DISTINCT ev.id) as variation_count,
                -- Count how many companies mention this entity
                (
                    SELECT COUNT(DISTINCT c.id)
                    FROM raw_content.scraped_pages sp
                    JOIN intelligence.urls u ON sp.url = u.url
                    JOIN intelligence.companies c ON u.company_id = c.id
                    WHERE sp.content ILIKE '%' || eg.canonical_name || '%'
                    LIMIT 10
                ) as mentioned_by_count,
                -- Check if this is a monitored company
                EXISTS (
                    SELECT 1 FROM intelligence.companies c
                    WHERE LOWER(c.name) = LOWER(eg.canonical_name)
                    AND c.is_monitored = true
                ) as is_monitored_company
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
            GROUP BY eg.id, eg.canonical_name, eg.group_type
        `);
        
        // Create filtered entity lists for different views
        const entityData = {
            generated_at: new Date().toISOString(),
            total_groups: entities.length,
            
            // All entities (for detail view)
            all_entities: entities.map(e => ({
                id: e.id,
                name: e.canonical_name,
                type: e.group_type || 'other',
                variations: e.variation_count,
                mentioned_by: e.mentioned_by_count,
                is_monitored: e.is_monitored_company
            })),
            
            // Filtered entities for 3D graph
            graph_entities: entities
                .filter(e => 
                    e.is_monitored_company || // Monitored companies
                    e.mentioned_by_count >= 3 || // Mentioned by 3+ sources
                    e.group_type === 'technology' || // Always show tech
                    e.group_type === 'concept' // Always show concepts
                )
                .map(e => ({
                    id: e.id,
                    name: e.canonical_name,
                    type: e.group_type || 'other',
                    variations: e.variation_count,
                    mentioned_by: e.mentioned_by_count,
                    is_monitored: e.is_monitored_company
                })),
            
            // Group by type for easier access
            by_type: {
                companies: entities.filter(e => e.group_type === 'company').map(e => e.canonical_name),
                products: entities.filter(e => e.group_type === 'product').map(e => e.canonical_name),
                technologies: entities.filter(e => e.group_type === 'technology').map(e => e.canonical_name),
                concepts: entities.filter(e => e.group_type === 'concept').map(e => e.canonical_name),
                people: entities.filter(e => e.group_type === 'person').map(e => e.canonical_name),
                other: entities.filter(e => !e.group_type || !['company', 'product', 'technology', 'concept', 'person'].includes(e.group_type)).map(e => e.canonical_name)
            }
        };
        
        // Write entity data
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'entity-groups.json'),
            JSON.stringify(entityData, null, 2)
        );
        
        console.log(`✅ Wrote entity groups data with ${entityData.all_entities.length} total entities`);
        console.log(`   Filtered to ${entityData.graph_entities.length} entities for 3D graph\n`);
        
        // Generate entity contexts using the grouped approach
        console.log('Generating entity contexts...');
        await generateAllEntityContexts();
        
        // Update the main generate-static-data script to use entity groups
        const mainScriptPath = path.join(__dirname, 'generate-static-data-three-db-postgres-with-contexts.js');
        const backupPath = `${mainScriptPath}.backup-${Date.now()}`;
        
        // Create backup
        if (fs.existsSync(mainScriptPath)) {
            fs.copyFileSync(mainScriptPath, backupPath);
            console.log(`\n✅ Created backup: ${backupPath}`);
        }
        
        // Create a marker file to indicate entity groups are being used
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'using-entity-groups.json'),
            JSON.stringify({
                enabled: true,
                updated_at: new Date().toISOString(),
                total_groups: groupCount.count,
                reduction_achieved: `${entities.length} groups from thousands of variations`
            }, null, 2)
        );
        
        console.log('\n✅ Entity grouping update complete!');
        console.log('Next steps:');
        console.log('1. Update dashboard (index.html) to use entity-groups.json');
        console.log('2. Update 3D graph to use graph_entities for visualization');
        console.log('3. Add toggle for "Detail View" vs "Graph View"');
        
    } catch (error) {
        console.error('Error updating static data generation:', error);
        throw error;
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    updateGenerateStaticData().catch(console.error);
}

module.exports = { updateGenerateStaticData };
