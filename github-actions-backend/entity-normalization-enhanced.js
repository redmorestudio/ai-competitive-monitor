#!/usr/bin/env node

/**
 * Enhanced Entity Normalization with Hierarchical Relationships
 * 
 * Handles complex entity relationships like:
 * - Peanuts (parent) -> Peanut Butter, Peanut Flour (children)
 * - GPT (parent) -> GPT-3, GPT-4, GPT-3.5 (children)
 * - AI (parent) -> Machine Learning -> Deep Learning (hierarchy)
 */

require('dotenv').config();

// SSL Certificate fix
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { db, end } = require('./postgres-db');
const natural = require('natural');

// Enhanced normalization rules with hierarchical relationships
const ENTITY_HIERARCHIES = {
    // Food/ingredients example
    'peanuts': {
        type: 'parent',
        children: ['peanut butter', 'peanut flour', 'peanut oil', 'peanut sauce'],
        synonyms: ['peanut', 'groundnut', 'ground nut']
    },
    
    // AI Models hierarchy
    'gpt': {
        type: 'parent',
        children: ['gpt-3', 'gpt-3.5', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
        synonyms: ['gpt model', 'gpt models']
    },
    
    'claude': {
        type: 'parent',
        children: ['claude-1', 'claude-2', 'claude-instant', 'claude-3', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        synonyms: ['claude model', 'claude ai']
    },
    
    'llama': {
        type: 'parent',
        children: ['llama-2', 'llama-2-7b', 'llama-2-13b', 'llama-2-70b', 'code-llama', 'llama-3'],
        synonyms: ['llama model', 'meta llama']
    },
    
    // Technology hierarchies
    'artificial intelligence': {
        type: 'parent',
        children: ['machine learning', 'expert systems', 'fuzzy logic', 'knowledge representation'],
        synonyms: ['ai', 'a.i.', 'artificial-intelligence']
    },
    
    'machine learning': {
        type: 'parent',
        children: ['deep learning', 'reinforcement learning', 'supervised learning', 'unsupervised learning'],
        synonyms: ['ml', 'machine-learning']
    },
    
    'deep learning': {
        type: 'parent',
        children: ['neural networks', 'convolutional neural networks', 'recurrent neural networks', 'transformers'],
        synonyms: ['dl', 'deep-learning']
    },
    
    // Cloud providers
    'cloud computing': {
        type: 'parent',
        children: ['aws', 'azure', 'google cloud', 'alibaba cloud', 'ibm cloud'],
        synonyms: ['cloud services', 'cloud infrastructure']
    },
    
    'aws': {
        type: 'parent',
        children: ['ec2', 's3', 'lambda', 'dynamodb', 'rds', 'sagemaker'],
        synonyms: ['amazon web services', 'amazon cloud']
    },
    
    // Programming concepts
    'programming': {
        type: 'parent',
        children: ['frontend', 'backend', 'full-stack', 'devops', 'mobile development'],
        synonyms: ['software development', 'coding', 'development']
    },
    
    'database': {
        type: 'parent',
        children: ['sql', 'nosql', 'postgresql', 'mysql', 'mongodb', 'redis'],
        synonyms: ['db', 'databases', 'data storage']
    }
};

// Smart similarity detection
class EntityNormalizer {
    constructor() {
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        this.metaphone = natural.Metaphone;
        this.tfidf = new natural.TfIdf();
    }
    
    /**
     * Normalize an entity name to its canonical form
     */
    normalize(entity) {
        if (!entity) return '';
        
        return entity
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
            .replace(/\s+/g, ' ')      // Normalize whitespace
            .replace(/^(the|a|an)\s+/i, ''); // Remove articles
    }
    
    /**
     * Calculate similarity between two entities
     */
    calculateSimilarity(entity1, entity2) {
        const e1 = this.normalize(entity1);
        const e2 = this.normalize(entity2);
        
        // Exact match
        if (e1 === e2) return 1.0;
        
        // Check if one contains the other
        if (e1.includes(e2) || e2.includes(e1)) {
            return 0.85;
        }
        
        // Levenshtein distance
        const distance = this.levenshteinDistance(e1, e2);
        const maxLength = Math.max(e1.length, e2.length);
        const levenshteinScore = 1 - (distance / maxLength);
        
        // Token similarity
        const tokens1 = new Set(this.tokenizer.tokenize(e1));
        const tokens2 = new Set(this.tokenizer.tokenize(e2));
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        const jaccardScore = intersection.size / union.size;
        
        // Phonetic similarity
        const phonetic1 = this.metaphone.process(e1);
        const phonetic2 = this.metaphone.process(e2);
        const phoneticScore = phonetic1 === phonetic2 ? 1 : 0;
        
        // Weighted average
        return (levenshteinScore * 0.4 + jaccardScore * 0.4 + phoneticScore * 0.2);
    }
    
    /**
     * Detect parent-child relationships
     */
    detectHierarchy(entities) {
        const hierarchies = {};
        
        for (const parent of entities) {
            const children = entities.filter(child => {
                if (child === parent) return false;
                
                const parentNorm = this.normalize(parent);
                const childNorm = this.normalize(child);
                
                // Check if child contains parent as prefix/suffix
                if (childNorm.startsWith(parentNorm + ' ') || 
                    childNorm.endsWith(' ' + parentNorm)) {
                    return true;
                }
                
                // Check if child is a versioned variant (e.g., GPT -> GPT-4)
                if (childNorm.match(new RegExp(`^${parentNorm}[-\\s]?\\d`, 'i'))) {
                    return true;
                }
                
                return false;
            });
            
            if (children.length > 0) {
                hierarchies[parent] = children;
            }
        }
        
        return hierarchies;
    }
    
    /**
     * Group similar entities
     */
    groupSimilarEntities(entities, threshold = 0.7) {
        const groups = [];
        const processed = new Set();
        
        for (const entity of entities) {
            if (processed.has(entity)) continue;
            
            const group = {
                canonical: entity,
                variations: [entity],
                confidence: 1.0,
                type: this.detectEntityType(entity)
            };
            
            // Find similar entities
            for (const other of entities) {
                if (other === entity || processed.has(other)) continue;
                
                const similarity = this.calculateSimilarity(entity, other);
                if (similarity >= threshold) {
                    group.variations.push(other);
                    processed.add(other);
                }
            }
            
            processed.add(entity);
            
            if (group.variations.length > 1) {
                // Choose best canonical name (shortest that's not an abbreviation)
                group.canonical = this.selectCanonicalName(group.variations);
                groups.push(group);
            }
        }
        
        return groups;
    }
    
    /**
     * Select the best canonical name from variations
     */
    selectCanonicalName(variations) {
        // Filter out obvious abbreviations
        const nonAbbreviations = variations.filter(v => 
            !v.match(/^[A-Z]{2,}$/i) && v.length > 3
        );
        
        if (nonAbbreviations.length === 0) {
            return variations[0];
        }
        
        // Prefer names without special characters
        const clean = nonAbbreviations.filter(v => !v.match(/[-_]/));
        if (clean.length > 0) {
            return clean.sort((a, b) => a.length - b.length)[0];
        }
        
        // Return shortest non-abbreviation
        return nonAbbreviations.sort((a, b) => a.length - b.length)[0];
    }
    
    /**
     * Detect entity type
     */
    detectEntityType(entity) {
        const lower = entity.toLowerCase();
        
        // Company indicators
        if (lower.match(/\b(inc|corp|ltd|llc|gmbh|company|technologies|labs|systems)\b/)) {
            return 'company';
        }
        
        // Product indicators
        if (lower.match(/\b(pro|plus|enterprise|premium|free|beta|alpha|v\d+|\d+\.\d+)\b/)) {
            return 'product';
        }
        
        // Technology indicators
        if (lower.match(/\b(api|sdk|framework|library|platform|engine|tool|kit)\b/)) {
            return 'technology';
        }
        
        // Concept indicators
        if (lower.match(/\b(learning|intelligence|processing|analysis|optimization|generation)\b/)) {
            return 'concept';
        }
        
        return 'unknown';
    }
    
    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }
}

// Main normalization function
async function normalizeEntities() {
    console.log('🚀 Enhanced Entity Normalization Starting...\n');
    
    const normalizer = new EntityNormalizer();
    
    try {
        // Get all unique entities from database
        const entities = await getAllEntities();
        console.log(`📊 Found ${entities.length} unique entities to process\n`);
        
        // Group similar entities
        console.log('🔍 Detecting similar entities...');
        const groups = normalizer.groupSimilarEntities(entities);
        console.log(`✅ Created ${groups.length} entity groups\n`);
        
        // Detect hierarchies
        console.log('🌳 Detecting entity hierarchies...');
        const hierarchies = normalizer.detectHierarchy(entities);
        console.log(`✅ Found ${Object.keys(hierarchies).length} parent-child relationships\n`);
        
        // Apply predefined hierarchies
        console.log('📚 Applying predefined hierarchies...');
        await applyHierarchies(hierarchies);
        
        // Save groups to database
        console.log('💾 Saving entity groups...');
        await saveEntityGroups(groups);
        
        // Generate report
        await generateNormalizationReport(groups, hierarchies);
        
        console.log('\n✅ Entity normalization complete!');
        
    } catch (error) {
        console.error('❌ Error during normalization:', error);
    } finally {
        await end();
    }
}

// Get all entities from database
async function getAllEntities() {
    const result = await db.all(`
        WITH entity_mentions AS (
            SELECT DISTINCT jsonb_array_elements_text(
                COALESCE(entities->'companies', '[]'::jsonb) ||
                COALESCE(entities->'products', '[]'::jsonb) ||
                COALESCE(entities->'technologies', '[]'::jsonb) ||
                COALESCE(entities->'concepts', '[]'::jsonb)
            ) as entity
            FROM intelligence.baseline_analysis
            WHERE entities IS NOT NULL
        )
        SELECT DISTINCT LOWER(TRIM(entity)) as entity
        FROM entity_mentions
        WHERE entity IS NOT NULL AND LENGTH(entity) > 1
        ORDER BY entity
    `);
    
    return result.map(r => r.entity);
}

// Apply hierarchies to database
async function applyHierarchies(detectedHierarchies) {
    // Combine detected and predefined hierarchies
    const allHierarchies = { ...ENTITY_HIERARCHIES };
    
    for (const [parent, children] of Object.entries(detectedHierarchies)) {
        if (!allHierarchies[parent]) {
            allHierarchies[parent] = { type: 'parent', children: [] };
        }
        allHierarchies[parent].children = [
            ...new Set([...allHierarchies[parent].children || [], ...children])
        ];
    }
    
    // Save to database
    for (const [parent, config] of Object.entries(allHierarchies)) {
        const parentId = await createEntityGroup(parent, 'parent');
        
        for (const child of config.children || []) {
            const childId = await createEntityGroup(child, 'child');
            await createRelationship(parentId, childId, 'parent-child');
        }
        
        for (const synonym of config.synonyms || []) {
            await addVariation(parentId, synonym);
        }
    }
}

// Save entity groups to database
async function saveEntityGroups(groups) {
    for (const group of groups) {
        const groupId = await createEntityGroup(group.canonical, group.type);
        
        for (const variation of group.variations) {
            if (variation !== group.canonical) {
                await addVariation(groupId, variation, group.confidence);
            }
        }
    }
}

// Create entity group
async function createEntityGroup(name, type) {
    const result = await db.run(`
        INSERT INTO intelligence.entity_groups (canonical_name, group_type, auto_created)
        VALUES ($1, $2, true)
        ON CONFLICT (canonical_name) DO UPDATE
        SET updated_at = NOW()
        RETURNING id
    `, [name, type]);
    
    return result.id;
}

// Add variation to group
async function addVariation(groupId, variation, confidence = 1.0) {
    await db.run(`
        INSERT INTO intelligence.entity_variations (group_id, variation, confidence, source)
        VALUES ($1, $2, $3, 'auto')
        ON CONFLICT (variation) DO NOTHING
    `, [groupId, variation, confidence]);
}

// Create relationship between groups
async function createRelationship(sourceId, targetId, type) {
    await db.run(`
        INSERT INTO intelligence.entity_relationships (source_group_id, target_group_id, relationship_type)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
    `, [sourceId, targetId, type]);
}

// Generate normalization report
async function generateNormalizationReport(groups, hierarchies) {
    const stats = await db.get(`
        SELECT 
            COUNT(DISTINCT eg.id) as total_groups,
            COUNT(DISTINCT ev.id) as total_variations,
            COUNT(DISTINCT er.id) as total_relationships
        FROM intelligence.entity_groups eg
        LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
        LEFT JOIN intelligence.entity_relationships er ON eg.id = er.source_group_id
    `);
    
    console.log('\n📊 NORMALIZATION REPORT');
    console.log('=' .repeat(50));
    console.log(`Total Entity Groups: ${stats.total_groups}`);
    console.log(`Total Variations: ${stats.total_variations}`);
    console.log(`Total Relationships: ${stats.total_relationships}`);
    console.log(`Noise Reduction: ${Math.round((1 - stats.total_groups / stats.total_variations) * 100)}%`);
    console.log('\nTop Grouped Entities:');
    
    const topGroups = groups
        .sort((a, b) => b.variations.length - a.variations.length)
        .slice(0, 10);
    
    topGroups.forEach(group => {
        console.log(`  - ${group.canonical}: ${group.variations.length} variations`);
    });
    
    console.log('\nTop Hierarchies:');
    Object.entries(hierarchies)
        .slice(0, 10)
        .forEach(([parent, children]) => {
            console.log(`  - ${parent} → ${children.length} children`);
        });
}

// Run if called directly
if (require.main === module) {
    normalizeEntities().catch(console.error);
}

module.exports = {
    EntityNormalizer,
    normalizeEntities,
    ENTITY_HIERARCHIES
};