#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Generate Static Data Files for GitHub Pages (PostgreSQL Version) - WITH CONTEXT EXTRACTION
 * 
 * This version includes:
 * 1. Fallback entity data for companies
 * 2. Context extraction from scraped pages showing where entities appear
 * 3. Co-mention tracking for intelligent filtering
 */

const fs = require('fs');
const path = require('path');
const { db, end } = require('./postgres-db');

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');
const CHANGES_DIR = path.join(OUTPUT_DIR, 'changes');

// Context extraction configuration
const CONTEXT_WORDS = 15; // Words before/after entity mention
const MAX_CONTEXTS_PER_ENTITY = 100; // Max contexts to store per entity

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

// Track all entities globally for co-mention detection
let ALL_TRACKED_ENTITIES = new Set();

// Helper function to escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract context snippets from text
function extractContextSnippets(text, searchTerm, contextWords = CONTEXT_WORDS) {
    const regex = new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi');
    const contexts = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Extract approximate characters for context
        const beforeStart = Math.max(0, match.index - 200);
        const afterEnd = Math.min(text.length, match.index + searchTerm.length + 200);
        
        const snippet = text.substring(beforeStart, afterEnd);
        
        // Find actual word boundaries
        const words = snippet.split(/\s+/);
        const termIndex = words.findIndex(w => 
            w.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (termIndex !== -1) {
            const contextStart = Math.max(0, termIndex - contextWords);
            const contextEnd = Math.min(words.length, termIndex + contextWords + 1);
            const contextText = words.slice(contextStart, contextEnd).join(' ');
            
            // Find co-mentions
            const coMentions = findCoMentions(contextText, ALL_TRACKED_ENTITIES);
            
            contexts.push({
                text: contextText,
                position: match.index,
                coMentions: coMentions
            });
        }
    }
    
    return contexts;
}

// Find other tracked entities in the context
function findCoMentions(contextText, allEntities) {
    const found = [];
    const lowerContext = contextText.toLowerCase();
    
    for (const entity of allEntities) {
        if (entity && lowerContext.includes(entity.toLowerCase())) {
            found.push(entity);
        }
    }
    
    return [...new Set(found)]; // Remove duplicates
}

// Extract contexts for a specific entity
async function extractEntityContexts(entityName) {
    console.log(`  Extracting contexts for: ${entityName}`);
    
    try {
        // Query all scraped pages that mention this entity
        const pages = await db.all(`
            SELECT 
                c.name as company,
                u.url as source_url,
                sp.content as markdown_content,
                sp.scraped_at
            FROM raw_content.scraped_pages sp
            JOIN intelligence.urls u ON sp.url = u.url
            JOIN intelligence.companies c ON u.company_id = c.id
            WHERE sp.content ILIKE $1
            ORDER BY sp.scraped_at DESC
            LIMIT 200
        `, [`%${entityName}%`]);
        
        const allContexts = [];
        
        for (const page of pages) {
            if (!page.markdown_content) continue;
            
            const contexts = extractContextSnippets(
                page.markdown_content,
                entityName,
                CONTEXT_WORDS
            );
            
            for (const ctx of contexts) {
                allContexts.push({
                    company: page.company,
                    source_url: page.source_url,
                    text: ctx.text,
                    position: ctx.position,
                    co_mentions: ctx.coMentions.filter(e => e !== entityName)
                });
            }
            
            // Limit contexts per entity
            if (allContexts.length >= MAX_CONTEXTS_PER_ENTITY) {
                break;
            }
        }
        
        return allContexts.slice(0, MAX_CONTEXTS_PER_ENTITY);
        
    } catch (error) {
        console.error(`Error extracting contexts for ${entityName}:`, error);
        return [];
    }
}

// Collect all unique entities across all companies
async function collectAllEntities() {
    console.log('Collecting all unique entities...');
    
    // Check if we have filtered companies from the environment
    let filteredCompanies = null;
    if (process.env.FILTERED_COMPANIES) {
        try {
            filteredCompanies = new Set(JSON.parse(process.env.FILTERED_COMPANIES));
            console.log(`  Using ${filteredCompanies.size} pre-filtered companies`);
        } catch (e) {
            console.error('  Failed to parse FILTERED_COMPANIES:', e);
        }
    }
    
    // Or check for a filtered companies file
    const filteredCompaniesFile = path.join(__dirname, 'data', 'filtered-companies.json');
    if (!filteredCompanies && fs.existsSync(filteredCompaniesFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(filteredCompaniesFile, 'utf8'));
            filteredCompanies = new Set(data.valid_companies);
            console.log(`  Loaded ${filteredCompanies.size} filtered companies from file`);
        } catch (e) {
            console.error('  Failed to load filtered companies file:', e);
        }
    }
    
    const entities = {
        companies: new Set(),
        technologies: new Set(),
        concepts: new Set(),
        products: new Set()
    };
    
    try {
        // Get all companies
        const companies = await db.all(`
            SELECT DISTINCT name FROM intelligence.companies
        `);
        
        for (const company of companies) {
            // Skip if we have a filter and this company isn't in it
            if (filteredCompanies && !filteredCompanies.has(company.name)) {
                continue;
            }
            entities.companies.add(company.name);
            
            // Get entities from baseline analysis
            const analyses = await db.all(`
                SELECT entities
                FROM intelligence.baseline_analysis
                WHERE company = $1
                AND entities IS NOT NULL
                ORDER BY analysis_date DESC
                LIMIT 5
            `, [company.name]);
            
            for (const analysis of analyses) {
                try {
                    const entData = analysis.entities;
                    if (entData) {
                        // Technologies (normalized to lowercase)
                        if (entData.technologies) {
                            const techs = Array.isArray(entData.technologies) ? entData.technologies : [];
                            techs.forEach(t => {
                                const name = t.name || t;
                                if (name && typeof name === 'string') {
                                    entities.technologies.add(name.toLowerCase());
                                }
                            });
                        }
                        
                        // Products (normalized to lowercase)
                        if (entData.products) {
                            const prods = Array.isArray(entData.products) ? entData.products : [];
                            prods.forEach(p => {
                                const name = p.name || p;
                                if (name && typeof name === 'string') {
                                    entities.products.add(name.toLowerCase());
                                }
                            });
                        }
                        
                        // AI/ML Concepts (normalized to lowercase)
                        if (entData.ai_ml_concepts) {
                            const concepts = Array.isArray(entData.ai_ml_concepts) ? entData.ai_ml_concepts : [];
                            concepts.forEach(c => {
                                if (c && typeof c === 'string') {
                                    entities.concepts.add(c.toLowerCase());
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.error(`Error processing entities for ${company.name}:`, e);
                }
            }
        }
        
        // Add fallback entities (normalized to lowercase)
        for (const [companyName, companyEntities] of Object.entries(COMPANY_SPECIFIC_ENTITIES)) {
            companyEntities.technologies?.forEach(t => {
                if (t && typeof t === 'string') entities.technologies.add(t.toLowerCase());
            });
            companyEntities.products?.forEach(p => {
                if (p && typeof p === 'string') entities.products.add(p.toLowerCase());
            });
            companyEntities.ai_ml_concepts?.forEach(c => {
                if (c && typeof c === 'string') entities.concepts.add(c.toLowerCase());
            });
        }
        
    } catch (error) {
        console.error('Error collecting entities:', error);
    }
    
    // Update global entity set
    ALL_TRACKED_ENTITIES = new Set([
        ...entities.companies,
        ...entities.technologies,
        ...entities.concepts,
        ...entities.products
    ]);
    
    console.log(`Collected entities: ${entities.companies.size} companies, ${entities.technologies.size} technologies, ${entities.concepts.size} concepts, ${entities.products.size} products`);
    
    return entities;
}

// Generate context files
async function generateContextFiles() {
    console.log('Generating context files...');
    
    // Collect all entities first
    const entities = await collectAllEntities();
    
    // Initialize context data structure
    const contextData = {
        generated_at: new Date().toISOString(),
        total_entities: ALL_TRACKED_ENTITIES.size,
        all_mentions: {}
    };
    
    // Process company contexts
    console.log('\nProcessing company contexts...');
    for (const company of entities.companies) {
        const contexts = await extractEntityContexts(company);
        if (contexts.length > 0) {
            contextData.all_mentions[company] = contexts;
        }
    }
    
    // Process technology contexts
    console.log('\nProcessing technology contexts...');
    for (const tech of entities.technologies) {
        const contexts = await extractEntityContexts(tech);
        if (contexts.length > 0) {
            contextData.all_mentions[tech] = contexts;
        }
    }
    
    // Process concept contexts
    console.log('\nProcessing AI concept contexts...');
    for (const concept of entities.concepts) {
        const contexts = await extractEntityContexts(concept);
        if (contexts.length > 0) {
            contextData.all_mentions[concept] = contexts;
        }
    }
    
    // Process product contexts
    console.log('\nProcessing product contexts...');
    for (const product of entities.products) {
        const contexts = await extractEntityContexts(product);
        if (contexts.length > 0) {
            contextData.all_mentions[product] = contexts;
        }
    }
    
    // Split into separate files for better performance
    const contextTypes = {
        companies: new Set(entities.companies),
        technologies: new Set(entities.technologies),
        concepts: new Set(entities.concepts),
        products: new Set(entities.products)
    };
    
    // Create separate context files
    for (const [type, entitySet] of Object.entries(contextTypes)) {
        const typeContexts = {};
        let contextCount = 0;
        
        for (const entity of entitySet) {
            if (contextData.all_mentions[entity]) {
                typeContexts[entity] = contextData.all_mentions[entity];
                contextCount += contextData.all_mentions[entity].length;
            }
        }
        
        const filename = `contexts-${type}.json`;
        fs.writeFileSync(
            path.join(OUTPUT_DIR, filename),
            JSON.stringify({
                type: type,
                generated_at: contextData.generated_at,
                entity_count: entitySet.size,
                context_count: contextCount,
                contexts: typeContexts
            }, null, 2)
        );
        
        console.log(`✅ Generated ${filename} with ${contextCount} contexts for ${entitySet.size} entities`);
    }
    
    // Create context index file
    const contextIndex = {
        generated_at: contextData.generated_at,
        total_entities: ALL_TRACKED_ENTITIES.size,
        entity_types: {
            companies: entities.companies.size,
            technologies: entities.technologies.size,
            concepts: entities.concepts.size,
            products: entities.products.size
        },
        entities_with_contexts: Object.keys(contextData.all_mentions).length
    };
    
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'contexts-index.json'),
        JSON.stringify(contextIndex, null, 2)
    );
    
    console.log('✅ Generated contexts-index.json');
}

// Helper function to get entities with fallback (UPDATED FOR ENHANCED ANALYZER)
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
                const data = analysis.entities;
                
                // Handle new enhanced analyzer structure
                if (data) {
                    // Map entity types to the new structure
                    let items = [];
                    
                    if (entityType === 'technologies') {
                        // Technologies are now in attributes.technologies
                        if (data.technologies && Array.isArray(data.technologies)) {
                            // Old structure compatibility
                            items = data.technologies;
                        } else if (data.attributes && data.attributes.technologies) {
                            // New structure
                            items = data.attributes.technologies;
                        } else {
                            // Check if technologies were merged into top level
                            items = data.technologies || [];
                        }
                    } else if (entityType === 'products') {
                        // Products are in entities.products
                        if (data.products && Array.isArray(data.products)) {
                            items = data.products;
                        } else if (data.entities && data.entities.products) {
                            items = data.entities.products;
                        }
                    } else if (entityType === 'ai_ml_concepts') {
                        // Concepts are now in attributes.concepts
                        if (data.ai_ml_concepts && Array.isArray(data.ai_ml_concepts)) {
                            // Old structure compatibility
                            items = data.ai_ml_concepts;
                        } else if (data.attributes && data.attributes.concepts) {
                            // New structure
                            items = data.attributes.concepts;
                        } else if (data.concepts) {
                            // Check if concepts were merged into top level
                            items = data.concepts;
                        }
                    }
                    
                    // Process items based on their structure
                    items.forEach(item => {
                        if (item) {
                            if (typeof item === 'string') {
                                allEntities.push(item);
                            } else if (item.name) {
                                allEntities.push(item.name);
                            }
                        }
                    });
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
                const key = (entity || '').toString().toLowerCase().trim();
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

// Helper to format relative time (unchanged)
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

// Generate dashboard.json (unchanged)
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
                    ai_technologies: technologies || [],  // Changed from 'technologies'
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

// Generate companies.json (unchanged)
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
                    ai_technologies: technologies  // Changed from 'top_technologies'
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

// Generate changelog.json (unchanged)
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

// Generate workflow status (unchanged)
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
    console.log('Starting static data generation with context extraction...');
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
    try {
        // Generate existing files
        await generateDashboard();
        await generateCompaniesData();
        await generateChangelog();
        await generateWorkflowStatus();
        
        // Generate new context files
        await generateContextFiles();
        
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

module.exports = { generateDashboard, generateCompaniesData, generateChangelog, generateContextFiles };
