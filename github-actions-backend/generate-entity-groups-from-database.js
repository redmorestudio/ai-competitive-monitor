#!/usr/bin/env node

/**
 * Generate Entity Groups from PostgreSQL Database
 * Creates entity-groups.json with proper categorization from database
 * 
 * This replaces the fallback generator with real database data
 */

require('dotenv').config();
const { db, end } = require('./postgres-db');
const fs = require('fs').promises;
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'api-data', 'entity-groups.json');

async function generateEntityGroups() {
    console.log('🔄 Generating entity groups from PostgreSQL database...\n');
    
    try {
        // First check if entity_groups table exists and has data
        const tableCheck = await db.get(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'intelligence' 
            AND table_name = 'entity_groups'
        `);
        
        if (!tableCheck || tableCheck.count === 0) {
            console.log('❌ entity_groups table does not exist!');
            console.log('   Run apply-entity-groupings.js first to create and populate the table.');
            process.exit(1);
        }

        // Check if entity_groups has data
        const groupCount = await db.get(`
            SELECT COUNT(*) as count FROM intelligence.entity_groups
        `);
        
        if (!groupCount || groupCount.count === 0) {
            console.log('⚠️ entity_groups table is empty, falling back to raw entities...');
            return await generateFromRawEntities();
        }

        console.log(`📊 Found ${groupCount.count} entity groups in database\n`);

        // 1. Get all entity groups from database with proper joins
        const entityGroups = await db.all(`
            WITH entity_mentions AS (
                SELECT 
                    eg.id,
                    COUNT(DISTINCT c.id) as company_mentions
                FROM intelligence.entity_groups eg
                LEFT JOIN intelligence.baseline_analysis ba 
                    ON ba.entities::text ILIKE '%' || eg.canonical_name || '%'
                LEFT JOIN intelligence.companies c 
                    ON ba.company_id = c.id
                GROUP BY eg.id
            )
            SELECT 
                eg.id,
                eg.canonical_name as name,
                COALESCE(eg.group_type, 'unknown') as type,
                COALESCE(eg.variation_count, 1) as variation_count,
                COALESCE(em.company_mentions, 0) as mentioned_by_count,
                COALESCE(eg.is_monitored, false) as is_monitored,
                eg.first_seen,
                eg.last_seen
            FROM intelligence.entity_groups eg
            LEFT JOIN entity_mentions em ON eg.id = em.id
            ORDER BY em.company_mentions DESC NULLS LAST, eg.canonical_name
        `);

        // 2. Get monitored companies count
        const companyStats = await db.get(`
            SELECT 
                COUNT(DISTINCT c.id) as total_companies,
                COUNT(DISTINCT CASE WHEN c.is_active THEN c.id END) as active_companies
            FROM intelligence.companies c
        `);

        // 3. Categorize entities by type
        const byType = {
            companies: [],
            products: [],
            technologies: [],
            concepts: [],
            people: [],
            other: []
        };

        // Process and categorize
        const allEntities = entityGroups.map((eg, index) => {
            const entity = {
                id: eg.id || index + 1,
                name: eg.name,
                type: eg.type || 'unknown',
                variations: eg.variation_count || 1,
                mentioned_by: eg.mentioned_by_count || 0,
                is_monitored: eg.is_monitored || false
            };

            // Add to category based on type
            const typeMap = {
                'company': 'companies',
                'product': 'products',
                'technology': 'technologies',
                'tech': 'technologies',
                'concept': 'concepts',
                'person': 'people',
                'people': 'people'
            };

            const categoryKey = typeMap[entity.type.toLowerCase()] || 'other';
            byType[categoryKey].push(entity.name);

            return entity;
        });

        // 4. Smart filtering for 3D graph
        const graphEntities = allEntities.filter(entity => {
            // Always include monitored companies
            if (entity.is_monitored) return true;
            
            // Include frequently mentioned entities
            if (entity.mentioned_by >= 3) return true;
            
            // Always include key entity types
            if (['technology', 'tech', 'concept'].includes(entity.type.toLowerCase())) return true;
            
            // Include top companies if we don't have too many
            if (entity.type === 'company' && byType.companies.length < 100) return true;
            
            // Include entities with multiple variations (likely important)
            if (entity.variations > 2) return true;
            
            return false;
        });

        // 5. Generate the output structure
        const entityGroupsData = {
            metadata: {
                generated_at: new Date().toISOString(),
                version: "2.0",
                source: "database",
                total_raw_entities: entityGroups.reduce((sum, eg) => sum + (eg.variation_count || 1), 0),
                total_groups: allEntities.length,
                filtered_for_graph: graphEntities.length,
                monitored_companies: companyStats.active_companies || companyStats.total_companies,
                total_companies: companyStats.total_companies
            },
            all_entities: allEntities,
            graph_entities: graphEntities,
            by_type: byType,
            stats: {
                by_category: {
                    companies: byType.companies.length,
                    products: byType.products.length,
                    technologies: byType.technologies.length,
                    concepts: byType.concepts.length,
                    people: byType.people.length,
                    other: byType.other.length
                },
                highly_mentioned: allEntities.filter(e => e.mentioned_by >= 5).length,
                monitored: allEntities.filter(e => e.is_monitored).length
            }
        };

        // 6. Write to file
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(
            OUTPUT_FILE, 
            JSON.stringify(entityGroupsData, null, 2)
        );

        console.log('✅ Entity groups generated successfully from database!');
        console.log(`📊 Statistics:`);
        console.log(`   - Total entity groups: ${allEntities.length}`);
        console.log(`   - Companies: ${byType.companies.length}`);
        console.log(`   - Products: ${byType.products.length}`);
        console.log(`   - Technologies: ${byType.technologies.length}`);
        console.log(`   - Concepts: ${byType.concepts.length}`);
        console.log(`   - People: ${byType.people.length}`);
        console.log(`   - Other: ${byType.other.length}`);
        console.log(`   - Filtered for graph: ${graphEntities.length}`);
        console.log(`   - Monitored companies: ${companyStats.active_companies || companyStats.total_companies}`);
        console.log(`📁 Output: ${OUTPUT_FILE}`);

        return entityGroupsData;

    } catch (error) {
        console.error('❌ Error generating entity groups:', error);
        
        // Try fallback if database query fails
        if (error.message.includes('entity_groups') || error.message.includes('column')) {
            console.log('\n⚠️ Entity groups table issue detected, trying fallback...');
            return await generateFromRawEntities();
        }
        
        throw error;
    }
}

// Fallback function to generate from raw entities if entity_groups doesn't exist
async function generateFromRawEntities() {
    console.log('📊 Generating entity groups from raw entities (fallback mode)...\n');
    
    try {
        // Get raw entities from baseline_analysis
        const rawEntities = await db.all(`
            SELECT DISTINCT
                unnest(string_to_array(
                    regexp_replace(entities::text, '[\\[\\]"]', '', 'g'), 
                    ','
                )) as entity_name,
                company_id
            FROM intelligence.baseline_analysis
            WHERE entities IS NOT NULL
        `);

        // Group and count
        const entityMap = new Map();
        
        for (const row of rawEntities) {
            const name = row.entity_name?.trim();
            if (!name) continue;
            
            if (!entityMap.has(name)) {
                entityMap.set(name, {
                    name: name,
                    companies: new Set(),
                    count: 0
                });
            }
            
            const entity = entityMap.get(name);
            if (row.company_id) {
                entity.companies.add(row.company_id);
            }
            entity.count++;
        }

        // Get company info
        const companies = await db.all(`
            SELECT id, name, is_active 
            FROM intelligence.companies
        `);
        
        const companyMap = new Map(companies.map(c => [c.id, c]));
        const activeCompanies = companies.filter(c => c.is_active).length;

        // Convert to array and categorize
        const allEntities = Array.from(entityMap.values()).map((entity, index) => {
            // Simple type detection
            let type = 'unknown';
            const lowerName = entity.name.toLowerCase();
            
            // Check if it's a known company
            const isCompany = companies.some(c => 
                c.name.toLowerCase() === lowerName ||
                c.name.toLowerCase().includes(lowerName) ||
                lowerName.includes(c.name.toLowerCase())
            );
            
            if (isCompany) {
                type = 'company';
            } else if (lowerName.includes('api') || lowerName.includes('sdk') || 
                      lowerName.includes('gpt') || lowerName.includes('llm')) {
                type = 'technology';
            } else if (lowerName.includes('ai') || lowerName.includes('ml') || 
                      lowerName.includes('learning') || lowerName.includes('model')) {
                type = 'concept';
            } else if (entity.companies.size === 1) {
                // Likely a product if mentioned by only one company
                type = 'product';
            }

            return {
                id: index + 1,
                name: entity.name,
                type: type,
                variations: 1,
                mentioned_by: entity.companies.size,
                is_monitored: isCompany && companies.find(c => 
                    c.name.toLowerCase() === lowerName)?.is_active || false
            };
        });

        // Sort by mention count
        allEntities.sort((a, b) => b.mentioned_by - a.mentioned_by);

        // Categorize
        const byType = {
            companies: [],
            products: [],
            technologies: [],
            concepts: [],
            people: [],
            other: []
        };

        allEntities.forEach(entity => {
            switch(entity.type) {
                case 'company':
                    byType.companies.push(entity.name);
                    break;
                case 'product':
                    byType.products.push(entity.name);
                    break;
                case 'technology':
                    byType.technologies.push(entity.name);
                    break;
                case 'concept':
                    byType.concepts.push(entity.name);
                    break;
                default:
                    byType.other.push(entity.name);
            }
        });

        // Filter for graph
        const graphEntities = allEntities.filter(entity => 
            entity.is_monitored ||
            entity.mentioned_by >= 2 ||
            entity.type === 'technology' ||
            entity.type === 'concept'
        );

        // Generate output
        const entityGroupsData = {
            metadata: {
                generated_at: new Date().toISOString(),
                version: "1.5",
                source: "raw-entities-fallback",
                total_raw_entities: allEntities.length,
                total_groups: allEntities.length,
                filtered_for_graph: graphEntities.length,
                monitored_companies: activeCompanies
            },
            all_entities: allEntities,
            graph_entities: graphEntities,
            by_type: byType
        };

        // Write to file
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(
            OUTPUT_FILE, 
            JSON.stringify(entityGroupsData, null, 2)
        );

        console.log('✅ Entity groups generated from raw entities (fallback)');
        console.log(`📊 Found ${allEntities.length} unique entities`);
        console.log(`📁 Output: ${OUTPUT_FILE}`);

        return entityGroupsData;

    } catch (error) {
        console.error('❌ Fallback generation also failed:', error);
        throw error;
    }
}

// Cleanup function
async function cleanup() {
    try {
        await end();
    } catch (error) {
        console.error('Error closing database connection:', error);
    }
}

// Run if called directly
if (require.main === module) {
    generateEntityGroups()
        .then(() => cleanup())
        .catch((error) => {
            console.error('Fatal error:', error);
            cleanup().then(() => process.exit(1));
        });
}

module.exports = { generateEntityGroups };
