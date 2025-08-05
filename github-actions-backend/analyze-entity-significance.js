#!/usr/bin/env node

/**
 * Entity Significance Analyzer
 * Distinguishes between monitored entities and mentions
 * Calculates significance scores for filtering
 */

const { db, end } = require('./postgres-db');

async function analyzeEntitySignificance() {
    try {
        console.log('Analyzing entity significance and context...\n');
        
        // Step 1: Get monitored companies (the ones we actually track)
        const monitoredCompanies = await db.all(`
            SELECT DISTINCT company 
            FROM intelligence.baseline_analysis
            ORDER BY company
        `);
        
        console.log('Monitored Companies (actively tracking):');
        monitoredCompanies.forEach(c => console.log(`  - ${c.company}`));
        console.log();
        
        // Step 2: Analyze mentioned companies with frequency
        const mentionedCompanies = await db.all(`
            WITH company_mentions AS (
                SELECT 
                    source.company as source_company,
                    LOWER(
                        CASE WHEN jsonb_typeof(entity_obj) = 'object' 
                             THEN entity_obj->>'name'
                             ELSE trim(both '"' from entity_obj::text)
                        END
                    ) as mentioned_company,
                    COUNT(*) as mention_count
                FROM intelligence.baseline_analysis source,
                     jsonb_array_elements(entities->'companies') as entity_obj
                WHERE entities->'companies' IS NOT NULL
                GROUP BY source.company, mentioned_company
            ),
            company_totals AS (
                SELECT 
                    mentioned_company,
                    COUNT(DISTINCT source_company) as mentioned_by_count,
                    SUM(mention_count) as total_mentions
                FROM company_mentions
                WHERE mentioned_company IS NOT NULL
                GROUP BY mentioned_company
            )
            SELECT 
                mentioned_company,
                mentioned_by_count,
                total_mentions,
                ROUND(100.0 * mentioned_by_count / ${monitoredCompanies.length}, 1) as pct_sources_mentioning
            FROM company_totals
            ORDER BY total_mentions DESC
            LIMIT 30
        `);
        
        console.log('Top 30 Most Mentioned Companies:');
        console.log('Company | Mentioned By | Total Mentions | % Sources');
        console.log('--------|--------------|----------------|----------');
        mentionedCompanies.forEach(c => {
            console.log(
                `${c.mentioned_company.padEnd(30)} | ${
                    c.mentioned_by_count.toString().padStart(12)
                } | ${
                    c.total_mentions.toString().padStart(14)
                } | ${
                    c.pct_sources_mentioning.toString().padStart(8)
                }%`
            );
        });
        
        // Step 3: Create significance scoring
        console.log('\n\nCreating entity significance scores...');
        
        // Add significance metadata to entity groups
        await db.run(`
            ALTER TABLE intelligence.entity_groups 
            ADD COLUMN IF NOT EXISTS is_monitored BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS mention_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS mentioned_by_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS significance_score FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_calculated TIMESTAMP DEFAULT NOW()
        `);
        
        // Update monitored status
        for (const company of monitoredCompanies) {
            await db.run(`
                UPDATE intelligence.entity_groups
                SET is_monitored = TRUE
                WHERE LOWER(canonical_name) = LOWER($1)
                AND group_type = 'company'
            `, [company.company]);
        }
        
        // Calculate significance scores for all entities
        await db.run(`
            WITH entity_stats AS (
                SELECT 
                    entity_type,
                    LOWER(entity_name) as entity_lower,
                    COUNT(DISTINCT source_company) as mentioned_by,
                    COUNT(*) as total_mentions
                FROM (
                    -- Companies
                    SELECT 
                        ba.company as source_company,
                        'company' as entity_type,
                        CASE WHEN jsonb_typeof(entity_obj) = 'object' 
                             THEN entity_obj->>'name'
                             ELSE trim(both '"' from entity_obj::text)
                        END as entity_name
                    FROM intelligence.baseline_analysis ba,
                         jsonb_array_elements(entities->'companies') as entity_obj
                    WHERE entities->'companies' IS NOT NULL
                    
                    UNION ALL
                    
                    -- Products
                    SELECT 
                        ba.company as source_company,
                        'product' as entity_type,
                        CASE WHEN jsonb_typeof(entity_obj) = 'object' 
                             THEN entity_obj->>'name'
                             ELSE trim(both '"' from entity_obj::text)
                        END as entity_name
                    FROM intelligence.baseline_analysis ba,
                         jsonb_array_elements(entities->'products') as entity_obj
                    WHERE entities->'products' IS NOT NULL
                    
                    -- Add other types as needed
                ) all_entities
                WHERE entity_name IS NOT NULL
                GROUP BY entity_type, entity_lower
            )
            UPDATE intelligence.entity_groups g
            SET 
                mention_count = COALESCE(es.total_mentions, 0),
                mentioned_by_count = COALESCE(es.mentioned_by, 0),
                significance_score = 
                    CASE 
                        WHEN g.is_monitored THEN 100  -- Monitored companies always significant
                        ELSE 
                            -- Score based on mentions and sources
                            LEAST(100, 
                                (COALESCE(es.mentioned_by, 0) * 10) +  -- 10 points per source
                                (LN(COALESCE(es.total_mentions, 1)) * 5)  -- Log scale for total mentions
                            )
                    END,
                last_calculated = NOW()
            FROM entity_stats es
            WHERE LOWER(g.canonical_name) = es.entity_lower
        `);
        
        // Step 4: Show significance distribution
        const distribution = await db.all(`
            SELECT 
                group_type,
                COUNT(*) as total_entities,
                COUNT(*) FILTER (WHERE is_monitored) as monitored,
                COUNT(*) FILTER (WHERE significance_score >= 50) as high_significance,
                COUNT(*) FILTER (WHERE significance_score >= 20 AND significance_score < 50) as medium_significance,
                COUNT(*) FILTER (WHERE significance_score < 20) as low_significance,
                ROUND(AVG(significance_score), 1) as avg_score
            FROM intelligence.entity_groups
            WHERE group_type IN ('company', 'product', 'person')
            GROUP BY group_type
            ORDER BY total_entities DESC
        `);
        
        console.log('\nEntity Significance Distribution:');
        console.log('Type     | Total | Monitored | High Sig | Med Sig | Low Sig | Avg Score');
        console.log('---------|-------|-----------|----------|---------|---------|----------');
        distribution.forEach(d => {
            console.log(
                `${(d.group_type || 'unknown').padEnd(8)} | ${
                    d.total_entities.toString().padStart(5)
                } | ${
                    d.monitored.toString().padStart(9)
                } | ${
                    d.high_significance.toString().padStart(8)
                } | ${
                    d.medium_significance.toString().padStart(7)
                } | ${
                    d.low_significance.toString().padStart(7)
                } | ${
                    d.avg_score.toString().padStart(9)
                }`
            );
        });
        
        // Step 5: Create filtered views for dashboard
        console.log('\n\nCreating filtered views...');
        
        // View for significant entities only
        await db.run(`
            CREATE OR REPLACE VIEW intelligence.significant_entities AS
            SELECT 
                g.*,
                CASE 
                    WHEN g.is_monitored THEN 'monitored'
                    WHEN g.significance_score >= 50 THEN 'high'
                    WHEN g.significance_score >= 20 THEN 'medium'
                    ELSE 'low'
                END as significance_level
            FROM intelligence.entity_groups g
            WHERE g.is_monitored = TRUE  -- Always show monitored
               OR g.significance_score >= 20  -- Show medium+ significance
               OR g.group_type NOT IN ('company', 'person', 'product')  -- Always show tech/concepts
        `);
        
        // Stats
        const filtered = await db.get(`
            SELECT 
                COUNT(*) as total_entities,
                COUNT(*) FILTER (WHERE is_monitored) as monitored_entities,
                COUNT(*) FILTER (WHERE NOT is_monitored AND significance_score >= 20) as significant_mentions
            FROM intelligence.entity_groups
        `);
        
        console.log('\nFiltering Summary:');
        console.log(`Total entities: ${filtered.total_entities}`);
        console.log(`Monitored (always show): ${filtered.monitored_entities}`);
        console.log(`Significant mentions (show): ${filtered.significant_mentions}`);
        console.log(`Hidden low-significance: ${filtered.total_entities - filtered.monitored_entities - filtered.significant_mentions}`);
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    analyzeEntitySignificance()
        .then(() => {
            console.log('\nEntity significance analysis complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed:', error);
            process.exit(1);
        })
        .finally(() => end());
}

module.exports = { analyzeEntitySignificance };
