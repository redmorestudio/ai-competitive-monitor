#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Generate Dashboard JSON for PostgreSQL Version - FIXED INTEREST LEVELS
 * 
 * This version ensures interest levels match the actual data from changes table
 */

const fs = require('fs');
const path = require('path');
const { db, end } = require('./postgres-db');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to format relative time
function getRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    
    return then.toLocaleDateString();
}

// Generate dashboard.json with recent_changes_summary
async function generateDashboard() {
    console.log('🚀 Generating dashboard.json (PostgreSQL Version - FIXED INTEREST LEVELS)');
    console.log('=' .repeat(60));
    
    try {
        // FIXED: Get recent changes with CORRECT interest levels from changes table
        const recentChanges = await db.all(`
            SELECT 
                c.id as change_id,
                c.company,
                c.url,
                c.detected_at,
                c.interest_level,
                c.analysis,
                c.change_type
            FROM intelligence.changes c
            WHERE c.detected_at > NOW() - INTERVAL '7 days'
            ORDER BY c.detected_at DESC
            LIMIT 20
        `);

        // Filter to only show interest level >= 3 for the top 5
        const filteredRecentChanges = recentChanges
            .filter(c => c.interest_level >= 3)
            .slice(0, 5);

        // Get change counts for statistics
        const last24hCount = await db.get(`
            SELECT COUNT(*) as count
            FROM intelligence.changes
            WHERE detected_at > NOW() - INTERVAL '24 hours'
            AND interest_level >= 3
        `);

        const last7dCount = await db.get(`
            SELECT COUNT(*) as count
            FROM intelligence.changes
            WHERE detected_at > NOW() - INTERVAL '7 days'
            AND interest_level >= 3
        `);

        const highPriorityLast7d = await db.get(`
            SELECT COUNT(*) as count
            FROM intelligence.changes
            WHERE detected_at > NOW() - INTERVAL '7 days'
            AND interest_level >= 7
        `);

        // Get all companies
        const companies = await db.all(`
            SELECT DISTINCT c.id, c.name, c.category
            FROM intelligence.companies c
            ORDER BY c.name
        `);

        // Build the dashboard data structure
        const dashboardData = {
            // FIXED: Use actual interest levels from database
            recent_changes_summary: {
                last_5_changes: filteredRecentChanges.map(change => {
                    let summary = 'Change detected';
                    let aiAnalysis = {};
                    
                    // Parse analysis JSON if it exists
                    try {
                        if (change.analysis) {
                            if (typeof change.analysis === 'string') {
                                aiAnalysis = JSON.parse(change.analysis);
                            } else {
                                aiAnalysis = change.analysis;
                            }
                            // Handle new analysis structure with nested change_summary
                            if (aiAnalysis.change_summary && aiAnalysis.change_summary.what_changed) {
                                summary = aiAnalysis.change_summary.what_changed;
                            } else if (aiAnalysis.summary) {
                                summary = aiAnalysis.summary;
                            } else if (aiAnalysis.change_summary && typeof aiAnalysis.change_summary === 'string') {
                                summary = aiAnalysis.change_summary;
                            } else {
                                summary = 'Change detected';
                            }
                        }
                    } catch (e) {
                        console.log(`Could not parse analysis for change ${change.change_id}:`, e.message);
                    }
                    
                    // CRITICAL FIX: Use the ACTUAL interest level from the database
                    const actualInterestLevel = parseInt(change.interest_level) || 1;
                    
                    console.log(`Change ${change.change_id}: Company=${change.company}, InterestLevel=${actualInterestLevel}`);
                    
                    return {
                        change_id: change.change_id,
                        company: change.company,
                        url: change.url,
                        summary: summary,
                        interest_level: actualInterestLevel, // FIXED: Use actual value, not inflated
                        time_ago: getRelativeTime(change.detected_at),
                        detected_at: change.detected_at,
                        change_type: change.change_type
                    };
                }),
                last_24h_count: parseInt(last24hCount?.count || 0),
                last_7d_count: parseInt(last7dCount?.count || 0),
                high_priority_last_7d: parseInt(highPriorityLast7d?.count || 0)
            },
            companies: [],
            lastUpdated: new Date().toISOString(),
            totalChanges: 0,
            highInterestChanges: 0,
            backend: 'postgresql'
        };

        // Process each company
        for (const company of companies) {
            console.log(`Processing ${company.name}...`);
            
            // Get company URLs
            const urls = await db.all(`
                SELECT u.id, u.url, u.url_type
                FROM intelligence.urls u
                WHERE u.company_id = $1
                ORDER BY u.url
            `, [company.id]);

            // FIXED: Get recent changes with CORRECT interest levels
            const companyChanges = await db.all(`
                SELECT 
                    ch.id as change_id,
                    ch.url,
                    ch.company,
                    ch.detected_at,
                    ch.interest_level,
                    ch.analysis,
                    ch.change_type,
                    ea.business_impact,
                    ea.competitive_implications
                FROM intelligence.changes ch
                LEFT JOIN intelligence.enhanced_analysis ea ON ea.change_id = ch.id
                WHERE ch.company = $1
                AND ch.detected_at > NOW() - INTERVAL '30 days'
                ORDER BY ch.detected_at DESC
                LIMIT 10
            `, [company.name]);

            // Get baseline analysis data for this company
            const baselineAnalysis = await db.all(`
                SELECT 
                    entities,
                    key_topics,
                    technology_stack
                FROM intelligence.baseline_analysis
                WHERE company = $1
            `, [company.name]);

            // Extract intelligence data from baseline analysis
            let products = [];
            let ai_technologies = [];
            let ai_ml_concepts = [];

            for (const baseline of baselineAnalysis) {
                try {
                    // Parse entities JSONB
                    if (baseline.entities) {
                        const entities = typeof baseline.entities === 'string' 
                            ? JSON.parse(baseline.entities) 
                            : baseline.entities;
                        
                        // Extract products
                        if (entities.products && Array.isArray(entities.products)) {
                            products.push(...entities.products.map(p => p.name || p));
                        }
                        
                        // Extract technologies
                        if (entities.technologies && Array.isArray(entities.technologies)) {
                            ai_technologies.push(...entities.technologies.map(t => t.name || t));
                        }
                        
                        // Extract AI/ML concepts
                        if (entities.ai_ml_concepts && Array.isArray(entities.ai_ml_concepts)) {
                            ai_ml_concepts.push(...entities.ai_ml_concepts.map(c => c.concept || c.name || c));
                        }
                    }
                    
                    // Also check technology_stack field
                    if (baseline.technology_stack) {
                        try {
                            const techStack = typeof baseline.technology_stack === 'string'
                                ? JSON.parse(baseline.technology_stack)
                                : baseline.technology_stack;
                            if (Array.isArray(techStack)) {
                                ai_technologies.push(...techStack);
                            }
                        } catch (e) {
                            // If not JSON, treat as single value
                            if (baseline.technology_stack) {
                                ai_technologies.push(baseline.technology_stack);
                            }
                        }
                    }
                } catch (e) {
                    console.log(`Error parsing baseline data for ${company.name}:`, e.message);
                }
            }

            // Deduplicate arrays
            products = [...new Set(products)].filter(p => p && p.length > 0);
            ai_technologies = [...new Set(ai_technologies)].filter(t => t && t.length > 0);
            ai_ml_concepts = [...new Set(ai_ml_concepts)].filter(c => c && c.length > 0);

            // Build company data with intelligence
            const companyData = {
                id: company.id,
                name: company.name,
                category: company.category,
                urls: urls.map(u => ({
                    id: u.id,
                    url: u.url,
                    type: u.url_type,
                    checkFrequency: 'daily'
                })),
                recentChanges: companyChanges.map(ch => {
                    let summary = 'Change detected';
                    let aiAnalysis = {};
                    
                    try {
                        if (ch.analysis) {
                            if (typeof ch.analysis === 'string') {
                                aiAnalysis = JSON.parse(ch.analysis);
                            } else {
                                aiAnalysis = ch.analysis;
                            }
                            // Handle new analysis structure with nested change_summary
                            if (aiAnalysis.change_summary && aiAnalysis.change_summary.what_changed) {
                                summary = aiAnalysis.change_summary.what_changed;
                            } else if (aiAnalysis.summary) {
                                summary = aiAnalysis.summary;
                            } else if (aiAnalysis.change_summary && typeof aiAnalysis.change_summary === 'string') {
                                summary = aiAnalysis.change_summary;
                            } else {
                                summary = 'Change detected';
                            }
                        }
                    } catch (e) {
                        console.log(`Could not parse analysis for change ${ch.change_id}:`, e.message);
                    }
                    
                    // CRITICAL FIX: Use actual interest level from database
                    const actualInterestLevel = parseInt(ch.interest_level) || 0;
                    
                    return {
                        change_id: ch.change_id,
                        id: ch.change_id,
                        url: ch.url,
                        detectedAt: ch.detected_at,
                        relativeTime: getRelativeTime(ch.detected_at),
                        interestLevel: actualInterestLevel, // FIXED: Use actual value
                        summary: summary,
                        changeType: ch.change_type,
                        businessImpact: ch.business_impact,
                        competitiveImplications: ch.competitive_implications
                    };
                }),
                intelligence: {
                    products: products,
                    ai_technologies: ai_technologies,
                    ai_ml_concepts: ai_ml_concepts
                },
                stats: {
                    totalChanges: companyChanges.length,
                    highInterestChanges: companyChanges.filter(ch => (parseInt(ch.interest_level) || 0) >= 7).length,
                    lastActivity: companyChanges[0]?.detected_at || null
                }
            };

            dashboardData.companies.push(companyData);
            dashboardData.totalChanges += companyChanges.length;
            dashboardData.highInterestChanges += companyData.stats.highInterestChanges;
        }

        // Get company activity summary
        const companyActivity = await db.all(`
            SELECT 
                c.name,
                COUNT(ch.id) as change_count,
                MAX(ch.interest_level) as max_interest,
                MAX(ch.detected_at) as last_change
            FROM intelligence.companies c
            LEFT JOIN intelligence.changes ch ON ch.company = c.name
            WHERE ch.detected_at > NOW() - INTERVAL '7 days'
            GROUP BY c.name
            HAVING COUNT(ch.id) > 0
            ORDER BY change_count DESC
            LIMIT 10
        `);

        dashboardData.company_activity = companyActivity.map(ca => ({
            company_name: ca.name,
            change_count: parseInt(ca.change_count),
            max_interest_level: parseInt(ca.max_interest) || 0, // Ensure this is parsed correctly
            last_activity: ca.last_change,
            relative_time: getRelativeTime(ca.last_change)
        }));

        // Write dashboard.json
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'dashboard.json'),
            JSON.stringify(dashboardData, null, 2)
        );

        console.log(`✅ Generated dashboard.json with ${dashboardData.companies.length} companies`);
        console.log(`   Recent changes: ${dashboardData.recent_changes_summary.last_5_changes.length}`);
        console.log(`   Total changes: ${dashboardData.totalChanges}`);
        console.log(`   High interest: ${dashboardData.highInterestChanges}`);

    } catch (error) {
        console.error('❌ Error generating dashboard:', error);
        process.exit(1);
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    generateDashboard().catch(console.error);
}

module.exports = { generateDashboard };
