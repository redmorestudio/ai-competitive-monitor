#!/usr/bin/env node

/**
 * Create entity normalization tables in PostgreSQL
 */

const { db, end } = require('./postgres-db');

async function createEntityNormalizationSchema() {
    console.log('Creating entity normalization schema...');
    
    try {
        // Create entity groups table
        await db.query(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_groups (
                id SERIAL PRIMARY KEY,
                canonical_name VARCHAR(255) NOT NULL,
                group_type VARCHAR(50),
                description TEXT,
                auto_created BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by VARCHAR(100) DEFAULT 'system'
            );
        `);
        console.log('✅ Created entity_groups table');
        
        // Create entity variations table
        await db.query(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_variations (
                id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
                variation VARCHAR(255) NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                confidence FLOAT DEFAULT 1.0,
                source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto', 'learned'
                added_by VARCHAR(100),
                added_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(variation)
            );
        `);
        console.log('✅ Created entity_variations table');
        
        // Create entity relationships table
        await db.query(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_relationships (
                id SERIAL PRIMARY KEY,
                source_group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
                target_group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
                relationship_type VARCHAR(50), -- 'parent', 'child', 'sibling', 'related'
                confidence FLOAT DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(source_group_id, target_group_id, relationship_type)
            );
        `);
        console.log('✅ Created entity_relationships table');
        
        // Create entity co-occurrences table for learning
        await db.query(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_cooccurrences (
                id SERIAL PRIMARY KEY,
                entity1 VARCHAR(255) NOT NULL,
                entity2 VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                context_type VARCHAR(50), -- 'page', 'paragraph', 'sentence'
                occurrences INTEGER DEFAULT 1,
                last_seen TIMESTAMP DEFAULT NOW(),
                UNIQUE(entity1, entity2, company, context_type)
            );
        `);
        console.log('✅ Created entity_cooccurrences table');
        
        // Create indexes
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_variations_group_id ON intelligence.entity_variations(group_id);
            CREATE INDEX IF NOT EXISTS idx_variations_variation ON intelligence.entity_variations(variation);
            CREATE INDEX IF NOT EXISTS idx_relationships_source ON intelligence.entity_relationships(source_group_id);
            CREATE INDEX IF NOT EXISTS idx_relationships_target ON intelligence.entity_relationships(target_group_id);
            CREATE INDEX IF NOT EXISTS idx_cooccurrences_entities ON intelligence.entity_cooccurrences(entity1, entity2);
        `);
        console.log('✅ Created indexes');
        
        // Insert some initial groups based on common patterns
        const initialGroups = [
            { name: 'Machine Learning', type: 'concept', variations: ['machine learning', 'ml', 'machine-learning'] },
            { name: 'Artificial Intelligence', type: 'concept', variations: ['artificial intelligence', 'ai', 'a.i.'] },
            { name: 'Large Language Models', type: 'concept', variations: ['large language model', 'llm', 'llms', 'large language models'] },
            { name: 'Natural Language Processing', type: 'concept', variations: ['natural language processing', 'nlp'] },
            { name: 'Computer Vision', type: 'concept', variations: ['computer vision', 'cv', 'vision ai'] },
            { name: 'Python', type: 'technology', variations: ['python', 'python3', 'py'] },
            { name: 'Graphics Processing Unit', type: 'hardware', variations: ['graphics processing unit', 'gpu', 'gpus'] }
        ];
        
        for (const group of initialGroups) {
            // Insert group
            const result = await db.get(`
                INSERT INTO intelligence.entity_groups (canonical_name, group_type, auto_created)
                VALUES ($1, $2, TRUE)
                ON CONFLICT DO NOTHING
                RETURNING id
            `, [group.name, group.type]);
            
            if (result) {
                // Insert variations
                for (let i = 0; i < group.variations.length; i++) {
                    await db.query(`
                        INSERT INTO intelligence.entity_variations (group_id, variation, is_primary, source)
                        VALUES ($1, $2, $3, 'initial')
                        ON CONFLICT (variation) DO NOTHING
                    `, [result.id, group.variations[i], i === 0]);
                }
                console.log(`✅ Created group: ${group.name}`);
            }
        }
        
        console.log('\n✅ Entity normalization schema created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating schema:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createEntityNormalizationSchema()
        .then(() => {
            console.log('\nDone!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed:', error);
            process.exit(1);
        })
        .finally(() => end());
}

module.exports = { createEntityNormalizationSchema };
