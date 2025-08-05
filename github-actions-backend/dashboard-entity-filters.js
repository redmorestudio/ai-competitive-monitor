/**
 * Dashboard Entity Filter Configuration
 * Controls what entities are shown based on significance and type
 */

const DASHBOARD_FILTERS = {
    // Always show these (your monitored companies)
    alwaysShow: {
        companies: 'is_monitored = TRUE',
        significance: 100
    },
    
    // Significance thresholds by type
    significanceThresholds: {
        company: {
            // Show if mentioned by at least 10% of sources OR mentioned 5+ times
            minSourcePercentage: 10,
            minMentions: 5,
            description: "Only show companies mentioned frequently or by multiple sources"
        },
        
        product: {
            // More lenient for products - show if mentioned 3+ times
            minSourcePercentage: 5,
            minMentions: 3,
            description: "Show products that appear multiple times"
        },
        
        person: {
            // Very restrictive for people - only show if really prominent
            minSourcePercentage: 20,
            minMentions: 10,
            description: "Only show very prominent people (CEOs, founders)"
        },
        
        technology: {
            // Always show technologies
            minSourcePercentage: 0,
            minMentions: 1,
            description: "Show all technologies for competitive analysis"
        },
        
        concept: {
            // Always show concepts
            minSourcePercentage: 0,
            minMentions: 1,
            description: "Show all AI/ML concepts"
        }
    },
    
    // UI Controls
    dashboardSettings: {
        defaultFilters: {
            showCompanies: true,
            showProducts: true,
            showPeople: false,  // Hidden by default
            showTechnologies: true,
            showConcepts: true,
            minSignificance: 20  // Adjustable slider
        },
        
        grouping: {
            // Group by source context
            bySource: true,
            showSourceIndicator: true,  // "Found on: OpenAI, Anthropic, Meta"
            
            // Visual indicators
            monitoredCompanyStyle: {
                border: '2px solid gold',
                icon: '⭐'
            },
            mentionedCompanyStyle: {
                opacity: 0.8,
                fontSize: 'smaller'
            }
        }
    }
};

// SQL to create smart filtering
const ENTITY_FILTER_QUERIES = {
    // Mark monitored companies
    markMonitoredCompanies: `
        UPDATE intelligence.entity_groups g
        SET is_monitored = TRUE
        FROM (
            SELECT DISTINCT LOWER(company) as company_lower
            FROM intelligence.baseline_analysis
        ) monitored
        WHERE LOWER(g.canonical_name) = monitored.company_lower
        AND g.group_type = 'company'
    `,
    
    // Calculate mention statistics
    calculateMentionStats: `
        WITH mention_stats AS (
            SELECT 
                entity_type,
                LOWER(entity_name) as entity_lower,
                COUNT(DISTINCT source_company) as source_count,
                COUNT(*) as total_mentions,
                ARRAY_AGG(DISTINCT source_company) as mentioned_by
            FROM (
                -- Similar to previous query but captures source
                SELECT 
                    ba.company as source_company,
                    t.entity_type,
                    t.entity_name
                FROM intelligence.baseline_analysis ba
                CROSS JOIN LATERAL (
                    -- Extract all entity types
                    SELECT 'company' as entity_type, 
                           jsonb_array_elements_text(entities->'companies') as entity_name
                    WHERE entities->'companies' IS NOT NULL
                    UNION ALL
                    SELECT 'product', jsonb_array_elements_text(entities->'products')
                    WHERE entities->'products' IS NOT NULL
                    -- etc for other types
                ) t
            ) all_mentions
            GROUP BY entity_type, entity_lower
        )
        UPDATE intelligence.entity_groups g
        SET 
            mention_count = ms.total_mentions,
            mentioned_by_count = ms.source_count,
            source_companies = ms.mentioned_by,
            significance_score = 
                CASE 
                    WHEN g.is_monitored THEN 100
                    WHEN g.group_type = 'technology' THEN 80  -- Always significant
                    WHEN g.group_type = 'concept' THEN 80     -- Always significant
                    ELSE 
                        -- Calculate based on mentions and sources
                        LEAST(100, 
                            (ms.source_count * 100.0 / $1) +  -- Percentage of sources
                            CASE 
                                WHEN ms.total_mentions >= 10 THEN 20
                                WHEN ms.total_mentions >= 5 THEN 10
                                ELSE 5
                            END
                        )
                END
        FROM mention_stats ms
        WHERE LOWER(g.canonical_name) = ms.entity_lower
    `,
    
    // Get entities for dashboard with context
    getDashboardEntities: `
        SELECT 
            g.id,
            g.canonical_name,
            g.group_type,
            g.is_monitored,
            g.significance_score,
            g.mention_count,
            g.mentioned_by_count,
            g.source_companies,
            CASE 
                WHEN g.is_monitored THEN 'monitored'
                WHEN g.mentioned_by_count >= 5 THEN 'widely_mentioned'
                WHEN g.mentioned_by_count >= 2 THEN 'mentioned'
                ELSE 'rare'
            END as mention_category,
            -- Include variations for display
            ARRAY_AGG(DISTINCT v.variation) as variations
        FROM intelligence.entity_groups g
        LEFT JOIN intelligence.entity_variations v ON g.id = v.group_id
        WHERE 
            -- Always show monitored
            g.is_monitored = TRUE
            OR (
                -- Apply type-specific filters
                CASE g.group_type
                    WHEN 'company' THEN 
                        g.mentioned_by_count >= 3 OR g.mention_count >= 5
                    WHEN 'product' THEN 
                        g.mention_count >= 3
                    WHEN 'person' THEN 
                        g.mentioned_by_count >= 5 AND g.mention_count >= 10
                    WHEN 'technology' THEN 
                        TRUE  -- Always show
                    WHEN 'concept' THEN 
                        TRUE  -- Always show
                    ELSE 
                        g.significance_score >= 20
                END
            )
        GROUP BY g.id
        ORDER BY 
            g.is_monitored DESC,
            g.significance_score DESC,
            g.canonical_name
    `
};

module.exports = {
    DASHBOARD_FILTERS,
    ENTITY_FILTER_QUERIES
};
