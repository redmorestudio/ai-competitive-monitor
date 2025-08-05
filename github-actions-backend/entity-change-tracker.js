#!/usr/bin/env node

/**
 * Entity Change Tracker
 * Monitors which entities appear/disappear from company websites over time
 */

const { db, end } = require('./postgres-db');

async function createChangeTrackingSystem() {
    try {
        console.log('Creating entity change tracking system...\n');
        
        // Create historical tracking tables
        await db.run(`
            -- Track entity mentions over time
            CREATE TABLE IF NOT EXISTS intelligence.entity_mention_history (
                id SERIAL PRIMARY KEY,
                source_company VARCHAR(255) NOT NULL,
                entity_name VARCHAR(255) NOT NULL,
                entity_type VARCHAR(50),
                first_seen DATE NOT NULL,
                last_seen DATE NOT NULL,
                days_active INTEGER GENERATED ALWAYS AS (last_seen - first_seen + 1) STORED,
                is_current BOOLEAN DEFAULT TRUE,
                mention_count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            -- Track daily snapshots
            CREATE TABLE IF NOT EXISTS intelligence.entity_daily_snapshots (
                id SERIAL PRIMARY KEY,
                snapshot_date DATE NOT NULL,
                source_company VARCHAR(255) NOT NULL,
                entity_counts JSONB NOT NULL, -- {companies: 45, products: 23, ...}
                new_entities JSONB, -- Entities that appeared today
                removed_entities JSONB, -- Entities that disappeared
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(snapshot_date, source_company)
            );
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_mention_history_source 
                ON intelligence.entity_mention_history(source_company, entity_type);
            CREATE INDEX IF NOT EXISTS idx_mention_history_dates 
                ON intelligence.entity_mention_history(first_seen, last_seen);
            CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date 
                ON intelligence.entity_daily_snapshots(snapshot_date, source_company);
        `);
        
        console.log('✓ Created tracking tables\n');
        
        // Analyze current state vs history
        const changes = await analyzeEntityChanges();
        
        // Create view for website-specific entity lists
        await db.run(`
            CREATE OR REPLACE VIEW intelligence.website_entity_view AS
            WITH current_entities AS (
                SELECT 
                    ba.company as source_company,
                    ba.scraped_at::date as scrape_date,
                    'company' as entity_type,
                    jsonb_array_elements_text(entities->'companies') as entity_name
                FROM intelligence.baseline_analysis ba
                WHERE entities->'companies' IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    ba.company as source_company,
                    ba.scraped_at::date as scrape_date,
                    'product' as entity_type,
                    jsonb_array_elements_text(entities->'products') as entity_name
                FROM intelligence.baseline_analysis ba
                WHERE entities->'products' IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    ba.company as source_company,
                    ba.scraped_at::date as scrape_date,
                    'technology' as entity_type,
                    jsonb_array_elements_text(entities->'technologies') as entity_name
                FROM intelligence.baseline_analysis ba
                WHERE entities->'technologies' IS NOT NULL
            )
            SELECT 
                source_company,
                entity_type,
                entity_name,
                COUNT(*) as mention_count,
                MAX(scrape_date) as last_seen,
                MIN(scrape_date) as first_seen
            FROM current_entities
            GROUP BY source_company, entity_type, entity_name
        `);
        
        console.log('✓ Created website entity view\n');
        
        // Create filtered views for visualizations
        await db.run(`
            -- For 3D force graph - only significant relationships
            CREATE OR REPLACE VIEW intelligence.graph_entities AS
            SELECT DISTINCT
                g.id,
                g.canonical_name,
                g.group_type,
                g.is_monitored,
                g.significance_score,
                CASE 
                    WHEN g.is_monitored THEN 1000  -- Monitored companies always shown
                    WHEN g.mention_count >= 10 THEN 100  -- Very frequently mentioned
                    WHEN g.mentioned_by_count >= 5 THEN 50  -- Mentioned by many sources
                    WHEN g.group_type IN ('technology', 'concept') THEN 30  -- Tech always relevant
                    ELSE 10
                END as graph_weight
            FROM intelligence.entity_groups g
            WHERE 
                g.is_monitored = TRUE  -- Always show monitored
                OR g.mentioned_by_count >= 3  -- Mentioned by 3+ companies
                OR g.mention_count >= 10  -- Mentioned 10+ times
                OR g.group_type IN ('technology', 'concept')  -- Always show tech
                OR g.significance_score >= 30  -- Above threshold
        `);
        
        console.log('✓ Created graph filtering view\n');
        
        return changes;
        
    } catch (error) {
        console.error('Error creating tracking system:', error);
        throw error;
    }
}

async function analyzeEntityChanges() {
    // Get recent changes
    const recentChanges = await db.all(`
        WITH yesterday_entities AS (
            SELECT DISTINCT 
                company,
                jsonb_array_elements_text(entities->'companies') as entity_name
            FROM intelligence.baseline_analysis
            WHERE scraped_at::date = CURRENT_DATE - INTERVAL '1 day'
        ),
        today_entities AS (
            SELECT DISTINCT 
                company,
                jsonb_array_elements_text(entities->'companies') as entity_name
            FROM intelligence.baseline_analysis
            WHERE scraped_at::date = CURRENT_DATE
        ),
        new_entities AS (
            SELECT 
                t.company,
                t.entity_name,
                'new' as change_type
            FROM today_entities t
            LEFT JOIN yesterday_entities y 
                ON t.company = y.company AND t.entity_name = y.entity_name
            WHERE y.entity_name IS NULL
        ),
        removed_entities AS (
            SELECT 
                y.company,
                y.entity_name,
                'removed' as change_type
            FROM yesterday_entities y
            LEFT JOIN today_entities t 
                ON y.company = t.company AND y.entity_name = t.entity_name
            WHERE t.entity_name IS NULL
        )
        SELECT * FROM new_entities
        UNION ALL
        SELECT * FROM removed_entities
        ORDER BY company, change_type, entity_name
    `);
    
    if (recentChanges.length > 0) {
        console.log('=== Recent Entity Changes ===');
        let currentCompany = '';
        recentChanges.forEach(change => {
            if (change.company !== currentCompany) {
                currentCompany = change.company;
                console.log(`\n${currentCompany}:`);
            }
            console.log(`  ${change.change_type === 'new' ? '+' : '-'} ${change.entity_name}`);
        });
        console.log();
    }
    
    return recentChanges;
}

async function generateChangeReport(company, days = 30) {
    const report = await db.all(`
        WITH date_series AS (
            SELECT generate_series(
                CURRENT_DATE - INTERVAL '${days} days',
                CURRENT_DATE,
                '1 day'::interval
            )::date as date
        ),
        daily_entities AS (
            SELECT 
                ds.date,
                COUNT(DISTINCT entity_name) as entity_count,
                jsonb_agg(DISTINCT entity_name) as entities
            FROM date_series ds
            LEFT JOIN intelligence.baseline_analysis ba 
                ON ba.scraped_at::date = ds.date 
                AND ba.company = $1
            LEFT JOIN LATERAL jsonb_array_elements_text(ba.entities->'companies') as entity_name ON true
            GROUP BY ds.date
        )
        SELECT 
            date,
            entity_count,
            LAG(entity_count) OVER (ORDER BY date) as prev_count,
            entity_count - LAG(entity_count) OVER (ORDER BY date) as change
        FROM daily_entities
        ORDER BY date DESC
        LIMIT 7
    `, [company]);
    
    console.log(`\n=== ${company} Partnership Changes (Last 7 Days) ===`);
    report.forEach(day => {
        if (day.change !== null) {
            const changeStr = day.change > 0 ? `+${day.change}` : `${day.change}`;
            const emoji = day.change > 0 ? '📈' : day.change < 0 ? '📉' : '➡️';
            console.log(`${day.date}: ${day.entity_count} companies (${changeStr} ${emoji})`);
        }
    });
}

// Run if called directly
if (require.main === module) {
    createChangeTrackingSystem()
        .then(async () => {
            // Example: Show changes for a specific company
            await generateChangeReport('OpenAI');
            await generateChangeReport('Anthropic');
            
            console.log('\nChange tracking system created successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed:', error);
            process.exit(1);
        })
        .finally(() => end());
}

module.exports = { createChangeTrackingSystem, analyzeEntityChanges, generateChangeReport };
