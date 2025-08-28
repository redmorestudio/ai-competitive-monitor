#!/usr/bin/env node

/**
 * Optimized Entity Context Generation for KWIC
 * Processes all entity types with performance optimizations
 */

require('dotenv').config();

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');
const fs = require('fs');
const path = require('path');

// Configuration - Balanced for performance
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');
const CONTEXT_WORDS = 12;
const MAX_CONTEXTS_PER_ENTITY = 10; // Reasonable limit
const MAX_PAGES_TO_SEARCH = 20; // Per entity
const MAX_ENTITIES_PER_TYPE = {
    'monitored_company': 100,  // All monitored companies
    'company': 50,             // Top mentioned companies
    'product': 100,            // Top products
    'technology': 100,         // Top technologies  
    'concept': 50,             // Top concepts
    'other': 20
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract context snippets from content
 */
function extractContextSnippets(content, entityVariations, contextWords, maxSnippets = 5) {
    const snippets = [];
    const words = content.split(/\s+/);
    const lowerContent = content.toLowerCase();
    
    for (const variation of entityVariations) {
        if (!variation) continue;
        
        const searchTerm = variation.toLowerCase();
        let index = lowerContent.indexOf(searchTerm);
        
        while (index !== -1 && snippets.length < maxSnippets) {
            // Find word position
            let wordPos = 0;
            let charCount = 0;
            for (let i = 0; i < words.length; i++) {
                if (charCount <= index && index < charCount + words[i].length) {
                    wordPos = i;
                    break;
                }
                charCount += words[i].length + 1;
            }
            
            const start = Math.max(0, wordPos - contextWords);
            const end = Math.min(words.length, wordPos + contextWords + 1);
            
            snippets.push({
                text: words.slice(start, end).join(' '),
                position: wordPos,
                matchedVariation: variation
            });
            
            index = lowerContent.indexOf(searchTerm, index + 1);
        }
        
        if (snippets.length >= maxSnippets) break;
    }
    
    return snippets;
}

/**
 * Extract co-mentions efficiently
 */
async function extractCoMentions(content, currentEntity, limit = 5) {
    // Get top entities that might be mentioned
    const topEntities = await db.all(`
        SELECT DISTINCT canonical_name
        FROM intelligence.entity_groups
        WHERE canonical_name != $1
        AND group_type IN ('company', 'product', 'technology')
        ORDER BY canonical_name
        LIMIT 50
    `, [currentEntity]);
    
    const coMentions = [];
    const lowerContent = content.toLowerCase();
    
    for (const entity of topEntities) {
        if (lowerContent.includes(entity.canonical_name.toLowerCase())) {
            coMentions.push(entity.canonical_name);
            if (coMentions.length >= limit) break;
        }
    }
    
    return coMentions;
}

/**
 * Generate contexts for a specific entity group
 */
async function generateEntityContexts(entityGroup, skipCoMentions = false) {
    try {
        // Get variations
        const variations = await db.all(`
            SELECT variation 
            FROM intelligence.entity_variations 
            WHERE group_id = $1
            LIMIT 10
        `, [entityGroup.id]);
        
        const variationList = [entityGroup.canonical_name, ...variations.map(v => v.variation)].filter(v => v);
        
        if (variationList.length === 0) return null;
        
        // Build search query
        const searchConditions = variationList.map((_, index) => `sp.content ILIKE $${index + 1}`).join(' OR ');
        const searchParams = variationList.map(v => `%${v}%`);
        
        // Query pages
        const pages = await db.all(`
            SELECT 
                c.name as company,
                u.url as source_url,
                SUBSTRING(sp.content, 1, 15000) as markdown_content,
                sp.scraped_at
            FROM raw_content.scraped_pages sp
            JOIN intelligence.urls u ON sp.url = u.url
            JOIN intelligence.companies c ON u.company_id = c.id
            WHERE ${searchConditions}
            ORDER BY sp.scraped_at DESC
            LIMIT ${MAX_PAGES_TO_SEARCH}
        `, searchParams);
        
        const allContexts = [];
        
        for (const page of pages) {
            if (!page.markdown_content) continue;
            
            const contexts = extractContextSnippets(
                page.markdown_content,
                variationList,
                CONTEXT_WORDS,
                3
            );
            
            for (const ctx of contexts) {
                const coMentions = skipCoMentions ? [] : await extractCoMentions(
                    ctx.text,
                    entityGroup.canonical_name,
                    3
                );
                
                allContexts.push({
                    company: page.company,
                    source_url: page.source_url,
                    text: ctx.text,
                    position: ctx.position,
                    co_mentions: coMentions
                });
            }
            
            if (allContexts.length >= MAX_CONTEXTS_PER_ENTITY) break;
        }
        
        return allContexts.length > 0 ? allContexts : null;
        
    } catch (error) {
        console.error(`Error generating contexts for ${entityGroup.canonical_name}:`, error.message);
        return null;
    }
}

/**
 * Main function - optimized version
 */
async function generateOptimizedEntityContexts() {
    console.log('🚀 Starting OPTIMIZED entity context generation...\n');
    
    try {
        // Get statistics first
        const stats = await db.get(`
            SELECT 
                COUNT(DISTINCT eg.id) as total_groups,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'company' THEN eg.id END) as companies,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'product' THEN eg.id END) as products,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'technology' THEN eg.id END) as technologies,
                COUNT(DISTINCT CASE WHEN eg.group_type = 'concept' THEN eg.id END) as concepts
            FROM intelligence.entity_groups eg
        `);
        
        console.log('📊 Entity Statistics:');
        console.log(`  Companies: ${stats.companies}`);
        console.log(`  Products: ${stats.products}`);
        console.log(`  Technologies: ${stats.technologies}`);
        console.log(`  Concepts: ${stats.concepts}`);
        console.log(`  Total: ${stats.total_groups}\n`);
        
        // Process each entity type with limits
        const contextsByType = {
            companies: {},
            products: {},
            technologies: {},
            concepts: {}
        };
        
        // Process companies
        console.log('Processing companies...');
        const companies = await db.all(`
            SELECT eg.id, eg.canonical_name, eg.group_type
            FROM intelligence.entity_groups eg
            WHERE eg.group_type IN ('company', 'monitored_company', 'mentioned_company')
            ORDER BY 
                CASE WHEN eg.group_type = 'monitored_company' THEN 0 ELSE 1 END,
                eg.canonical_name
            LIMIT ${MAX_ENTITIES_PER_TYPE.company + MAX_ENTITIES_PER_TYPE.monitored_company}
        `);
        
        for (const entity of companies) {
            process.stdout.write(`  Extracting contexts for: ${entity.canonical_name}`);
            const contexts = await generateEntityContexts(entity, true);
            if (contexts && contexts.length > 0) {
                contextsByType.companies[entity.canonical_name] = contexts;
                console.log(` ✓ (${contexts.length} contexts)`);
            } else {
                console.log(` -`);
            }
        }
        
        // Process products
        console.log('\nProcessing products...');
        const products = await db.all(`
            SELECT eg.id, eg.canonical_name, eg.group_type
            FROM intelligence.entity_groups eg
            WHERE eg.group_type = 'product'
            ORDER BY eg.canonical_name
            LIMIT ${MAX_ENTITIES_PER_TYPE.product}
        `);
        
        for (const entity of products) {
            process.stdout.write(`  Extracting contexts for: ${entity.canonical_name}`);
            const contexts = await generateEntityContexts(entity, true);
            if (contexts && contexts.length > 0) {
                contextsByType.products[entity.canonical_name] = contexts;
                console.log(` ✓ (${contexts.length} contexts)`);
            } else {
                console.log(` -`);
            }
        }
        
        // Process technologies
        console.log('\nProcessing technologies...');
        const technologies = await db.all(`
            SELECT eg.id, eg.canonical_name, eg.group_type
            FROM intelligence.entity_groups eg
            WHERE eg.group_type = 'technology'
            ORDER BY eg.canonical_name
            LIMIT ${MAX_ENTITIES_PER_TYPE.technology}
        `);
        
        for (const entity of technologies) {
            process.stdout.write(`  Extracting contexts for: ${entity.canonical_name}`);
            const contexts = await generateEntityContexts(entity, true);
            if (contexts && contexts.length > 0) {
                contextsByType.technologies[entity.canonical_name] = contexts;
                console.log(` ✓ (${contexts.length} contexts)`);
            } else {
                console.log(` -`);
            }
        }
        
        // Process concepts
        console.log('\nProcessing concepts...');
        const concepts = await db.all(`
            SELECT eg.id, eg.canonical_name, eg.group_type
            FROM intelligence.entity_groups eg
            WHERE eg.group_type = 'concept'
            ORDER BY eg.canonical_name
            LIMIT ${MAX_ENTITIES_PER_TYPE.concept}
        `);
        
        for (const entity of concepts) {
            process.stdout.write(`  Extracting contexts for: ${entity.canonical_name}`);
            const contexts = await generateEntityContexts(entity, true);
            if (contexts && contexts.length > 0) {
                contextsByType.concepts[entity.canonical_name] = contexts;
                console.log(` ✓ (${contexts.length} contexts)`);
            } else {
                console.log(` -`);
            }
        }
        
        // Write output files
        console.log('\nWriting context files...');
        
        // Calculate totals
        let totalContexts = 0;
        
        for (const [type, contexts] of Object.entries(contextsByType)) {
            const entityCount = Object.keys(contexts).length;
            const contextCount = Object.values(contexts).reduce((sum, arr) => sum + arr.length, 0);
            totalContexts += contextCount;
            
            const outputFile = path.join(OUTPUT_DIR, `contexts-${type}.json`);
            fs.writeFileSync(outputFile, JSON.stringify({
                type: type,
                generated_at: new Date().toISOString(),
                entity_count: entityCount,
                context_count: contextCount,
                contexts: contexts
            }, null, 2));
            
            console.log(`✅ Generated contexts-${type}.json with ${contextCount} contexts for ${entityCount} entities`);
        }
        
        // Write index file
        const indexFile = path.join(OUTPUT_DIR, 'contexts-index.json');
        fs.writeFileSync(indexFile, JSON.stringify({
            generated_at: new Date().toISOString(),
            total_entities: Object.keys(companies).length + Object.keys(products).length + 
                          Object.keys(technologies).length + Object.keys(concepts).length,
            entity_types: {
                companies: Object.keys(contextsByType.companies).length,
                technologies: Object.keys(contextsByType.technologies).length,
                concepts: Object.keys(contextsByType.concepts).length,
                products: Object.keys(contextsByType.products).length
            },
            entities_with_contexts: Object.values(contextsByType).reduce((sum, ctx) => sum + Object.keys(ctx).length, 0)
        }, null, 2));
        
        console.log(`✅ Generated contexts-index.json`);
        console.log(`\n✨ Context generation complete! Total contexts: ${totalContexts}`);
        
    } catch (error) {
        console.error('Error generating contexts:', error);
        throw error;
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    generateOptimizedEntityContexts().catch(console.error);
}

module.exports = { generateOptimizedEntityContexts };