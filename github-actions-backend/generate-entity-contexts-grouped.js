#!/usr/bin/env node

/**
 * Generate Entity Contexts Using Grouped Entities
 * This script generates contexts ONLY for canonical entities from entity_groups table
 * instead of processing all 3,260 raw entity variations
 */

require('dotenv').config();

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');
const CONTEXT_DIR = path.join(OUTPUT_DIR, 'contexts');
const CONTEXT_WORDS = 15; // Words before/after entity mention
const MAX_CONTEXTS_PER_ENTITY = 50; // Max contexts to store per entity

// Ensure directories exist
if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
}

/**
 * Extract context snippets from content
 */
function extractContextSnippets(content, entityVariations, contextWords) {
    const snippets = [];
    const words = content.split(/\s+/);
    
    // Search for any variation of the entity
    for (let i = 0; i < words.length; i++) {
        const windowText = words.slice(Math.max(0, i - contextWords), i + contextWords + 1).join(' ').toLowerCase();
        
        for (const variation of entityVariations) {
            if (windowText.includes(variation.toLowerCase())) {
                const start = Math.max(0, i - contextWords);
                const end = Math.min(words.length, i + contextWords + 1);
                
                snippets.push({
                    text: words.slice(start, end).join(' '),
                    position: i,
                    matchedVariation: variation
                });
                
                break; // Found a match, no need to check other variations
            }
        }
    }
    
    return snippets;
}

/**
 * Extract all entities mentioned in a content
 */
async function findCoMentions(content, currentEntityId) {
    const coMentions = [];
    
    // Get all entity variations to check
    const allEntities = await db.all(`
        SELECT DISTINCT 
            eg.id,
            eg.canonical_name,
            array_agg(DISTINCT ev.variation) as variations
        FROM intelligence.entity_groups eg
        LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
        WHERE eg.id != $1
        GROUP BY eg.id, eg.canonical_name
        LIMIT 500
    `, [currentEntityId]);
    
    const lowerContent = content.toLowerCase();
    
    for (const entity of allEntities) {
        const variations = entity.variations || [entity.canonical_name];
        for (const variation of variations) {
            if (variation && lowerContent.includes(variation.toLowerCase())) {
                coMentions.push(entity.canonical_name);
                break;
            }
        }
    }
    
    return [...new Set(coMentions)]; // Remove duplicates
}

/**
 * Generate contexts for a specific entity group
 */
async function generateEntityContexts(entityGroup) {
    console.log(`  Generating contexts for: ${entityGroup.canonical_name} (${entityGroup.group_type || 'untyped'})`);
    
    try {
        // Get all variations of this entity
        const variations = await db.all(`
            SELECT variation 
            FROM intelligence.entity_variations 
            WHERE group_id = $1
            UNION
            SELECT $2 as variation
        `, [entityGroup.id, entityGroup.canonical_name]);
        
        const variationList = variations.map(v => v.variation).filter(v => v); // Filter out null/empty values
        
        // Skip if no variations found
        if (variationList.length === 0) {
            console.log(`    No variations found for ${entityGroup.canonical_name}, skipping`);
            return null;
        }
        
        // Build search query for any variation using PostgreSQL numbered placeholders
        // Start at $1 since we have no other parameters
        const searchConditions = variationList.map((_, index) => `sp.content ILIKE $${index + 1}`).join(' OR ');
        
        // Build parameters array with ILIKE patterns
        const searchParams = variationList.map(v => `%${v}%`);
        
        // Skip if no search conditions (shouldn't happen after the check above, but just in case)
        if (!searchConditions) {
            console.log(`    No search conditions for ${entityGroup.canonical_name}, skipping`);
            return null;
        }
        
        // Query pages that mention any variation of this entity
        const pages = await db.all(`
            SELECT 
                c.name as company,
                c.id as company_id,
                u.url as source_url,
                sp.content as markdown_content,
                sp.scraped_at
            FROM raw_content.scraped_pages sp
            JOIN intelligence.urls u ON sp.url = u.url
            JOIN intelligence.companies c ON u.company_id = c.id
            WHERE ${searchConditions}
            ORDER BY sp.scraped_at DESC
            LIMIT 200
        `, searchParams);
        
        const allContexts = [];
        const companyMentions = new Set();
        
        for (const page of pages) {
            if (!page.markdown_content) continue;
            
            companyMentions.add(page.company_id);
            
            const contexts = extractContextSnippets(
                page.markdown_content,
                variationList,
                CONTEXT_WORDS
            );
            
            for (const ctx of contexts) {
                const coMentions = await findCoMentions(ctx.text, entityGroup.id);
                
                allContexts.push({
                    company: page.company,
                    source_url: page.source_url,
                    text: ctx.text,
                    position: ctx.position,
                    matched_variation: ctx.matchedVariation,
                    co_mentions: coMentions.slice(0, 10) // Limit co-mentions
                });
            }
            
            // Limit contexts per entity
            if (allContexts.length >= MAX_CONTEXTS_PER_ENTITY) {
                break;
            }
        }
        
        return {
            entity_id: entityGroup.id,
            canonical_name: entityGroup.canonical_name,
            group_type: entityGroup.group_type,
            variations: variationList,
            mentioned_by_count: companyMentions.size,
            mentioned_by_companies: Array.from(companyMentions),
            total_contexts: allContexts.length,
            contexts: allContexts.slice(0, MAX_CONTEXTS_PER_ENTITY)
        };
        
    } catch (error) {
        console.error(`Error generating contexts for ${entityGroup.canonical_name}:`, error.message);
        return null;
    }
}

/**
 * Main function to generate all entity contexts
 */
async function generateAllEntityContexts() {
    console.log('Starting entity context generation using grouped entities...\n');
    
    try {
        // Get statistics
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT eg.id) as total_groups,
                COUNT(DISTINCT ev.variation) as total_variations,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'company' THEN eg.id END) as companies,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'product' THEN eg.id END) as products,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'technology' THEN eg.id END) as technologies,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'concept' THEN eg.id END) as concepts
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
        `);
        
        console.log('📊 Entity Groups Statistics:');
        console.log(`Total groups: ${stats.total_groups} (down from ${stats.total_variations} variations)`);
        console.log(`Companies: ${stats.companies}`);
        console.log(`Products: ${stats.products}`);
        console.log(`Technologies: ${stats.technologies}`);
        console.log(`Concepts: ${stats.concepts}\n`);
        
        // Get all entity groups to process
        const entityGroups = await db.all(`
            SELECT 
                eg.id,
                eg.canonical_name,
                eg.group_type,
                COUNT(DISTINCT ev.id) as variation_count
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
            GROUP BY eg.id, eg.canonical_name, eg.group_type
            ORDER BY 
                CASE 
                    WHEN eg.group_type = 'company' THEN 1
                    WHEN eg.group_type = 'product' THEN 2
                    WHEN eg.group_type = 'technology' THEN 3
                    WHEN eg.group_type = 'concept' THEN 4
                    ELSE 5
                END,
                variation_count DESC
        `);
        
        console.log(`Processing ${entityGroups.length} entity groups...\n`);
        
        // Process entities by type
        const contextsByType = {
            monitored_companies: [],  // Our 54 tracked companies
            mentioned_companies: [],  // Other companies found in content
            products: [],
            technologies: [],
            concepts: [],
            other: []
        };
        
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        
        for (const entityGroup of entityGroups) {
            try {
                const contextData = await generateEntityContexts(entityGroup);
                
                if (contextData && contextData.contexts.length > 0) {
                const type = entityGroup.group_type || 'other';
                const typeKey = type === 'monitored_company' ? 'monitored_companies' :
                type === 'mentioned_company' ? 'mentioned_companies' :
                type === 'company' ? 'mentioned_companies' :  // Fallback for old data
                type === 'product' ? 'products' :
                               type === 'technology' ? 'technologies' :
                               type === 'concept' ? 'concepts' : 'other';
                    
                    contextsByType[typeKey].push(contextData);
                    processedCount++;
                } else {
                    skippedCount++;
                }
            } catch (error) {
                console.error(`  Error processing ${entityGroup.canonical_name}: ${error.message}`);
                errorCount++;
            }
            
            // Progress indicator
            if ((processedCount + skippedCount + errorCount) % 50 === 0) {
                console.log(`  Progress: ${processedCount + skippedCount + errorCount}/${entityGroups.length} entities processed`);
            }
        }
        
        console.log(`\n✅ Processed: ${processedCount} entities with contexts`);
        console.log(`⚠️  Skipped: ${skippedCount} entities without contexts`);
        console.log(`❌ Errors: ${errorCount} entities failed\n`);
        
        // Write context files by type
        for (const [type, contexts] of Object.entries(contextsByType)) {
            if (contexts.length > 0) {
                const outputFile = path.join(CONTEXT_DIR, `${type}-contexts.json`);
                fs.writeFileSync(outputFile, JSON.stringify({
                    generated_at: new Date().toISOString(),
                    type: type,
                    total_entities: contexts.length,
                    entities: contexts
                }, null, 2));
                
                console.log(`✅ Wrote ${contexts.length} ${type} contexts to ${outputFile}`);
            }
        }
        
        // Create a summary file
        const summary = {
            generated_at: new Date().toISOString(),
            statistics: stats,
            files_generated: Object.keys(contextsByType)
                .filter(type => contextsByType[type].length > 0)
                .map(type => `${type}-contexts.json`),
            total_entities_with_contexts: Object.values(contextsByType)
                .reduce((sum, contexts) => sum + contexts.length, 0),
            total_entities_processed: processedCount,
            total_entities_skipped: skippedCount,
            total_entities_failed: errorCount
        };
        
        fs.writeFileSync(
            path.join(CONTEXT_DIR, 'context-summary.json'),
            JSON.stringify(summary, null, 2)
        );
        
        console.log('\n✅ Context generation complete!');
        console.log(`Total entities with contexts: ${summary.total_entities_with_contexts}`);
        
    } catch (error) {
        console.error('Error generating contexts:', error);
        throw error;
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    generateAllEntityContexts().catch(console.error);
}

module.exports = { generateAllEntityContexts };
