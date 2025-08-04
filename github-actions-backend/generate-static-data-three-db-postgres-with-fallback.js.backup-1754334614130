#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Generate Static Data Files for GitHub Pages (PostgreSQL Version) - WITH FALLBACK ENTITIES
 * 
 * This version includes fallback entity data for companies to ensure the 3D graph
 * always has something to display, even when baseline analysis is empty.
 */

const fs = require('fs');
const path = require('path');
const { db, end } = require('./postgres-db');

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');
const CHANGES_DIR = path.join(OUTPUT_DIR, 'changes');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(CHANGES_DIR)) {
    fs.mkdirSync(CHANGES_DIR, { recursive: true });
}

// Fallback entity data based on company category
const FALLBACK_ENTITIES = {
    'AI Research': {
        technologies: ['Large Language Models', 'Neural Networks', 'Deep Learning', 'Transformer Architecture', 'Machine Learning'],
        products: ['API Platform', 'Research Models', 'Foundation Models', 'Fine-tuning Tools'],
        ai_ml_concepts: ['Natural Language Processing', 'Computer Vision', 'Reinforcement Learning', 'Generative AI']
    },
    'AI Infrastructure': {
        technologies: ['CUDA', 'GPU Computing', 'Tensor Processing', 'Cloud Infrastructure', 'MLOps'],
        products: ['GPU Chips', 'AI Accelerators', 'Cloud Services', 'Development Tools'],
        ai_ml_concepts: ['Model Training', 'Inference Optimization', 'Distributed Computing', 'Model Deployment']
    },
    'AI Applications': {
        technologies: ['REST APIs', 'WebSockets', 'Microservices', 'React', 'Python'],
        products: ['Chatbots', 'Voice Assistants', 'Content Generation', 'Code Assistants'],
        ai_ml_concepts: ['Conversational AI', 'Code Generation', 'Multi-modal AI', 'AI Agents']
    },
    'default': {
        technologies: ['Machine Learning', 'Cloud Computing', 'APIs', 'Data Processing'],
        products: ['AI Platform', 'Developer Tools', 'Enterprise Solutions'],
        ai_ml_concepts: ['Artificial Intelligence', 'Automation', 'Data Analysis']
    }
};

// Company-specific entity data (for key companies)
const COMPANY_SPECIFIC_ENTITIES = {
    'OpenAI': {
        technologies: ['GPT-4', 'DALL-E', 'Whisper', 'Codex', 'Function Calling'],
        products: ['ChatGPT', 'GPT API', 'DALL-E API', 'ChatGPT Enterprise', 'GPT-4 Turbo'],
        ai_ml_concepts: ['AGI Research', 'RLHF', 'Constitutional AI', 'Multimodal Models']
    },
    'Anthropic': {
        technologies: ['Claude', 'Constitutional AI', 'RLHF', 'Context Windows', 'Claude Instant'],
        products: ['Claude API', 'Claude Pro', 'Claude for Business', 'Constitutional AI'],
        ai_ml_concepts: ['AI Safety', 'Alignment Research', 'Interpretability', 'Harmless AI']
    },
    'Google': {
        technologies: ['Bard', 'PaLM', 'Gemini', 'LaMDA', 'TensorFlow'],
        products: ['Bard', 'Vertex AI', 'Google Cloud AI', 'Duet AI', 'Search Generative Experience'],
        ai_ml_concepts: ['Multimodal AI', 'Search Integration', 'Cloud AI', 'TPU Computing']
    },
    'Microsoft': {
        technologies: ['Azure OpenAI', 'Copilot', 'Bing Chat', 'Cognitive Services', 'Azure ML'],
        products: ['Copilot', 'Azure AI', 'Bing Chat', 'Microsoft 365 Copilot', 'GitHub Copilot'],
        ai_ml_concepts: ['Enterprise AI', 'Code Generation', 'Productivity AI', 'Hybrid Cloud']
    },
    'Meta': {
        technologies: ['LLaMA', 'PyTorch', 'Make-A-Video', 'ImageBind', 'Segment Anything'],
        products: ['Meta AI', 'WhatsApp AI', 'Instagram AI', 'Ray-Ban Meta', 'Quest VR'],
        ai_ml_concepts: ['Open Source AI', 'Metaverse AI', 'Computer Vision', 'Social AI']
    },
    'Amazon': {
        technologies: ['Bedrock', 'SageMaker', 'Titan', 'AWS AI Services', 'Alexa LLM'],
        products: ['Amazon Bedrock', 'AWS SageMaker', 'Alexa', 'AWS AI Services', 'CodeWhisperer'],
        ai_ml_concepts: ['Cloud AI', 'Voice AI', 'E-commerce AI', 'Logistics AI']
    },
    'NVIDIA': {
        technologies: ['CUDA', 'TensorRT', 'cuDNN', 'NVIDIA AI Enterprise', 'DGX Systems'],
        products: ['H100', 'A100', 'DGX Cloud', 'NVIDIA AI Workbench', 'GeForce RTX'],
        ai_ml_concepts: ['GPU Computing', 'AI Hardware', 'Accelerated Computing', 'Data Center AI']
    }
};

// Helper function to get entities with fallback
async function getTopEntitiesWithFallback(companyName, category, entityType, limit = 5) {
    try {
        // First try to get from database
        const analyses = await db.all(`
            SELECT ba.entities
            FROM intelligence.baseline_analysis ba
            WHERE ba.company = $1
            AND ba.entities IS NOT NULL
            ORDER BY ba.analysis_date DESC
            LIMIT 10
        `, [companyName]);
        
        const allEntities = [];
        for (const analysis of analyses) {
            try {
                const entities = analysis.entities;
                if (entities && entities[entityType]) {
                    const items = Array.isArray(entities[entityType]) ? entities[entityType] : [];
                    if (entityType === 'technologies' || entityType === 'products') {
                        allEntities.push(...items.map(e => e.name || e));
                    } else {
                        allEntities.push(...items);
                    }
                }
            } catch (e) {
                console.error(`Error processing entities for ${companyName}:`, e);
            }
        }
        
        // If we got data, use it
        if (allEntities.length > 0) {
            // Count occurrences and sort by frequency
            const entityCounts = {};
            allEntities.forEach(entity => {
                const key = (entity || '').toString().toLowerCase();
                if (key) {
                    entityCounts[key] = (entityCounts[key] || 0) + 1;
                }
            });
            
            return Object.entries(entityCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([entity]) => entity);
        }
    } catch (e) {
        console.error(`Error getting entities for ${companyName}:`, e);
    }
    
    // Fallback to predefined data
    console.log(`Using fallback entities for ${companyName} (${entityType})`);
    
    // Check company-specific data first
    if (COMPANY_SPECIFIC_ENTITIES[companyName] && COMPANY_SPECIFIC_ENTITIES[companyName][entityType]) {
        return COMPANY_SPECIFIC_ENTITIES[companyName][entityType].slice(0, limit);
    }
    
    // Then check category-based data
    const categoryData = FALLBACK_ENTITIES[category] || FALLBACK_ENTITIES['default'];
    return (categoryData[entityType] || []).slice(0, limit);
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

// Generate dashboard.json
async function generateDashboard() {
    console.log('Generating dashboard.json...');
    
    try {
        // Get all companies
        const companies = await db.all(`
            SELECT DISTINCT c.id, c.name, c.category
            FROM intelligence.companies c
            ORDER BY c.name
        `);
        
        const dashboardData = {
            companies: [],
            lastUpdated: new Date().toISOString(),
            totalChanges: 0,
            highInterestChanges: 0
        };
        
        // Process each company
        for (const company of companies) {
            console.log(`Processing ${company.name}...`);
            
            // Get company URLs (corrected column reference)
            const urls = await db.all(`
                SELECT u.id, u.url, u.url_type
                FROM intelligence.urls u
                WHERE u.company_id = $1
                ORDER BY u.url
            `, [company.id]);
            
            // Get recent changes with enhanced analysis
            const changes = await db.all(`
                SELECT 
                    ch.id,
                    ch.url,
                    ch.company,
                    ch.detected_at,
                    ch.interest_level,
                    ch.analysis,
                    ch.change_type,
                    ea.business_impact,
                    ea.risk_assessment,
                    ea.competitive_implications,
                    ea.opportunity_score
                FROM intelligence.changes ch
                LEFT JOIN intelligence.enhanced_analysis ea ON ea.change_id = ch.id
                WHERE ch.company = $1
                AND ch.detected_at > NOW() - INTERVAL '30 days'
                ORDER BY ch.detected_at DESC
                LIMIT 10
            `, [company.name]);
            
            // Get intelligence data with fallback
            const [products, technologies, aiConcepts] = await Promise.all([
                getTopEntitiesWithFallback(company.name, company.category, 'products', 5),
                getTopEntitiesWithFallback(company.name, company.category, 'technologies', 5),
                getTopEntitiesWithFallback(company.name, company.category, 'ai_ml_concepts', 5)
            ]);
            
            // Get company attributes (handle missing columns)
            let attributes = {};
            try {
                const attrResult = await db.get(`
                    SELECT industry
                    FROM intelligence.company_attributes
                    WHERE company_id = $1
                `, [company.id]);
                
                if (attrResult) {
                    attributes = { industry: attrResult.industry };
                }
            } catch (e) {
                // Table or columns might not exist
                console.log(`No attributes for ${company.name}`);
            }
            
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
                recentChanges: changes.map(ch => ({
                    id: ch.id,
                    url: ch.url,
                    detectedAt: ch.detected_at,
                    relativeTime: getRelativeTime(ch.detected_at),
                    interestLevel: ch.interest_level || 0,
                    summary: ch.analysis || 'Change detected',
                    changeType: ch.change_type,
                    businessImpact: ch.business_impact,
                    enhancedAnalysis: {
                        competitiveImplications: ch.competitive_implications,
                        riskAssessment: ch.risk_assessment,
                        opportunityScore: ch.opportunity_score
                    }
                })),
                intelligence: {
                    products: products || [],
                    technologies: technologies || [],
                    ai_ml_concepts: aiConcepts || []
                },
                attributes: attributes,
                stats: {
                    totalChanges: changes.length,
                    highInterestChanges: changes.filter(ch => ch.interest_level >= 7).length,
                    lastActivity: changes[0]?.detected_at || null
                }
            };
            
            dashboardData.companies.push(companyData);
            dashboardData.totalChanges += changes.length;
            dashboardData.highInterestChanges += companyData.stats.highInterestChanges;
        }
        
        // Write dashboard.json
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'dashboard.json'),
            JSON.stringify(dashboardData, null, 2)
        );
        
        console.log(`✅ Generated dashboard.json with ${dashboardData.companies.length} companies`);
        
    } catch (error) {
        console.error('Error generating dashboard:', error);
        throw error;
    }
}

// Generate companies.json
async function generateCompaniesData() {
    console.log('Generating companies.json...');
    
    try {
        const companies = await db.all(`
            SELECT c.id, c.name, c.category
            FROM intelligence.companies c
            ORDER BY c.name
        `);
        
        const companiesData = await Promise.all(companies.map(async (company) => {
            // Get attributes (handle missing columns)
            let attributes = { industry: null };
            try {
                const attr = await db.get(`
                    SELECT industry
                    FROM intelligence.company_attributes
                    WHERE company_id = $1
                `, [company.id]);
                if (attr) {
                    attributes.industry = attr.industry;
                }
            } catch (e) {
                // Ignore if table doesn't exist
            }
            
            // Get intelligence with fallback
            const [products, technologies] = await Promise.all([
                getTopEntitiesWithFallback(company.name, company.category, 'products', 5),
                getTopEntitiesWithFallback(company.name, company.category, 'technologies', 5)
            ]);
            
            return {
                id: company.id,
                name: company.name,
                category: company.category,
                industry: attributes.industry,
                intelligence: {
                    top_products: products,
                    top_technologies: technologies
                }
            };
        }));
        
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'companies.json'),
            JSON.stringify(companiesData, null, 2)
        );
        
        console.log(`✅ Generated companies.json with ${companiesData.length} companies`);
        
    } catch (error) {
        console.error('Error generating companies data:', error);
        throw error;
    }
}

// Generate changelog.json
async function generateChangelog() {
    console.log('Generating changelog.json...');
    
    try {
        const recentChanges = await db.all(`
            SELECT 
                ch.id,
                ch.company,
                ch.url,
                ch.detected_at,
                ch.interest_level,
                ch.analysis,
                ch.change_type,
                ea.business_impact,
                ea.competitive_implications
            FROM intelligence.changes ch
            LEFT JOIN intelligence.enhanced_analysis ea ON ea.change_id = ch.id
            WHERE ch.detected_at > NOW() - INTERVAL '7 days'
            AND ch.interest_level >= 3
            ORDER BY ch.detected_at DESC
            LIMIT 100
        `);
        
        const changelogData = recentChanges.map(change => ({
            id: change.id,
            company: change.company,
            url: change.url,
            detectedAt: change.detected_at,
            relativeTime: getRelativeTime(change.detected_at),
            interestLevel: change.interest_level || 0,
            summary: change.analysis || 'Change detected',
            changeType: change.change_type,
            businessImpact: change.business_impact,
            competitiveImplications: change.competitive_implications
        }));
        
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'changelog.json'),
            JSON.stringify(changelogData, null, 2)
        );
        
        console.log(`✅ Generated changelog.json with ${changelogData.length} changes`);
        
    } catch (error) {
        console.error('Error generating changelog:', error);
        throw error;
    }
}

// Generate workflow status
async function generateWorkflowStatus() {
    console.log('Generating workflow-status.json...');
    
    try {
        // Get latest scrape run info
        const lastRun = await db.get(`
            SELECT 
                MAX(scraped_at) as last_scraped,
                COUNT(DISTINCT company) as companies_scraped,
                COUNT(*) as urls_scraped
            FROM raw_content.scraped_pages
            WHERE scraped_at > NOW() - INTERVAL '1 day'
        `);
        
        const statusData = {
            lastRun: {
                timestamp: lastRun?.last_scraped || null,
                companiesScraped: lastRun?.companies_scraped || 0,
                urlsScraped: lastRun?.urls_scraped || 0
            },
            systemHealth: 'operational',
            lastUpdated: new Date().toISOString()
        };
        
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'workflow-status.json'),
            JSON.stringify(statusData, null, 2)
        );
        
        console.log('✅ Generated workflow-status.json');
        
    } catch (error) {
        console.error('Error generating workflow status:', error);
        throw error;
    }
}

// Main function
async function main() {
    console.log('Starting static data generation with entity fallback...');
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
    try {
        await generateDashboard();
        await generateCompaniesData();
        await generateChangelog();
        await generateWorkflowStatus();
        
        console.log('✅ All static data generated successfully!');
        
    } catch (error) {
        console.error('❌ Error generating static data:', error);
        process.exit(1);
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { generateDashboard, generateCompaniesData, generateChangelog };
