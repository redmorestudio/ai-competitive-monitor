#!/usr/bin/env node

/**
 * Apply entity grouping rules to database
 */

const { db, end } = require('./postgres-db');
const { 
    SYNONYM_GROUPS, 
    HIERARCHICAL_GROUPS, 
    normalizeEntity, 
    suggestGroupings 
} = require('./entity-grouping-rules');

async function applyEntityGroupings() {
    try {
        console.log('Applying entity groupings to database...\n');
        
        // First, create the schema if it doesn't exist
        await createSchemaIfNeeded();
        
        // Get all unique entities from the database
        const allEntities = await getAllUniqueEntities();
        console.log(`Found ${allEntities.length} unique entities to process\n`);
        
        // Get grouping suggestions
        const groupings = suggestGroupings(allEntities);
        
        // Apply synonym merging
        console.log('=== APPLYING SYNONYM MERGES ===');
        let synonymCount = 0;
        for (const [canonical, items] of Object.entries(groupings.synonymsToMerge)) {
            const saved = await createSynonymGroup(canonical, items);
            if (saved) {
                synonymCount += items.length - 1; // -1 because canonical is included
                console.log(`✓ Merged ${items.length} variations of "${canonical}"`);
            }
        }
        console.log(`Total synonyms merged: ${synonymCount}\n`);
        
        // Create hierarchical groups
        console.log('=== CREATING HIERARCHICAL GROUPS ===');
        let hierarchicalCount = 0;
        for (const [parent, children] of Object.entries(groupings.hierarchicalGroups)) {
            const saved = await createHierarchicalGroup(parent, children);
            if (saved) {
                hierarchicalCount += children.length;
                console.log(`✓ Created hierarchy: ${parent} → ${children.length} children`);
            }
        }
        console.log(`Total hierarchical relationships: ${hierarchicalCount}\n`);
        
        // Report ungrouped entities
        console.log(`=== UNGROUPED ENTITIES: ${groupings.ungrouped.length} ===`);
        if (groupings.ungrouped.length > 0 && groupings.ungrouped.length < 50) {
            console.log(groupings.ungrouped.slice(0, 50).join(', '));
        }
        
        // Final statistics
        const stats = await getGroupingStats();
        console.log('\n=== FINAL STATISTICS ===');
        console.log(`Entity groups created: ${stats.totalGroups}`);
        console.log(`Total variations stored: ${stats.totalVariations}`);
        console.log(`Reduction achieved: ${allEntities.length} → ${stats.totalGroups} (${Math.round((1 - stats.totalGroups/allEntities.length) * 100)}% reduction)`);
        
    } catch (error) {
        console.error('Error applying groupings:', error);
        throw error;
    }
}

async function createSchemaIfNeeded() {
    // Check if tables exist
    const tablesExist = await db.get(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'intelligence'
        AND table_name IN ('entity_groups', 'entity_variations', 'entity_relationships')
    `);
    
    if (tablesExist.count < 3) {
        console.log('Creating entity normalization schema...');
        
        await db.run(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_groups (
                id SERIAL PRIMARY KEY,
                canonical_name VARCHAR(255) NOT NULL UNIQUE,
                group_type VARCHAR(50),
                description TEXT,
                auto_created BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by VARCHAR(100) DEFAULT 'system'
            );
        `);
        
        await db.run(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_variations (
                id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
                variation VARCHAR(255) NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                confidence FLOAT DEFAULT 1.0,
                source VARCHAR(50) DEFAULT 'manual',
                added_by VARCHAR(100),
                added_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(variation)
            );
        `);
        
        await db.run(`
            CREATE TABLE IF NOT EXISTS intelligence.entity_relationships (
                id SERIAL PRIMARY KEY,
                source_group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
                target_group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
                relationship_type VARCHAR(50),
                confidence FLOAT DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(source_group_id, target_group_id, relationship_type)
            );
        `);
        
        console.log('Schema created successfully\n');
    }
}

async function getAllUniqueEntities() {
    const result = await db.all(`
        WITH all_entity_arrays AS (
            SELECT 
                COALESCE(entities->'companies', '[]'::jsonb) ||
                COALESCE(entities->'products', '[]'::jsonb) ||
                COALESCE(entities->'people', '[]'::jsonb) ||
                COALESCE(entities->'organizations', '[]'::jsonb) ||
                COALESCE(entities->'technologies', '[]'::jsonb) ||
                COALESCE(entities->'methodologies', '[]'::jsonb) ||
                COALESCE(entities->'capabilities', '[]'::jsonb) ||
                COALESCE(entities->'concepts', '[]'::jsonb) ||
                COALESCE(entities->'standards', '[]'::jsonb) as all_items
            FROM intelligence.baseline_analysis
            WHERE entities IS NOT NULL
        ),
        extracted AS (
            SELECT DISTINCT 
                LOWER(
                    CASE 
                        WHEN jsonb_typeof(item) = 'object' THEN item->>'name'
                        ELSE item::text
                    END
                ) as entity
            FROM all_entity_arrays,
                 jsonb_array_elements(all_items) as item
        )
        SELECT entity
        FROM extracted
        WHERE entity IS NOT NULL
        AND entity != 'null'
        AND entity != '""'
        AND length(entity) > 1
        ORDER BY entity
    `);
    
    return result.map(r => r.entity.replace(/^"|"$/g, '')); // Remove quotes
}

async function createSynonymGroup(canonical, variations) {
    try {
        // Create or get the group
        let groupId;
        const existing = await db.get(`
            SELECT id FROM intelligence.entity_groups
            WHERE LOWER(canonical_name) = LOWER($1)
        `, [canonical]);
        
        if (existing) {
            groupId = existing.id;
        } else {
            const result = await db.get(`
                INSERT INTO intelligence.entity_groups 
                (canonical_name, group_type, auto_created, created_by)
                VALUES ($1, 'synonym', TRUE, 'grouping-rules')
                RETURNING id
            `, [canonical]);
            groupId = result.id;
        }
        
        // Add all variations
        for (const variation of variations) {
            await db.run(`
                INSERT INTO intelligence.entity_variations
                (group_id, variation, is_primary, source, confidence, added_by)
                VALUES ($1, $2, $3, 'known-synonym', 1.0, 'grouping-rules')
                ON CONFLICT (variation) DO UPDATE
                SET group_id = $1, confidence = 1.0, added_at = NOW()
            `, [groupId, variation.toLowerCase(), variation.toLowerCase() === canonical]);
        }
        
        return true;
    } catch (error) {
        console.error(`Error creating synonym group for ${canonical}:`, error.message);
        return false;
    }
}

async function createHierarchicalGroup(parent, children) {
    try {
        // Create parent group
        let parentGroupId;
        const existingParent = await db.get(`
            SELECT id FROM intelligence.entity_groups
            WHERE LOWER(canonical_name) = LOWER($1)
        `, [parent]);
        
        if (existingParent) {
            parentGroupId = existingParent.id;
        } else {
            const result = await db.get(`
                INSERT INTO intelligence.entity_groups 
                (canonical_name, group_type, auto_created, created_by)
                VALUES ($1, 'parent-concept', TRUE, 'grouping-rules')
                RETURNING id
            `, [parent]);
            parentGroupId = result.id;
        }
        
        // Create child groups and relationships
        for (const child of children) {
            // Create or get child group
            let childGroupId;
            const existingChild = await db.get(`
                SELECT id FROM intelligence.entity_groups
                WHERE LOWER(canonical_name) = LOWER($1)
            `, [child]);
            
            if (existingChild) {
                childGroupId = existingChild.id;
            } else {
                const result = await db.get(`
                    INSERT INTO intelligence.entity_groups 
                    (canonical_name, group_type, auto_created, created_by)
                    VALUES ($1, 'child-concept', TRUE, 'grouping-rules')
                    RETURNING id
                `, [child]);
                childGroupId = result.id;
                
                // Add the child as its own primary variation
                await db.run(`
                    INSERT INTO intelligence.entity_variations
                    (group_id, variation, is_primary, source, added_by)
                    VALUES ($1, $2, TRUE, 'hierarchical', 'grouping-rules')
                    ON CONFLICT (variation) DO NOTHING
                `, [childGroupId, child.toLowerCase()]);
            }
            
            // Create parent-child relationship
            await db.run(`
                INSERT INTO intelligence.entity_relationships
                (source_group_id, target_group_id, relationship_type, confidence)
                VALUES ($1, $2, 'parent', 1.0)
                ON CONFLICT (source_group_id, target_group_id, relationship_type) 
                DO UPDATE SET confidence = 1.0
            `, [parentGroupId, childGroupId]);
        }
        
        return true;
    } catch (error) {
        console.error(`Error creating hierarchical group for ${parent}:`, error.message);
        return false;
    }
}

async function getGroupingStats() {
    const stats = await db.get(`
        SELECT 
            (SELECT COUNT(*) FROM intelligence.entity_groups) as "totalGroups",
            (SELECT COUNT(*) FROM intelligence.entity_variations) as "totalVariations",
            (SELECT COUNT(*) FROM intelligence.entity_relationships) as "totalRelationships"
    `);
    
    return stats;
}

// Run if called directly
if (require.main === module) {
    applyEntityGroupings()
        .then(() => {
            console.log('\nEntity grouping complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed:', error);
            process.exit(1);
        })
        .finally(() => end());
}

module.exports = { applyEntityGroupings };
