#!/usr/bin/env node

/**
 * Generate Entity Groups JSON for Dashboard
 * Creates the entity-groups.json file that the dashboard expects
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function generateEntityGroupsJson() {
    console.log('🚀 Generating entity groups JSON for dashboard...\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }  // Always use SSL for Heroku Postgres
    });
    
    try {
        // Get all entity groups
        const allGroupsQuery = `
            SELECT 
                eg.id,
                eg.canonical_name as name,
                eg.group_type as type,
                eg.description,
                eg.is_monitored,
                eg.mentioned_by_count as mentioned_by,
                0 as relationship_count,  -- Column doesn't exist yet
                eg.significance_score,
                eg.created_at as first_seen,
                eg.updated_at as last_seen,
                CASE WHEN eg.created_at > CURRENT_DATE - INTERVAL '7 days' THEN true ELSE false END as is_new
            FROM intelligence.entity_groups eg
            ORDER BY 
                eg.is_monitored DESC,
                eg.mentioned_by_count DESC,
                eg.canonical_name
        `;
        
        const allGroupsResult = await pool.query(allGroupsQuery);
        const allEntities = allGroupsResult.rows;
        
        console.log(`✅ Found ${allEntities.length} total entity groups`);
        
        // Get filtered entities for graph view (key entities only)
        const graphGroupsQuery = `
            SELECT 
                eg.id,
                eg.canonical_name as name,
                eg.group_type as type,
                eg.description,
                eg.is_monitored,
                eg.mentioned_by_count as mentioned_by,
                0 as relationship_count,
                eg.significance_score,
                eg.created_at as first_seen,
                eg.updated_at as last_seen,
                CASE WHEN eg.created_at > CURRENT_DATE - INTERVAL '7 days' THEN true ELSE false END as is_new
            FROM intelligence.entity_groups eg
            WHERE 
                eg.is_monitored = true  -- Your configured companies
                OR eg.mentioned_by_count >= 3  -- Mentioned by 3+ sources
                OR eg.significance_score > 0  -- Has significance
                OR eg.group_type IN ('company', 'product', 'technology', 'concept')  -- Key types
            ORDER BY 
                eg.is_monitored DESC,
                eg.mentioned_by_count DESC,
                eg.canonical_name
        `;
        
        const graphGroupsResult = await pool.query(graphGroupsQuery);
        const graphEntities = graphGroupsResult.rows;
        
        console.log(`✅ Found ${graphEntities.length} key entities for graph view`);
        
        // Get entity counts by type
        const byTypeQuery = `
            SELECT 
                group_type as type,
                COUNT(*) as count
            FROM intelligence.entity_groups
            GROUP BY group_type
            ORDER BY count DESC
        `;
        
        const byTypeResult = await pool.query(byTypeQuery);
        const typeCounts = {};
        byTypeResult.rows.forEach(row => {
            typeCounts[row.type] = parseInt(row.count);
        });
        
        // Get monitored companies
        const monitoredQuery = `
            SELECT canonical_name as name
            FROM intelligence.entity_groups
            WHERE is_monitored = true
            ORDER BY canonical_name
        `;
        
        const monitoredResult = await pool.query(monitoredQuery);
        const monitoredCompanies = monitoredResult.rows.map(r => r.name);
        
        // Create the output structure
        const output = {
            metadata: {
                generated_at: new Date().toISOString(),
                version: '1.0',
                total_raw_entities: 3260,  // From the original count
                total_groups: allEntities.length,
                filtered_for_graph: graphEntities.length,
                monitored_companies: monitoredCompanies.length
            },
            
            // All entities for detail view
            all_entities: allEntities,
            
            // Filtered entities for graph view
            graph_entities: graphEntities,
            
            // Counts by type
            by_type: typeCounts,
            
            // List of monitored companies
            monitored_companies: monitoredCompanies,
            
            // Statistics
            statistics: {
                new_entities_count: allEntities.filter(e => e.is_new).length,
                high_significance_count: allEntities.filter(e => e.significance_score > 5).length,
                frequently_mentioned_count: allEntities.filter(e => e.mentioned_by >= 5).length,
                types: Object.keys(typeCounts).sort()
            }
        };
        
        // Write to file
        const outputPath = path.join(__dirname, '..', 'api-data', 'entity-groups.json');
        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
        
        console.log(`\n✅ Generated entity-groups.json`);
        console.log(`   - Total groups: ${output.metadata.total_groups}`);
        console.log(`   - Graph entities: ${output.metadata.filtered_for_graph}`);
        console.log(`   - File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
        
        // Also generate a summary for quick reference
        const summaryPath = path.join(__dirname, '..', 'api-data', 'entity-groups-summary.json');
        const summary = {
            generated_at: output.metadata.generated_at,
            total_groups: output.metadata.total_groups,
            filtered_for_graph: output.metadata.filtered_for_graph,
            by_type: typeCounts,
            new_entities: output.statistics.new_entities_count,
            top_entities: graphEntities.slice(0, 20).map(e => ({
                name: e.name,
                type: e.type,
                mentioned_by: e.mentioned_by
            }))
        };
        
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
        console.log(`✅ Generated entity-groups-summary.json`);
        
    } catch (error) {
        console.error('❌ Error generating entity groups JSON:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    generateEntityGroupsJson()
        .then(() => {
            console.log('\n✅ Entity groups JSON generation complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Failed:', error.message);
            process.exit(1);
        });
}

module.exports = { generateEntityGroupsJson };
