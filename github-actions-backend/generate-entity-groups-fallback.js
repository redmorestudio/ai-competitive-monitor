#!/usr/bin/env node

/**
 * Fallback Entity Groups Generator
 * Generates entity-groups.json from existing API data if database approach fails
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');

async function generateEntityGroupsFallback() {
    try {
        console.log('🔄 Running fallback entity groups generation...\n');
        
        // Check if entity-groups.json already exists
        const entityGroupsPath = path.join(OUTPUT_DIR, 'entity-groups.json');
        if (fs.existsSync(entityGroupsPath)) {
            console.log('✅ entity-groups.json already exists');
            return;
        }
        
        console.log('📊 Generating entity-groups.json from existing data sources...');
        
        // Read existing data files
        const dashboardPath = path.join(OUTPUT_DIR, 'dashboard.json');
        const companiesPath = path.join(OUTPUT_DIR, 'companies.json');
        
        let entities = [];
        
        // Extract from dashboard.json if it exists
        if (fs.existsSync(dashboardPath)) {
            const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
            console.log('📖 Loading entities from dashboard.json...');
            
            // Extract entities from various sections
            if (dashboard.companies) {
                entities.push(...dashboard.companies.map(c => ({
                    name: c.name,
                    type: 'company',
                    is_monitored: c.is_monitored || false,
                    mentioned_by: c.mentioned_by || 0
                })));
            }
            
            if (dashboard.technologies) {
                entities.push(...dashboard.technologies.slice(0, 100).map(t => ({
                    name: t,
                    type: 'technology',
                    is_monitored: false,
                    mentioned_by: 1
                })));
            }
            
            if (dashboard.products) {
                entities.push(...dashboard.products.slice(0, 100).map(p => ({
                    name: p,
                    type: 'product', 
                    is_monitored: false,
                    mentioned_by: 1
                })));
            }
        }
        
        // Extract from companies.json if it exists
        if (fs.existsSync(companiesPath)) {
            const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
            console.log('📖 Loading companies from companies.json...');
            
            if (Array.isArray(companies)) {
                entities.push(...companies.map(c => ({
                    name: c.name,
                    type: 'company',
                    is_monitored: c.is_monitored || false,
                    mentioned_by: c.mentioned_by || 0
                })));
            }
        }
        
        // Remove duplicates and assign IDs
        const uniqueEntities = [];
        const seen = new Set();
        
        entities.forEach((entity, index) => {
            const key = `${entity.name.toLowerCase()}-${entity.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEntities.push({
                    id: index + 1,
                    name: entity.name,
                    type: entity.type,
                    variations: 1,
                    mentioned_by: entity.mentioned_by,
                    is_monitored: entity.is_monitored
                });
            }
        });
        
        // Create filtered data for graph (important entities only)
        const graphEntities = uniqueEntities.filter(e => 
            e.is_monitored || 
            e.mentioned_by >= 1 || 
            e.type === 'technology' ||
            e.type === 'concept' ||
            e.type === 'company' // Include all companies for now
        );
        
        // Generate entity groups data structure
        const entityGroupsData = {
            metadata: {
                generated_at: new Date().toISOString(),
                version: "1.0",
                source: "fallback-generation",
                total_raw_entities: entities.length,
                total_groups: uniqueEntities.length,
                filtered_for_graph: graphEntities.length,
                monitored_companies: uniqueEntities.filter(e => e.is_monitored).length
            },
            
            // All entities (for detail view)
            all_entities: uniqueEntities,
            
            // Filtered entities for 3D graph
            graph_entities: graphEntities,
            
            // Group by type for easier access
            by_type: {
                companies: uniqueEntities.filter(e => e.type === 'company').map(e => e.name),
                products: uniqueEntities.filter(e => e.type === 'product').map(e => e.name),
                technologies: uniqueEntities.filter(e => e.type === 'technology').map(e => e.name),
                concepts: uniqueEntities.filter(e => e.type === 'concept').map(e => e.name),
                people: uniqueEntities.filter(e => e.type === 'person').map(e => e.name),
                other: uniqueEntities.filter(e => !['company', 'product', 'technology', 'concept', 'person'].includes(e.type)).map(e => e.name)
            }
        };
        
        // Write the file
        fs.writeFileSync(entityGroupsPath, JSON.stringify(entityGroupsData, null, 2));
        
        console.log(`✅ Generated fallback entity-groups.json with ${uniqueEntities.length} entities`);
        console.log(`   Filtered to ${graphEntities.length} entities for 3D graph`);
        console.log(`   Monitored companies: ${entityGroupsData.metadata.monitored_companies}`);
        
        return entityGroupsData;
        
    } catch (error) {
        console.error('Error generating fallback entity groups:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    generateEntityGroupsFallback()
        .then(() => {
            console.log('\n✅ Fallback entity groups generation complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Fallback generation failed:', error);
            process.exit(1);
        });
}

module.exports = { generateEntityGroupsFallback };
