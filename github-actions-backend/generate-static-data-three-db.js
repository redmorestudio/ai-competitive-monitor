#!/usr/bin/env node

/**
 * Generate Static Data Files for GitHub Pages
 * 
 * This script converts our dynamic API into static JSON files
 * that can be served by GitHub Pages and consumed by the frontend
 */

const fs = require('fs');
const path = require('path');
const dbManager = require('./db-manager');
const { deduplicatePreservingCase } = require('./normalize-keywords');

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to deduplicate arrays by name property
function deduplicateByName(arr) {
    const seen = new Set();
    return arr.filter(item => {
        const key = item.name || JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Helper function to get top entities for a company
function getTopEntities(intelligenceDb, companyId, entityType, limit = 3) {
    try {
        // Get latest analysis for company
        const analyses = intelligenceDb.prepare(`
            SELECT ba.entities
            FROM baseline_analysis ba
            JOIN urls u ON ba.url_id = u.id
            WHERE u.company_id = ?
            ORDER BY ba.created_at DESC
            LIMIT 5
        `).all(companyId);
        
        const allEntities = [];
        for (const analysis of analyses) {
            try {
                const entities = JSON.parse(analysis.entities || '{}');
                if (entities[entityType]) {
                    allEntities.push(...entities[entityType]);
                }
            } catch (e) {
                // Skip parse errors
            }
        }
        
        // Deduplicate and return top N
        const unique = deduplicateByName(allEntities);
        const stringEntities = unique.map(e => e.name || e.concept || e.partner_name || 'Unknown');
        // Apply case-insensitive deduplication to the string array
        return deduplicatePreservingCase(stringEntities).slice(0, limit);
    } catch (error) {
        return [];
    }
}

// Helper function to get latest change for a company
function getLatestChange(processedDb, intelligenceDb, companyId) {
    try {
        // Attach intelligence database
        const intelligenceDbPath = path.join(DATA_DIR, 'intelligence.db');
        processedDb.exec(`ATTACH DATABASE '${intelligenceDbPath}' AS intelligence`);
        
        const change = processedDb.prepare(`
            SELECT 
                cd.detected_at,
                cd.summary,
                cd.relevance_score
            FROM change_detection cd
            JOIN intelligence.urls u ON cd.url_id = u.id
            WHERE u.company_id = ?
            ORDER BY cd.detected_at DESC
            LIMIT 1
        `).get(companyId);
        
        processedDb.exec('DETACH DATABASE intelligence');
        
        if (change) {
            return {
                summary: change.summary,
                time_ago: getRelativeTime(change.detected_at),
                relevance_score: change.relevance_score
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Helper function to get average interest level (or max if new data available)
function getMaxInterestLevel(intelligenceDb, companyId) {
    try {
        // First check if we have new interest_assessment data
        const newDataCheck = intelligenceDb.prepare(`
            SELECT ba.competitive_data
            FROM baseline_analysis ba
            JOIN urls u ON ba.url_id = u.id
            WHERE u.company_id = ?
            AND ba.competitive_data IS NOT NULL
            AND ba.competitive_data LIKE '%interest_level%'
            ORDER BY ba.created_at DESC
            LIMIT 1
        `).get(companyId);
        
        if (newDataCheck?.competitive_data) {
            try {
                const data = JSON.parse(newDataCheck.competitive_data);
                if (data.interest_assessment?.interest_level) {
                    return data.interest_assessment.interest_level;
                }
            } catch (e) {
                // Fall through to old method
            }
        }
        
        // Fall back to averaging relevance scores for better distribution
        const result = intelligenceDb.prepare(`
            SELECT AVG(ba.relevance_score) as avg_score
            FROM baseline_analysis ba
            JOIN urls u ON ba.url_id = u.id
            WHERE u.company_id = ?
        `).get(companyId);
        
        return Math.round(result?.avg_score || 0);
    } catch (error) {
        return 0;
    }
}

// Helper function to format relative time
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return date.toLocaleDateString();
}

/**
 * Generate dashboard data
 */
function generateDashboardData(intelligenceDb, processedDb) {
    try {
        console.log('📊 Generating dashboard data...');
        
        // Get the actual last check time from various sources
        let lastCheckTime = new Date().toISOString(); // fallback
        
        try {
            // Collect times from various sources
            const timeSources = [];
            
            // 1. Check workflow-status.json
            const workflowStatusPath = path.join(OUTPUT_DIR, 'workflow-status.json');
            if (fs.existsSync(workflowStatusPath)) {
                const workflowData = JSON.parse(fs.readFileSync(workflowStatusPath, 'utf8'));
                if (workflowData.last_run) {
                    timeSources.push({ source: 'workflow-status', time: new Date(workflowData.last_run) });
                }
            }
            
            // 2. Check baseline analysis
            const lastAnalysis = intelligenceDb.prepare(`
                SELECT MAX(created_at) as last_time 
                FROM baseline_analysis
            `).get();
            
            if (lastAnalysis && lastAnalysis.last_time) {
                timeSources.push({ source: 'baseline-analysis', time: new Date(lastAnalysis.last_time) });
            }
            
            // 3. Check last-scrape.json (kept for compatibility but given lowest priority)
            const lastScrapePath = path.join(OUTPUT_DIR, 'last-scrape.json');
            if (fs.existsSync(lastScrapePath)) {
                const lastScrapeData = JSON.parse(fs.readFileSync(lastScrapePath, 'utf8'));
                if (lastScrapeData.timestamp) {
                    timeSources.push({ source: 'last-scrape', time: new Date(lastScrapeData.timestamp) });
                }
            }
            
            // Use the most recent time
            if (timeSources.length > 0) {
                const mostRecent = timeSources.reduce((latest, current) => 
                    current.time > latest.time ? current : latest
                );
                lastCheckTime = mostRecent.time.toISOString();
                console.log(`✅ Using most recent time from ${mostRecent.source}: ${lastCheckTime}`);
            } else {
                console.log('⚠️ No timing data found, using current time');
            }
        } catch (err) {
            console.warn('⚠️ Could not determine last check time:', err.message);
        }
        
        // Get stats
        const stats = {
            companies: intelligenceDb.prepare('SELECT COUNT(*) as count FROM companies').get()?.count || 0,
            urls: intelligenceDb.prepare('SELECT COUNT(*) as count FROM urls').get()?.count || 0,
            snapshots: intelligenceDb.prepare('SELECT COUNT(*) as count FROM baseline_analysis').get()?.count || 0,
            lastCheck: lastCheckTime  // Use actual scrape time
        };
        
        // Get company activity
        const companyActivity = intelligenceDb.prepare(`
            SELECT 
                c.id,
                c.name as company,
                c.category,
                c.description,
                COUNT(DISTINCT u.id) as url_count,
                MAX(ba.created_at) as last_check
            FROM companies c
            LEFT JOIN urls u ON c.id = u.company_id
            LEFT JOIN baseline_analysis ba ON u.id = ba.url_id
            GROUP BY c.id, c.name, c.category
            ORDER BY c.name
        `).all();
        
        // Get URLs for each company
        const urlsStmt = intelligenceDb.prepare('SELECT url FROM urls WHERE company_id = ?');
        
        // Process company data with enhanced intelligence
        const processedCompanies = companyActivity.map(company => {
            const urls = urlsStmt.all(company.id).map(row => row.url);
            
            // Get top entities (now includes normalization)
            const topProducts = getTopEntities(intelligenceDb, company.id, 'products', 3);
            const topTechnologies = getTopEntities(intelligenceDb, company.id, 'technologies', 3);
            const topAiConcepts = getTopEntities(intelligenceDb, company.id, 'ai_ml_concepts', 3);
            const topPartners = getTopEntities(intelligenceDb, company.id, 'partnerships', 2);
            
            // Get latest change
            const latestChange = getLatestChange(processedDb, intelligenceDb, company.id);
            
            // Get interest level
            const interestLevel = getMaxInterestLevel(intelligenceDb, company.id);
            
            return {
                company: company.company,
                type: company.category || 'competitor',
                url_count: company.url_count || 0,
                last_check: company.last_check,
                urls: urls,
                // Enhanced intelligence data
                intelligence: {
                    products: topProducts,
                    technologies: topTechnologies,
                    ai_ml_concepts: topAiConcepts,
                    partners: topPartners,
                    interest_level: interestLevel,
                    interest_category: interestLevel >= 8 ? 'high' : interestLevel >= 5 ? 'medium' : 'low'
                },
                latest_change: latestChange
            };
        });
        
        // Generate recent changes summary
        console.log('📊 Generating recent changes summary...');
        
        // Attach databases for cross-database queries
        const rawDbPath = path.join(DATA_DIR, 'raw_content.db');
        processedDb.exec(`ATTACH DATABASE '${path.join(DATA_DIR, 'intelligence.db')}' AS intelligence`);
        
        try {
            // Get last 5 changes
            const last5Changes = processedDb.prepare(`
                SELECT 
                    cd.id,
                    cd.detected_at,
                    cd.summary,
                    cd.relevance_score as interest_level,
                    intelligence.companies.name as company,
                    intelligence.urls.url
                FROM change_detection cd
                JOIN intelligence.urls ON cd.url_id = intelligence.urls.id
                JOIN intelligence.companies ON intelligence.urls.company_id = intelligence.companies.id
                WHERE cd.detected_at > datetime('now', '-30 days')
                ORDER BY cd.detected_at DESC
                LIMIT 5
            `).all();
            
            // Count changes in different time periods
            const last24hCount = processedDb.prepare(`
                SELECT COUNT(*) as count
                FROM change_detection cd
                WHERE cd.detected_at > datetime('now', '-24 hours')
            `).get()?.count || 0;
            
            const last7dCount = processedDb.prepare(`
                SELECT COUNT(*) as count
                FROM change_detection cd
                WHERE cd.detected_at > datetime('now', '-7 days')
            `).get()?.count || 0;
            
            // Count high priority changes in last 7 days
            const highPriorityLast7d = processedDb.prepare(`
                SELECT COUNT(*) as count
                FROM change_detection cd
                WHERE cd.detected_at > datetime('now', '-7 days')
                AND cd.relevance_score >= 8
            `).get()?.count || 0;
            
            // Get change counts per company for last 7 days
            const changeCountsStmt = processedDb.prepare(`
                SELECT 
                    intelligence.companies.id as company_id,
                    COUNT(*) as change_count
                FROM change_detection cd
                JOIN intelligence.urls ON cd.url_id = intelligence.urls.id
                JOIN intelligence.companies ON intelligence.urls.company_id = intelligence.companies.id
                WHERE cd.detected_at > datetime('now', '-7 days')
                GROUP BY intelligence.companies.id
            `);
            
            const changeCounts = {};
            for (const row of changeCountsStmt.all()) {
                changeCounts[row.company_id] = row.change_count;
            }
            
            // Add change counts to processed companies
            const processedCompaniesWithChanges = processedCompanies.map(company => {
                // Find company ID from original data
                const companyRecord = companyActivity.find(c => c.company === company.company);
                const changeCount7d = companyRecord ? (changeCounts[companyRecord.id] || 0) : 0;
                
                return {
                    ...company,
                    recent_activity: {
                        change_count_7d: changeCount7d,
                        last_change: company.latest_change ? company.latest_change.time_ago : 'No recent changes',
                        highest_recent_score: company.latest_change ? company.latest_change.relevance_score : 0
                    }
                };
            });
            
            const dashboardData = {
                stats,
                recent_changes_summary: {
                    last_5_changes: last5Changes.map(change => ({
                        id: change.id,
                        company: change.company,
                        url: change.url,
                        summary: change.summary || 'Content updated',
                        interest_level: change.interest_level || 5,
                        time_ago: getRelativeTime(change.detected_at),
                        detected_at: change.detected_at
                    })),
                    last_24h_count: last24hCount,
                    last_7d_count: last7dCount,
                    high_priority_last_7d: highPriorityLast7d
                },
                company_activity: processedCompaniesWithChanges,
                generated_at: new Date().toISOString(),
                backend: 'github-actions-static-three-db'
            };
            
            return dashboardData;
        } finally {
            // Always detach the database
            processedDb.exec('DETACH DATABASE intelligence');
        }
    } catch (error) {
        console.error('❌ Error generating dashboard data:', error);
        return {
            stats: { companies: 0, urls: 0, snapshots: 0, lastCheck: new Date().toISOString() },
            company_activity: [],
            generated_at: new Date().toISOString(),
            backend: 'github-actions-static-three-db',
            error: error.message
        };
    }
}

/**
 * Generate companies data
 */
function generateCompaniesData(intelligenceDb) {
    try {
        console.log('🏢 Generating companies data...');
        
        // Debug: Check database path and existence
        console.log('📍 Database path:', intelligenceDb.name);
        
        // Debug: Count companies before query
        const countResult = intelligenceDb.prepare('SELECT COUNT(*) as count FROM companies').get();
        console.log('🔢 Total companies in database:', countResult.count);
        
        const companies = intelligenceDb.prepare(`
            SELECT 
                c.id,
                c.name as company,
                c.category,
                c.created_at
            FROM companies c
            ORDER BY c.name
        `).all();
        
        console.log('📊 Companies retrieved from query:', companies.length);
        console.log('🏢 Company names:', companies.map(c => c.company).join(', '));
        
        // Get URLs for each company
        const urlsStmt = intelligenceDb.prepare('SELECT url FROM urls WHERE company_id = ?');
        
        const processedCompanies = companies.map(company => {
            const urls = urlsStmt.all(company.id).map(row => row.url);
            return {
                company: company.company,
                type: company.category || 'competitor',
                created_at: company.created_at,
                urls: urls
            };
        });
        
        const result = {
            companies: processedCompanies,
            generated_at: new Date().toISOString()
        };
        
        console.log('🔍 Final companies.json will contain:', result.companies.length, 'companies');
        
        return result;
    } catch (error) {
        console.error('❌ Error generating companies data:', error);
        return {
            companies: [],
            generated_at: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Generate company details data with full AI analysis
 */
function generateCompanyDetailsData(intelligenceDb) {
    try {
        console.log('🏢 Generating detailed company intelligence data...');
        
        const companies = intelligenceDb.prepare('SELECT id, name, category FROM companies').all();
        const companyDetails = {};
        
        for (const company of companies) {
            // Get latest baseline analysis for all company URLs
            const analyses = intelligenceDb.prepare(`
                SELECT 
                    ba.*,
                    u.url,
                    u.url_type
                FROM baseline_analysis ba
                JOIN urls u ON ba.url_id = u.id
                WHERE u.company_id = ?
                ORDER BY ba.created_at DESC
            `).all(company.id);
            
            // Initialize aggregated data structure
            const aggregated = {
                company_name: company.name,
                company_id: company.id,
                company_category: company.category,
                last_analyzed: analyses[0]?.created_at || null,
                urls_analyzed: analyses.length,
                
                // Core Entities
                products: [],
                technologies: [],
                integrations: [],
                partnerships: [],
                people: [],
                pricing: [],
                markets: [],
                competitors: [],
                
                // AI/ML Capabilities
                ai_ml_concepts: [],
                
                // Relationships
                relationships: [],
                
                // Strategic Intelligence
                current_state: {},
                strategic_intelligence: {},
                capabilities: {},
                
                // Quantitative Data
                metrics: [],
                benchmarks: [],
                kpis: [],
                claims: [],
                
                // Summary
                summary: {},
                relevance_score: 0
            };
            
            // Merge data from all URL analyses
            for (const analysis of analyses) {
                try {
                    const entities = JSON.parse(analysis.entities || '{}');
                    const relationships = JSON.parse(analysis.relationships || '[]');
                    const strategicIntel = JSON.parse(analysis.competitive_data || '{}');
                    const currentState = JSON.parse(analysis.semantic_categories || '{}');
                    const quantData = JSON.parse(analysis.quantitative_data || '{}');
                    const fullExtraction = JSON.parse(analysis.full_extraction || '{}');
                    
                    // Aggregate entities (arrays will be deduplicated later)
                    if (entities.products) aggregated.products.push(...entities.products);
                    if (entities.technologies) aggregated.technologies.push(...entities.technologies);
                    if (entities.integrations) aggregated.integrations.push(...entities.integrations);
                    if (entities.partnerships) aggregated.partnerships.push(...entities.partnerships);
                    if (entities.people) aggregated.people.push(...entities.people);
                    if (entities.pricing) aggregated.pricing.push(...entities.pricing);
                    if (entities.markets) aggregated.markets.push(...entities.markets);
                    if (entities.competitors) aggregated.competitors.push(...entities.competitors);
                    if (entities.ai_ml_concepts) aggregated.ai_ml_concepts.push(...entities.ai_ml_concepts);
                    
                    // Aggregate relationships
                    aggregated.relationships.push(...relationships);
                    
                    // Use highest relevance score
                    aggregated.relevance_score = Math.max(aggregated.relevance_score, analysis.relevance_score || 0);
                    
                    // Merge strategic intelligence (use latest/most complete)
                    if (strategicIntel && Object.keys(strategicIntel).length > 0) {
                        aggregated.strategic_intelligence = strategicIntel;
                    }
                    
                    // Merge current state and capabilities
                    aggregated.current_state = fullExtraction.current_state || currentState || aggregated.current_state;
                    aggregated.capabilities = fullExtraction.capabilities || aggregated.capabilities;
                    
                    // Aggregate quantitative data
                    if (quantData.metrics) aggregated.metrics.push(...quantData.metrics);
                    if (quantData.benchmarks) aggregated.benchmarks.push(...quantData.benchmarks);
                    if (quantData.kpis) aggregated.kpis.push(...quantData.kpis);
                    if (quantData.claims) aggregated.claims.push(...quantData.claims);
                    
                    // Use latest/best summary
                    if (fullExtraction.summary && Object.keys(fullExtraction.summary).length > 0) {
                        aggregated.summary = fullExtraction.summary;
                    }
                } catch (e) {
                    console.error(`Error parsing analysis for ${company.name}:`, e.message);
                }
            }
            
            // De-duplicate all arrays
            aggregated.products = deduplicateByName(aggregated.products);
            aggregated.technologies = deduplicateByName(aggregated.technologies);
            aggregated.integrations = deduplicateByName(aggregated.integrations);
            aggregated.partnerships = deduplicateByName(aggregated.partnerships);
            aggregated.people = deduplicateByName(aggregated.people);
            aggregated.pricing = deduplicateByName(aggregated.pricing);
            aggregated.markets = deduplicateByName(aggregated.markets);
            aggregated.competitors = deduplicateByName(aggregated.competitors);
            aggregated.ai_ml_concepts = deduplicateByName(aggregated.ai_ml_concepts);
            
            // De-duplicate relationships (by combination of from/to/type)
            const relSeen = new Set();
            aggregated.relationships = aggregated.relationships.filter(rel => {
                const key = `${rel.from}-${rel.to}-${rel.type}`;
                if (relSeen.has(key)) return false;
                relSeen.add(key);
                return true;
            });
            
            companyDetails[company.id] = aggregated;
        }
        
        return {
            companies: companyDetails,
            generated_at: new Date().toISOString(),
            total_companies: Object.keys(companyDetails).length
        };
    } catch (error) {
        console.error('❌ Error generating company details data:', error);
        return {
            companies: {},
            generated_at: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Generate content snapshots data with AI analysis
 */
function generateContentSnapshotsData(processedDb, intelligenceDb) {
    try {
        console.log('📄 Generating content snapshots data with AI analysis...');
        
        // FIXED: Attach intelligence database for cross-database queries
        const intelligenceDbPath = path.join(DATA_DIR, 'intelligence.db');
        processedDb.exec(`ATTACH DATABASE '${intelligenceDbPath}' AS intelligence`);
        
        try {
            // Get latest content with AI analysis data
            const snapshots = processedDb.prepare(`
                SELECT 
                    mc.id,
                    mc.url_id,
                    mc.processed_at as created_at,
                    mc.markdown_text,
                    intelligence.urls.url,
                    intelligence.urls.url_type as url_type,
                    intelligence.companies.name as company,
                    intelligence.companies.id as company_id
                FROM markdown_content mc
                JOIN intelligence.urls ON mc.url_id = intelligence.urls.id
                JOIN intelligence.companies ON intelligence.urls.company_id = intelligence.companies.id
                WHERE mc.id IN (
                    SELECT MAX(id) 
                    FROM markdown_content 
                    GROUP BY url_id
                )
                ORDER BY mc.processed_at DESC
                LIMIT 100
            `).all();
            
            // Get AI analysis for each snapshot
            const analysisStmt = intelligenceDb.prepare(`
                SELECT relevance_score, summary, semantic_categories, entities
                FROM baseline_analysis
                WHERE snapshot_id = ?
            `);
            
            const processedSnapshots = snapshots.map(snapshot => {
                // Get AI analysis
                const analysis = analysisStmt.get(snapshot.id);
                
                let keywords = [];
                let relevanceScore = 0;
                let aiProcessed = false;
                let category = 'uncategorized';
                let extractedEntities = {};
                
                if (analysis) {
                    relevanceScore = analysis.relevance_score || 0;
                    aiProcessed = true;
                    
                    try {
                        const semanticCategories = JSON.parse(analysis.semantic_categories || '{}');
                        category = semanticCategories.primary || 'uncategorized';
                        
                        const entities = JSON.parse(analysis.entities || '{}');
                        extractedEntities = entities;
                        
                        // Create rich keywords from all entity types
                        const keywordSources = [];
                        
                        if (entities.products) {
                            keywordSources.push(...entities.products.map(p => p.name));
                        }
                        if (entities.technologies) {
                            keywordSources.push(...entities.technologies.map(t => t.name));
                        }
                        if (entities.ai_ml_concepts) {
                            keywordSources.push(...entities.ai_ml_concepts.map(c => c.concept));
                        }
                        if (entities.partnerships) {
                            keywordSources.push(...entities.partnerships.map(p => p.partner_name));
                        }
                        if (entities.integrations) {
                            keywordSources.push(...entities.integrations.map(i => i.integration_name));
                        }
                        
                        // Get unique keywords, prioritize AI/ML concepts
                        keywords = [...new Set(keywordSources)].slice(0, 15); // More keywords
                    } catch (e) {
                        console.error('Error parsing entities:', e);
                    }
                }
                
                return {
                    id: snapshot.id.toString(),
                    url: snapshot.url,
                    company: snapshot.company,
                    type: snapshot.url_type || 'general',
                    title: snapshot.company + ' - ' + (snapshot.url_type || 'Page'),
                    relevance_score: relevanceScore,
                    keywords: keywords,  // Array, not JSON string
                    summary: analysis?.summary || 'No summary available',
                    extracted_at: snapshot.created_at,
                    entities: extractedEntities,  // Full entity data
                    content_length: snapshot.markdown_text ? snapshot.markdown_text.length : 0,
                    extractedContent: snapshot.markdown_text ? 
                        snapshot.markdown_text.substring(0, 500) + '...' : 'No content',
                    aiProcessed: aiProcessed,
                    category: category,
                    source: 'GitHub Actions Monitor',
                    // Add entity counts for quick reference
                    entity_counts: {
                        products: extractedEntities.products?.length || 0,
                        technologies: extractedEntities.technologies?.length || 0,
                        ai_ml_concepts: extractedEntities.ai_ml_concepts?.length || 0,
                        partnerships: extractedEntities.partnerships?.length || 0,
                        integrations: extractedEntities.integrations?.length || 0
                    }
                };
            });
            
            return {
                items: processedSnapshots,
                totalUnfiltered: snapshots.length,
                generated_at: new Date().toISOString()
            };
        } finally {
            // Always detach the database
            processedDb.exec('DETACH DATABASE intelligence');
        }
    } catch (error) {
        console.error('❌ Error generating content snapshots data:', error);
        return {
            items: [],
            totalUnfiltered: 0,
            generated_at: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Extract relevant snippet from content showing the change
 * @param {string} oldContent - The old markdown content
 * @param {string} newContent - The new markdown content
 * @param {number} contextLength - Characters to show around change (default 300)
 * @returns {object} Object with before and after snippets
 */
function extractContentSnippets(oldContent, newContent, contextLength = 300) {
    try {
        // Handle null/undefined content
        if (!oldContent || !newContent) {
            return {
                before: oldContent ? oldContent.substring(0, contextLength) + '...' : 'No previous content',
                after: newContent ? newContent.substring(0, contextLength) + '...' : 'No new content'
            };
        }

        // Split content into lines for comparison
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        
        // Find first significant difference
        let diffIndex = -1;
        for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';
            
            // Skip empty lines and minor changes
            if (oldLine.trim() !== newLine.trim() && (oldLine.trim().length > 10 || newLine.trim().length > 10)) {
                diffIndex = i;
                break;
            }
        }
        
        // If no significant difference found, just show the beginning
        if (diffIndex === -1) {
            return {
                before: oldContent.substring(0, contextLength) + '...',
                after: newContent.substring(0, contextLength) + '...'
            };
        }
        
        // Extract context around the change
        const contextLines = 3; // Lines before and after the change
        const startLine = Math.max(0, diffIndex - contextLines);
        const endLine = Math.min(Math.max(oldLines.length, newLines.length), diffIndex + contextLines + 1);
        
        const beforeSnippet = oldLines.slice(startLine, endLine).join('\n');
        const afterSnippet = newLines.slice(startLine, endLine).join('\n');
        
        // Trim to max length if needed
        const trimmedBefore = beforeSnippet.length > contextLength ? 
            beforeSnippet.substring(0, contextLength) + '...' : beforeSnippet;
        const trimmedAfter = afterSnippet.length > contextLength ? 
            afterSnippet.substring(0, contextLength) + '...' : afterSnippet;
        
        return {
            before: trimmedBefore || 'No previous content',
            after: trimmedAfter || 'No new content'
        };
    } catch (error) {
        console.error('Error extracting content snippets:', error);
        return {
            before: 'Error extracting content',
            after: 'Error extracting content'
        };
    }
}

/**
 * Generate recent changes data with enhanced AI analysis
 */
function generateRecentChangesData(processedDb, intelligenceDb) {
    try {
        console.log('📈 Generating recent changes data with AI analysis...');
        
        // FIXED: Attach intelligence database for cross-database queries
        const intelligenceDbPath = path.join(DATA_DIR, 'intelligence.db');
        processedDb.exec(`ATTACH DATABASE '${intelligenceDbPath}' AS intelligence`);
        
        try {
            // Get recent changes
            const recentChanges = processedDb.prepare(`
                SELECT 
                    cd.id,
                    cd.detected_at as created_at,
                    cd.change_type,
                    cd.summary,
                    cd.relevance_score,
                    cd.ai_explanation,
                    cd.ai_key_changes,
                    cd.ai_business_context,
                    intelligence.urls.url,
                    intelligence.urls.url_type,
                    intelligence.companies.name as company,
                    intelligence.companies.category as company_category,
                    cd.new_content_id,
                    cd.old_content_id
                FROM change_detection cd
                JOIN intelligence.urls ON cd.url_id = intelligence.urls.id
                JOIN intelligence.companies ON intelligence.urls.company_id = intelligence.companies.id
                WHERE cd.detected_at > datetime('now', '-30 days')
                ORDER BY cd.detected_at DESC
                LIMIT 200
            `).all();
            
            // Prepare statement to fetch markdown content
            const contentStmt = processedDb.prepare(`
                SELECT id, markdown_text 
                FROM markdown_content 
                WHERE id = ?
            `);
            
            // Get AI analysis for changes
            // Note: enhanced_analysis table doesn't exist yet, so we'll skip this for now
            const analysisStmt = null;
            
            const processedChanges = recentChanges.map(change => {
                const analysis = analysisStmt ? analysisStmt.get(change.id) : null;
                
                let keyDevelopments = [];
                let opportunities = [];
                let aiSummary = change.summary || 'Content change detected';
                let aiProcessed = false;
                let interestLevel = change.relevance_score || 5; // Default fallback
                
                if (analysis) {
                    aiProcessed = true;
                    aiSummary = analysis.summary || aiSummary;
                    
                    try {
                        const interestData = JSON.parse(analysis.competitive_data || '{}');
                        keyDevelopments = interestData.interest_drivers || [];
                        opportunities = interestData.recommended_actions || [];
                        // Use the new interest level if available
                        if (interestData.interest_level) {
                            interestLevel = interestData.interest_level;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
                
                // Build a more descriptive summary if AI hasn't analyzed it yet
                if (!aiProcessed) {
                    aiSummary = `${change.change_type === 'content_update' ? 'Content updated' : 'Change detected'} on ${change.company}'s ${change.url_type || 'page'}`;
                }
                
                // Determine change emoji based on interest level
                let emoji = '📊';
                if (interestLevel >= 8) emoji = '🌟';
                else if (interestLevel >= 5) emoji = '📌';
                else if (interestLevel >= 3) emoji = '📊';
                
                // Fetch actual content for before/after display
                let beforeContent = null;
                let afterContent = null;
                let contentSnippets = { before: null, after: null };
                
                if (change.old_content_id && change.new_content_id) {
                    try {
                        const oldRecord = contentStmt.get(change.old_content_id);
                        const newRecord = contentStmt.get(change.new_content_id);
                        
                        if (oldRecord && newRecord) {
                            beforeContent = oldRecord.markdown_text;
                            afterContent = newRecord.markdown_text;
                            
                            // Extract relevant snippets showing the change
                            contentSnippets = extractContentSnippets(beforeContent, afterContent);
                        }
                    } catch (err) {
                        console.warn(`Could not fetch content for change ${change.id}:`, err.message);
                    }
                }
                
                return {
                    id: change.id,
                    url: change.url,
                    company: change.company,
                    company_category: change.company_category || 'competitor',
                    url_type: change.url_type || 'general',
                    change_percentage: 0, // Not tracked in new schema
                    interest_level: interestLevel,
                    relevance_score: interestLevel, // Keep for backward compatibility
                    summary: aiSummary,
                    category: change.change_type || 'content_change',
                    keywords_found: '[]',
                    created_at: change.created_at,
                    detected_at: change.created_at, // Add detected_at field
                    time_ago: getRelativeTime(change.created_at),
                    emoji: emoji,
                    impact_level: interestLevel >= 8 ? 'high' : interestLevel >= 5 ? 'medium' : 'low',
                    ai_processed: aiProcessed,
                    key_developments: keyDevelopments,
                    opportunities: opportunities,
                    content_ids: {
                        old: change.old_content_id,
                        new: change.new_content_id
                    },
                    // Add actual content snippets for display
                    before_content: contentSnippets.before,
                    after_content: contentSnippets.after,
                    // Add AI-generated insights if available
                    ai_explanation: change.ai_explanation || null,
                    ai_business_context: change.ai_business_context || null
                };
            });
            
            return {
                changes: processedChanges,
                aiFiltered: true,
                generated_at: new Date().toISOString()
            };
        } finally {
            // Always detach the database
            processedDb.exec('DETACH DATABASE intelligence');
        }
    } catch (error) {
        console.error('❌ Error generating recent changes data:', error);
        return {
            changes: [],
            aiFiltered: false,
            generated_at: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Generate monitoring runs (logs) data
 */
function generateMonitoringRunsData() {
    try {
        console.log('📝 Generating monitoring runs data...');
        
        // For three-database architecture, we'll generate synthetic logs
        // based on the workflow runs
        const logs = [
            {
                timestamp: new Date().toISOString(),
                type: 'success',
                level: 'info',
                message: 'Static data generation completed - 🤖 AI Enhanced',
                details: {
                    run_type: 'generate_static',
                    architecture: 'three-database'
                }
            }
        ];
        
        return {
            logs: logs,
            aiEnhanced: true,
            generated_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('❌ Error generating monitoring runs data:', error);
        return {
            logs: [],
            aiEnhanced: false,
            generated_at: new Date().toISOString(),
            error: error.message
        };
    }
}

/**
 * Main function to generate all static data files
 */
function generateAllStaticData() {
    console.log('🚀 Starting static data generation for GitHub Pages...');
    console.log('📊 Using three-database architecture...');
    
    // Check if three-database architecture exists
    if (!dbManager.hasThreeDbArchitecture()) {
        console.log('⚠️ Three-database architecture not found, creating sample data...');
        
        // Create sample data for when no database exists
        const sampleData = {
            stats: { companies: 0, urls: 0, snapshots: 0, lastCheck: new Date().toISOString() },
            company_activity: [],
            generated_at: new Date().toISOString(),
            backend: 'github-actions-static-three-db',
            status: 'No data yet - run scraper and analyzer first'
        };
        
        // Write sample files
        fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sampleData, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify({ companies: [] }, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'extracted-data.json'), JSON.stringify({ items: [] }, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'changes.json'), JSON.stringify({ changes: [] }, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'monitoring-runs.json'), JSON.stringify({ logs: [] }, null, 2));
        fs.writeFileSync(path.join(OUTPUT_DIR, 'company-details.json'), JSON.stringify({ companies: {} }, null, 2));
        
        console.log('✅ Sample data files created');
        return;
    }
    
    try {
        // Get database connections
        const processedDb = dbManager.getProcessedDb();
        const intelligenceDb = dbManager.getIntelligenceDb();
        
        // Generate each data file
        const files = [
            { name: 'dashboard.json', generator: () => generateDashboardData(intelligenceDb, processedDb) },
            { name: 'companies.json', generator: () => generateCompaniesData(intelligenceDb) },
            { name: 'extracted-data.json', generator: () => generateContentSnapshotsData(processedDb, intelligenceDb) },
            { name: 'changes.json', generator: () => generateRecentChangesData(processedDb, intelligenceDb) },
            { name: 'monitoring-runs.json', generator: generateMonitoringRunsData },
            { name: 'company-details.json', generator: () => generateCompanyDetailsData(intelligenceDb) }
        ];
        
        let aiAnalysisCount = 0;
        
        for (const file of files) {
            console.log(`📝 Generating ${file.name}...`);
            const data = file.generator();
            
            // Count AI-processed items
            if (file.name === 'extracted-data.json') {
                aiAnalysisCount = data.items ? data.items.filter(item => item.aiProcessed).length : 0;
            }
            
            const filePath = path.join(OUTPUT_DIR, file.name);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ Generated ${file.name} (${JSON.stringify(data).length} bytes)`);
        }
        
        // Create a status file
        const statusData = {
            generated_at: new Date().toISOString(),
            files_generated: files.length,
            architecture: 'three-database',
            database_info: dbManager.getDatabaseInfo(),
            backend_type: 'github-actions-static-three-db',
            version: '2.0.0',
            ai_analysis: {
                enabled: true,
                processed_items: aiAnalysisCount
            }
        };
        
        fs.writeFileSync(path.join(OUTPUT_DIR, 'status.json'), JSON.stringify(statusData, null, 2));
        
        console.log('✅ All static data files generated successfully!');
        console.log(`📁 Files created in: ${OUTPUT_DIR}`);
        console.log(`🤖 AI-processed items: ${aiAnalysisCount}`);
        
    } catch (error) {
        console.error('❌ Error generating static data:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateAllStaticData();
}

module.exports = { generateAllStaticData, extractContentSnippets };
