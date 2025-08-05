/**
 * Entity Visualization Strategy
 * Different views for different purposes
 */

const VISUALIZATION_MODES = {
    // Mode 1: Company Detail View (See everything on one website)
    companyDetail: {
        name: "Company Partnership View",
        description: "See ALL entities mentioned on a specific company's website",
        filters: {
            // No filtering - show everything
            showAll: true,
            groupByType: true,
            showChanges: true
        },
        usage: [
            "Track partnership evolution",
            "Spot new company mentions",
            "See dropped partnerships",
            "Understand company focus"
        ],
        ui: {
            layout: "categorized-list",
            highlights: {
                new: { color: "green", icon: "🆕" },       // New this week
                removed: { color: "red", icon: "❌" },     // No longer mentioned
                stable: { color: "gray", icon: "" }        // Ongoing mention
            }
        }
    },
    
    // Mode 2: 3D Force Graph (Filtered for clarity)
    forceGraph: {
        name: "Network Visualization",
        description: "See significant relationships only",
        filters: {
            minSignificance: 30,
            rules: [
                "Always show monitored companies",
                "Show companies mentioned by 3+ sources",
                "Show top 20% most mentioned entities",
                "Always show technologies",
                "Hide individual people unless CEO/Founder"
            ]
        },
        nodeSize: {
            monitored: 20,        // Your tracked companies
            significant: 10,      // Frequently mentioned
            technology: 8,        // Tech/frameworks
            other: 5             // Everything else
        },
        edgeRules: {
            // Only show edges for significant relationships
            minMentions: 3,
            showTypes: ["uses", "partners", "competes", "owns"]
        }
    },
    
    // Mode 3: Competitive Landscape (Cross-company view)
    competitiveLandscape: {
        name: "Competitive Intelligence",
        description: "Compare entity mentions across companies",
        features: {
            matrix: {
                rows: "monitored_companies",
                columns: "mentioned_entities",
                cells: "mention_count"
            },
            insights: [
                "Which companies everyone mentions (Microsoft, Google)",
                "Unique partnerships (only mentioned by one)",
                "Emerging trends (newly mentioned by multiple)"
            ]
        }
    },
    
    // Mode 4: Change Timeline
    changeTimeline: {
        name: "Partnership Evolution",
        description: "Track entity changes over time",
        views: {
            daily: "New/removed entities each day",
            weekly: "Week-over-week changes",
            monthly: "Long-term partnership trends"
        },
        alerts: [
            "New competitor mentioned",
            "Partnership apparently ended",
            "Technology adoption (new tech mentioned)",
            "Market shift (multiple companies mention same new entity)"
        ]
    }
};

// SQL Views for each mode
const VISUALIZATION_QUERIES = {
    // Get all entities for a specific company (Mode 1)
    getCompanyEntities: `
        WITH current_week AS (
            SELECT DISTINCT entity_type, entity_name
            FROM intelligence.website_entity_view
            WHERE source_company = $1
            AND last_seen >= CURRENT_DATE - INTERVAL '7 days'
        ),
        previous_week AS (
            SELECT DISTINCT entity_type, entity_name
            FROM intelligence.website_entity_view
            WHERE source_company = $1
            AND first_seen <= CURRENT_DATE - INTERVAL '7 days'
            AND last_seen >= CURRENT_DATE - INTERVAL '14 days'
        )
        SELECT 
            cw.entity_type,
            cw.entity_name,
            CASE 
                WHEN pw.entity_name IS NULL THEN 'new'
                ELSE 'stable'
            END as status,
            wev.mention_count,
            wev.first_seen,
            wev.last_seen
        FROM current_week cw
        LEFT JOIN previous_week pw USING (entity_type, entity_name)
        LEFT JOIN intelligence.website_entity_view wev 
            ON cw.entity_name = wev.entity_name 
            AND cw.entity_type = wev.entity_type
            AND wev.source_company = $1
        
        UNION ALL
        
        -- Removed entities
        SELECT 
            pw.entity_type,
            pw.entity_name,
            'removed' as status,
            0 as mention_count,
            wev.first_seen,
            wev.last_seen
        FROM previous_week pw
        LEFT JOIN current_week cw USING (entity_type, entity_name)
        LEFT JOIN intelligence.website_entity_view wev 
            ON pw.entity_name = wev.entity_name 
            AND pw.entity_type = wev.entity_type
            AND wev.source_company = $1
        WHERE cw.entity_name IS NULL
        
        ORDER BY entity_type, status DESC, mention_count DESC
    `,
    
    // Get filtered entities for 3D graph (Mode 2)
    getGraphEntities: `
        SELECT * FROM intelligence.graph_entities
        WHERE graph_weight >= 30
        ORDER BY graph_weight DESC
        LIMIT 200  -- Cap for performance
    `,
    
    // Get competitive matrix (Mode 3)
    getCompetitiveMatrix: `
        SELECT 
            source_company,
            entity_name,
            entity_type,
            mention_count,
            COUNT(*) OVER (PARTITION BY entity_name) as mentioned_by_count
        FROM intelligence.website_entity_view
        WHERE entity_type = 'company'
        AND source_company IN (
            SELECT DISTINCT company 
            FROM intelligence.baseline_analysis
        )
        ORDER BY mentioned_by_count DESC, entity_name
    `
};

module.exports = {
    VISUALIZATION_MODES,
    VISUALIZATION_QUERIES
};
