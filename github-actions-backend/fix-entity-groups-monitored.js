#!/usr/bin/env node

/**
 * Fix Entity Groups is_monitored Status
 * Properly determines which entities should be marked as monitored
 * by checking against the companies table
 */

require('dotenv').config();
const { db, end } = require('./postgres-db');
const fs = require('fs').promises;
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'api-data', 'entity-groups.json');

async function fixEntityGroups() {
    console.log('🔧 Fixing entity groups is_monitored status...\n');
    
    try {
        // 1. Get all monitored companies
        const monitoredCompanies = await db.all(`
            SELECT id, name, is_monitored 
            FROM intelligence.companies 
            WHERE is_monitored = true
            ORDER BY name
        `);
        
        console.log(`📊 Found ${monitoredCompanies.length} monitored companies\n`);
        
        // Create a set of monitored company names (lowercase for matching)
        const monitoredNames = new Set(
            monitoredCompanies.map(c => c.name.toLowerCase())
        );
        
        // 2. Get all entity groups with proper aggregation
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
                COUNT(DISTINCT ev.variation_name) as variation_count,
                COALESCE(em.company_mentions, 0) as mentioned_by_count,
                eg.first_seen,
                eg.last_seen
            FROM intelligence.entity_groups eg
            LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
            LEFT JOIN entity_mentions em ON eg.id = em.id
            GROUP BY eg.id, eg.canonical_name, eg.group_type, eg.first_seen, eg.last_seen, em.company_mentions
            ORDER BY eg.canonical_name
        `);
        
        console.log(`📊 Found ${entityGroups.length} entity groups total\n`);
        
        // 3. Fix entity types and determine monitored status
        const fixedEntities = entityGroups.map((eg, index) => {
            let fixedType = eg.type;
            let isMonitored = false;
            
            // Check if this entity is a monitored company
            const entityNameLower = eg.name.toLowerCase();
            if (monitoredNames.has(entityNameLower)) {
                isMonitored = true;
                fixedType = 'company';
            }
            
            // Fix common misclassifications
            const nameLower = eg.name.toLowerCase();
            
            // Product patterns
            if (nameLower.match(/^(gpt|claude|llama|gemini|dall-e|midjourney|stable diffusion|falcon|mistral|qwen|yi|deepseek|palm|bert|roberta|t5|bart)/)) {
                fixedType = 'product';
                // Check if it's a product of a monitored company
                if (nameLower.includes('gpt') || nameLower.includes('dall')) {
                    isMonitored = monitoredNames.has('openai');
                } else if (nameLower.includes('claude')) {
                    isMonitored = monitoredNames.has('anthropic');
                } else if (nameLower.includes('gemini') || nameLower.includes('palm')) {
                    isMonitored = monitoredNames.has('google deepmind');
                } else if (nameLower.includes('llama')) {
                    isMonitored = monitoredNames.has('meta ai');
                }
            }
            
            // Feature patterns
            else if (nameLower.match(/(api|sdk|studio|playground|console|dashboard|cli|toolkit|extension|plugin|integration|endpoint|webhook)/)) {
                fixedType = 'feature';
            }
            
            // Technology patterns
            else if (nameLower.match(/(python|javascript|typescript|java|rust|go|docker|kubernetes|tensorflow|pytorch|react|vue|angular|aws|azure|gcp)/)) {
                fixedType = 'technology';
            }
            
            // AI/ML concepts
            else if (nameLower.match(/(machine learning|deep learning|neural network|transformer|attention|fine-tuning|embedding|tokenization|inference|training)/)) {
                fixedType = 'concept';
            }
            
            // Company patterns (if not already identified)
            else if (!isMonitored && nameLower.match(/(inc|corp|ltd|llc|gmbh|labs|systems|technologies|software|ai$|\.ai$|\.com$)/)) {
                fixedType = 'company';
            }
            
            return {
                id: eg.id || index + 1,
                name: eg.name,
                type: fixedType,
                variations: String(eg.variation_count || 1),
                mentioned_by: String(eg.mentioned_by_count || 0),
                is_monitored: isMonitored
            };
        });
        
        // 4. Count statistics
        const stats = {
            total: fixedEntities.length,
            monitored: fixedEntities.filter(e => e.is_monitored).length,
            byType: {}
        };
        
        for (const entity of fixedEntities) {
            stats.byType[entity.type] = (stats.byType[entity.type] || 0) + 1;
        }
        
        console.log('📊 Fixed Entity Statistics:');
        console.log(`   Total entities: ${stats.total}`);
        console.log(`   Monitored entities: ${stats.monitored}`);
        console.log('   By type:');
        for (const [type, count] of Object.entries(stats.byType)) {
            console.log(`     - ${type}: ${count}`);
        }
        console.log();
        
        // 5. Create the output JSON
        const outputData = {
            generated_at: new Date().toISOString(),
            total_groups: fixedEntities.length,
            monitored_count: stats.monitored,
            all_entities: fixedEntities
        };
        
        // 6. Write the file
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
        console.log(`✅ Wrote fixed entity-groups.json with ${stats.monitored} monitored entities\n`);
        
        // 7. Also create categorized lists for easier access
        const categorized = {
            companies: fixedEntities.filter(e => e.type === 'company').map(e => e.name),
            products: fixedEntities.filter(e => e.type === 'product').map(e => e.name),
            features: fixedEntities.filter(e => e.type === 'feature').map(e => e.name),
            technologies: fixedEntities.filter(e => e.type === 'technology').map(e => e.name),
            concepts: fixedEntities.filter(e => e.type === 'concept').map(e => e.name),
            monitored: fixedEntities.filter(e => e.is_monitored).map(e => e.name)
        };
        
        const categorizedFile = path.join(__dirname, '..', 'api-data', 'entity-categories.json');
        await fs.writeFile(categorizedFile, JSON.stringify(categorized, null, 2));
        console.log(`✅ Wrote entity-categories.json for easy access\n`);
        
    } catch (error) {
        console.error('❌ Error fixing entity groups:', error);
        process.exit(1);
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    fixEntityGroups();
}

module.exports = { fixEntityGroups };
