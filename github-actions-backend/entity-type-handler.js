/**
 * Entity Type Handler
 * Different entity types need different normalization strategies
 */

class EntityTypeHandler {
    constructor() {
        this.strategies = {
            // Companies: Keep distinct, link products
            company: {
                shouldMerge: false,
                normalize: (name) => this.normalizeCompanyName(name),
                createRelationships: true,
                visualStyle: {
                    nodeSize: 'large',
                    color: '#1E88E5', // Blue
                    icon: '🏢'
                }
            },
            
            // Products: Keep distinct, link to companies
            product: {
                shouldMerge: false,
                normalize: (name) => name,
                linkToParent: 'company',
                visualStyle: {
                    nodeSize: 'medium',
                    color: '#43A047', // Green
                    icon: '📦'
                }
            },
            
            // Technologies: Merge synonyms aggressively
            technology: {
                shouldMerge: true,
                normalize: (name) => this.normalizeTechnologyName(name),
                createStacks: true,
                visualStyle: {
                    nodeSize: 'medium',
                    color: '#E53935', // Red
                    icon: '⚙️'
                }
            },
            
            // Concepts: Create hierarchies
            concept: {
                shouldMerge: true,
                normalize: (name) => this.normalizeConceptName(name),
                createHierarchy: true,
                visualStyle: {
                    nodeSize: 'medium',
                    color: '#FB8C00', // Orange
                    icon: '💡'
                }
            },
            
            // People: Keep distinct, link to companies
            person: {
                shouldMerge: false,
                normalize: (name) => this.normalizePersonName(name),
                linkToCompany: true,
                visualStyle: {
                    nodeSize: 'small',
                    color: '#8E24AA', // Purple
                    icon: '👤'
                }
            },
            
            // Standards: Merge variations
            standard: {
                shouldMerge: true,
                normalize: (name) => this.normalizeStandardName(name),
                visualStyle: {
                    nodeSize: 'small',
                    color: '#757575', // Grey
                    icon: '📋'
                }
            }
        };
    }
    
    normalizeCompanyName(name) {
        // Keep company names mostly as-is, just fix common issues
        return name
            .replace(/\s+(inc|llc|ltd|corp|corporation)\.?$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    normalizeTechnologyName(name) {
        // Aggressive normalization for technologies
        return name
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/\.js$/, 'js')
            .replace(/\+\+/, 'plusplus')
            .trim();
    }
    
    normalizeConceptName(name) {
        // Moderate normalization for concepts
        return name
            .toLowerCase()
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    normalizePersonName(name) {
        // Preserve person names carefully
        return name
            .split(' ')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    }
    
    normalizeStandardName(name) {
        // Keep acronyms uppercase
        return name.toUpperCase();
    }
    
    getStrategy(entityType) {
        return this.strategies[entityType] || this.strategies.concept;
    }
    
    shouldMergeEntities(type, entity1, entity2) {
        const strategy = this.getStrategy(type);
        if (!strategy.shouldMerge) return false;
        
        // Normalize both entities
        const norm1 = strategy.normalize(entity1);
        const norm2 = strategy.normalize(entity2);
        
        return norm1 === norm2;
    }
}

// SQL to identify entity types
const ENTITY_TYPE_QUERIES = {
    // Find all entity types and their counts
    getEntityTypeCounts: `
        SELECT 
            entity_type,
            COUNT(DISTINCT entity_name) as unique_entities,
            COUNT(*) as total_occurrences
        FROM (
            SELECT 'companies' as entity_type, jsonb_array_elements(entities->'companies') as entity_obj
            FROM intelligence.baseline_analysis WHERE entities->'companies' IS NOT NULL
            UNION ALL
            SELECT 'products', jsonb_array_elements(entities->'products')
            FROM intelligence.baseline_analysis WHERE entities->'products' IS NOT NULL
            UNION ALL
            SELECT 'technologies', jsonb_array_elements(entities->'technologies')
            FROM intelligence.baseline_analysis WHERE entities->'technologies' IS NOT NULL
            UNION ALL
            SELECT 'people', jsonb_array_elements(entities->'people')
            FROM intelligence.baseline_analysis WHERE entities->'people' IS NOT NULL
            UNION ALL
            SELECT 'concepts', jsonb_array_elements(entities->'concepts')
            FROM intelligence.baseline_analysis WHERE entities->'concepts' IS NOT NULL
            UNION ALL
            SELECT 'standards', jsonb_array_elements(entities->'standards')
            FROM intelligence.baseline_analysis WHERE entities->'standards' IS NOT NULL
        ) t
        CROSS JOIN LATERAL (
            SELECT CASE 
                WHEN jsonb_typeof(entity_obj) = 'object' THEN entity_obj->>'name'
                ELSE entity_obj::text
            END as entity_name
        ) e
        WHERE entity_name IS NOT NULL
        GROUP BY entity_type
        ORDER BY total_occurrences DESC
    `,
    
    // Update entity groups with proper types
    updateEntityTypes: `
        UPDATE intelligence.entity_groups g
        SET group_type = subq.entity_type
        FROM (
            SELECT DISTINCT
                LOWER(e.entity_name) as entity_lower,
                e.entity_type
            FROM (
                -- Similar union query as above
            ) e
        ) subq
        JOIN intelligence.entity_variations v ON LOWER(v.variation) = subq.entity_lower
        WHERE g.id = v.group_id
        AND g.group_type NOT IN ('company', 'synonym', 'parent-concept')
    `
};

module.exports = {
    EntityTypeHandler,
    ENTITY_TYPE_QUERIES
};
