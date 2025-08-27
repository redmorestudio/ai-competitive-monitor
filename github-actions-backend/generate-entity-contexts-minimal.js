#!/usr/bin/env node

/**
 * Minimal Entity Context Generation for KWIC
 * Optimized version that only processes high-priority entities to prevent timeouts
 * This temporary solution allows the pipeline to complete while we optimize further
 */

require('dotenv').config();

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');
const fs = require('fs');
const path = require('path');

// Configuration - REDUCED for performance
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');
const CONTEXT_DIR = path.join(OUTPUT_DIR, 'contexts');
const CONTEXT_WORDS = 10; // Reduced from 15
const MAX_CONTEXTS_PER_ENTITY = 5; // Dramatically reduced from 50
const MAX_PAGES_TO_SEARCH = 10; // Reduced from 200
const MAX_ENTITIES_TO_PROCESS = 50; // Only process top entities

// Ensure directories exist
if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
}

/**
 * Extract context snippets from content (simplified version)
 */
function extractContextSnippets(content, entityVariations, contextWords, maxSnippets = 3) {
    const snippets = [];
    const words = content.split(/\s+/);
    const lowerContent = content.toLowerCase();
    
    // Quick check if any variation exists
    const hasMatch = entityVariations.some(v => v && lowerContent.includes(v.toLowerCase()));
    if (!hasMatch) return snippets;
    
    // Find first few matches only
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
                charCount += words[i].length + 1; // +1 for space
            }
            
            const start = Math.max(0, wordPos - contextWords);
            const end = Math.min(words.length, wordPos + contextWords + 1);
            
            snippets.push({
                text: words.slice(start, end).join(' '),
                position: wordPos,
                matchedVariation: variation
            });
            
            // Find next occurrence
            index = lowerContent.indexOf(searchTerm, index + 1);
        }
        
        if (snippets.length >= maxSnippets) break;
    }
    
    return snippets;
}

/**
 * Generate contexts for a specific entity group (optimized)
 */
async function generateEntityContexts(entityGroup, skipCoMentions = true) {
    try {
        // Get variations (limit to most common)
        const variations = await db.all(`
            SELECT variation 
            FROM intelligence.entity_variations 
            WHERE group_id = $1
            LIMIT 5
        `, [entityGroup.id]);
        
        const variationList = [entityGroup.canonical_name, ...variations.map(v => v.variation)].filter(v => v);
        
        if (variationList.length === 0) return null;
        
        // Build search query
        const searchConditions = variationList.map((_, index) => `sp.content ILIKE $${index + 1}`).join(' OR ');
        const searchParams = variationList.map(v => `%${v}%`);
        
        // Query fewer pages
        const pages = await db.all(`
            SELECT 
                c.name as company,
                c.id as company_id,
                u.url as source_url,
                SUBSTRING(sp.content, 1, 10000) as markdown_content,
                sp.scraped_at
            FROM raw_content.scraped_pages sp
            JOIN intelligence.urls u ON sp.url = u.url
            JOIN intelligence.companies c ON u.company_id = c.id
            WHERE ${searchConditions}
            ORDER BY sp.scraped_at DESC
            LIMIT ${MAX_PAGES_TO_SEARCH}
        `, searchParams);
        
        const allContexts = [];
        const companyMentions = new Set();
        
        for (const page of pages) {
            if (!page.markdown_content) continue;
            
            companyMentions.add(page.company_id);
            
            const contexts = extractContextSnippets(
                page.markdown_content,
                variationList,
                CONTEXT_WORDS,
                2 // Max 2 snippets per page
            );
            
            for (const ctx of contexts) {
                allContexts.push({
                    company: page.company,
                    source_url: page.source_url,
                    text: ctx.text,
                    position: ctx.position,
                    matched_variation: ctx.matchedVariation,
                    co_mentions: [] // Skip co-mentions for speed
                });
            }
            
            if (allContexts.length >= MAX_CONTEXTS_PER_ENTITY) break;
        }
        
        return {
            entity_id: entityGroup.id,
            canonical_name: entityGroup.canonical_name,
            group_type: entityGroup.group_type,
            variations: variationList.slice(0, 3), // Limit variations stored
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
 * Main function - minimal version
 */
async function generateMinimalEntityContexts() {
    console.log('🚀 Starting MINIMAL entity context generation (optimized for speed)...\n');
    
    try {
        // Get only the most important entities
        const entityGroups = await db.all(`
            SELECT 
                eg.id,
                eg.canonical_name,
                eg.group_type,
                COUNT(DISTINCT ev.id) as variation_count
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
            WHERE 
                -- Prioritize monitored companies and key entities
                eg.group_type IN ('monitored_company', 'company') 
                OR eg.canonical_name IN (
                    'OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Meta', 
                    'ChatGPT', 'Claude', 'GPT-4', 'Gemini', 'LLM',
                    'AI', 'Machine Learning', 'Artificial Intelligence'
                )
            GROUP BY eg.id, eg.canonical_name, eg.group_type
            ORDER BY 
                CASE 
                    WHEN eg.group_type = 'monitored_company' THEN 0
                    WHEN eg.group_type = 'company' THEN 1
                    ELSE 2
                END,
                variation_count DESC
            LIMIT ${MAX_ENTITIES_TO_PROCESS}
        `);
        
        console.log(`📊 Processing ${entityGroups.length} high-priority entities only (minimal mode)\n`);
        
        const contextsByType = {
            monitored_companies: [],
            mentioned_companies: [],
            products: [],
            technologies: [],
            concepts: [],
            other: []
        };
        
        let processedCount = 0;
        
        for (const entityGroup of entityGroups) {
            process.stdout.write(`Processing ${processedCount + 1}/${entityGroups.length}: ${entityGroup.canonical_name}...`);
            
            const contextData = await generateEntityContexts(entityGroup, true);
            
            if (contextData && contextData.contexts.length > 0) {
                const type = entityGroup.group_type || 'other';
                const typeKey = type === 'monitored_company' ? 'monitored_companies' :
                               type === 'mentioned_company' ? 'mentioned_companies' :
                               type === 'company' ? 'mentioned_companies' :
                               type === 'product' ? 'products' :
                               type === 'technology' ? 'technologies' :
                               type === 'concept' ? 'concepts' : 'other';
                
                contextsByType[typeKey].push(contextData);
                processedCount++;
                console.log(' ✓');
            } else {
                console.log(' (no contexts)');
            }
        }
        
        console.log(`\n✅ Processed ${processedCount} entities with contexts\n`);
        
        // Write minimal context files
        for (const [type, contexts] of Object.entries(contextsByType)) {
            if (contexts.length > 0) {
                // Write individual type file
                const outputFile = path.join(CONTEXT_DIR, `${type}-contexts.json`);
                fs.writeFileSync(outputFile, JSON.stringify({
                    generated_at: new Date().toISOString(),
                    type: type,
                    total_entities: contexts.length,
                    mode: 'minimal',
                    entities: contexts
                }, null, 2));
                
                // Also write legacy format files for compatibility
                const legacyFile = path.join(OUTPUT_DIR, `contexts-${type.replace('_', '-').replace('monitored-companies', 'companies')}.json`);
                fs.writeFileSync(legacyFile, JSON.stringify({
                    generated_at: new Date().toISOString(),
                    type: type,
                    total_entities: contexts.length,
                    mode: 'minimal',
                    entities: contexts
                }, null, 2));
                
                console.log(`✅ Wrote ${contexts.length} ${type} contexts`);
            }
        }
        
        // Create minimal summary
        const summary = {
            generated_at: new Date().toISOString(),
            mode: 'minimal',
            message: 'Generated minimal contexts for high-priority entities only',
            total_entities_processed: processedCount,
            max_entities: MAX_ENTITIES_TO_PROCESS,
            max_contexts_per_entity: MAX_CONTEXTS_PER_ENTITY,
            max_pages_per_entity: MAX_PAGES_TO_SEARCH
        };
        
        fs.writeFileSync(
            path.join(CONTEXT_DIR, 'context-summary.json'),
            JSON.stringify(summary, null, 2)
        );
        
        console.log('\n✅ Minimal context generation complete!');
        console.log('⚡ Pipeline should now complete within timeout limits');
        
    } catch (error) {
        console.error('Error generating minimal contexts:', error);
        throw error;
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    generateMinimalEntityContexts().catch(console.error);
}

module.exports = { generateMinimalEntityContexts };