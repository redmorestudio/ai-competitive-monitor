/**
 * @module graph-3d-data
 * @description Data management for 3D graph including node/link processing and updates
 * @since 1.0.0
 */

/**
 * 3D Graph Data Module
 * Handles data loading, processing, and normalization
 */

export class Graph3DData {
    constructor() {
        this.rawData = null;
        this.processedData = { nodes: [], links: [] };
        this.entityTypeMap = {
            'AI Assistant': 'AI Assistant',
            'AI Automation': 'AI Automation',
            'AI Code Editor': 'AI Coding',
            'AI Coding': 'AI Coding',
            'AI Hardware': 'AI Hardware',
            'AI Infrastructure': 'AI Infrastructure',
            'AI Search': 'AI Search',
            'AI Voice/Audio': 'AI Voice/Audio',
            'AI Writing': 'AI Writing',
            'Enterprise AI': 'Enterprise AI',
            'Image Generation': 'Image Generation',
            'LLM Provider': 'LLM Providers',
            'LLM Providers': 'LLM Providers',
            'Video AI': 'Video AI',
            'AI Research': 'AI Research',
            'AI Model': 'AI Model',
            'Data Science': 'Data Science',
            'AI Consulting': 'AI Consulting'
        };
    }

    /**
     * Load data from multiple sources
     * @returns {Promise<Array>} Raw company data
     */
    async loadData() {
        try {
            // Try to load from multiple sources
            const [companiesData, detailsData, changesData, dashboardData] = await Promise.allSettled([
                this.fetchJSON('api-data/companies.json'),
                this.fetchJSON('api-data/company-details.json'),
                this.fetchJSON('api-data/changes.json'),
                this.fetchJSON('api-data/dashboard.json')
            ]);

            // Process SQLite format if available
            if (companiesData.status === 'fulfilled' && detailsData.status === 'fulfilled') {
                this.rawData = this.processSQLiteFormat(companiesData.value, detailsData.value);
            } 
            // Fall back to PostgreSQL format
            else if (dashboardData.status === 'fulfilled') {
                this.rawData = this.processPostgreSQLFormat(dashboardData.value);
            } 
            else {
                throw new Error('No valid data sources found');
            }

            // Add changes data if available
            if (changesData.status === 'fulfilled') {
                this.addChangesData(changesData.value);
            }

            // Return raw data for processing
            return this.rawData;

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    /**
     * Fetch JSON data
     * @param {string} url - URL to fetch
     * @returns {Promise<Object>} JSON data
     */
    async fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Process SQLite format data
     * @param {Object} companies - Companies data
     * @param {Object} details - Company details data
     * @returns {Array} Processed companies
     */
    processSQLiteFormat(companies, details) {
        const detailsMap = new Map();
        
        // Create details lookup map
        if (details.company_intelligence) {
            details.company_intelligence.forEach(detail => {
                if (!detailsMap.has(detail.company)) {
                    detailsMap.set(detail.company, []);
                }
                detailsMap.set(detail.company, detail);
            });
        }

        // Process companies
        const companiesArray = Array.isArray(companies) ? companies : (companies.companies || []);
        return companiesArray.map(company => {
            const detail = detailsMap.get(company.name) || {};
            
            return {
                id: company.name.toLowerCase().replace(/\s+/g, '-'),
                name: company.name,
                website: company.website,
                type: this.normalizeEntityType(company.type || company.category),
                interestLevel: company.interest_level || 5,
                urlCount: company.urls_to_monitor || 0,
                intelligence: {
                    products: detail.products || [],
                    technologies: this.extractTechnologies(detail),
                    concepts: this.extractConcepts(detail),
                    analysis: detail.analysis || '',
                    lastUpdated: detail.analysis_date
                }
            };
        });
    }

    /**
     * Process PostgreSQL format data
     * @param {Object} dashboardData - Dashboard data
     * @returns {Array} Processed companies
     */
    processPostgreSQLFormat(dashboardData) {
        if (!dashboardData.companies) {
            throw new Error('No companies data in dashboard.json');
        }

        return dashboardData.companies.map(company => ({
            id: company.name.toLowerCase().replace(/\s+/g, '-'),
            name: company.name,
            website: company.website,
            type: this.normalizeEntityType(company.type),
            interestLevel: company.interestLevel || 5,
            urlCount: company.urlsToMonitor || 0,
            intelligence: {
                products: company.products || [],
                technologies: company.technologies || [],
                concepts: company.aiConcepts || [],
                analysis: company.analysis || '',
                lastUpdated: company.lastUpdated
            }
        }));
    }

    /**
     * Add changes data to companies
     * @param {Object} changesData - Changes data
     */
    addChangesData(changesData) {
        if (!changesData.recent_changes || !this.rawData) return;

        const changesMap = new Map();
        
        // Group changes by company
        changesData.recent_changes.forEach(change => {
            if (!changesMap.has(change.company)) {
                changesMap.set(change.company, []);
            }
            changesMap.get(change.company).push(change);
        });

        // Add to companies
        this.rawData.forEach(company => {
            const changes = changesMap.get(company.name) || [];
            if (changes.length > 0) {
                // Find most recent change
                const mostRecent = changes.reduce((a, b) => 
                    new Date(a.detected_at) > new Date(b.detected_at) ? a : b
                );
                company.lastChanged = new Date(mostRecent.detected_at).getTime();
                company.recentChanges = changes.slice(0, 5); // Keep last 5 changes
            }
        });
    }

    /**
     * Extract technologies from intelligence data
     * @param {Object} detail - Company detail
     * @returns {Array} Technologies list
     */
    extractTechnologies(detail) {
        const technologies = [];
        
        // Extract from various fields
        ['tech_stack', 'technologies', 'ai_technologies'].forEach(field => {
            if (detail[field]) {
                if (Array.isArray(detail[field])) {
                    technologies.push(...detail[field]);
                } else if (typeof detail[field] === 'string') {
                    technologies.push(...detail[field].split(',').map(t => t.trim()));
                }
            }
        });

        // Clean and deduplicate
        return [...new Set(technologies
            .map(t => t.trim())
            .filter(t => t && t.length > 1 && !this.isGenericTerm(t))
        )];
    }

    /**
     * Extract AI concepts from intelligence data
     * @param {Object} detail - Company detail
     * @returns {Array} Concepts list
     */
    extractConcepts(detail) {
        const concepts = [];
        
        // Extract from various fields
        ['ai_features', 'ml_capabilities', 'ai_concepts'].forEach(field => {
            if (detail[field]) {
                if (Array.isArray(detail[field])) {
                    concepts.push(...detail[field]);
                } else if (typeof detail[field] === 'string') {
                    concepts.push(...detail[field].split(',').map(c => c.trim()));
                }
            }
        });

        // Add inferred concepts from analysis
        if (detail.analysis) {
            const inferredConcepts = this.inferConceptsFromText(detail.analysis);
            concepts.push(...inferredConcepts);
        }

        // Clean and deduplicate
        return [...new Set(concepts
            .map(c => c.trim())
            .filter(c => c && c.length > 1 && !this.isGenericTerm(c))
        )];
    }

    /**
     * Infer AI concepts from text
     * @param {string} text - Text to analyze
     * @returns {Array} Inferred concepts
     */
    inferConceptsFromText(text) {
        const concepts = [];
        const conceptPatterns = [
            /machine learning/gi,
            /deep learning/gi,
            /natural language processing/gi,
            /computer vision/gi,
            /neural network/gi,
            /reinforcement learning/gi,
            /generative ai/gi,
            /transformer/gi,
            /llm/gi,
            /large language model/gi
        ];

        conceptPatterns.forEach(pattern => {
            if (pattern.test(text)) {
                concepts.push(pattern.source.replace(/\\/g, '').replace(/gi$/, ''));
            }
        });

        return concepts;
    }

    /**
     * Process raw data into graph format
     * @param {Array} companies - Raw company data
     * @returns {Object} Graph data with nodes and links
     */
    processIntoGraphData(companies) {
        const nodes = [];
        const links = [];
        const techNodes = new Map();
        const conceptNodes = new Map();

        // Create company nodes
        companies.forEach(company => {
            nodes.push({
                id: company.id,
                name: company.name,
                nodeType: 'company',
                companyType: company.type,
                interestLevel: company.interestLevel,
                urlCount: company.urlCount,
                website: company.website,
                technologies: company.intelligence.technologies,
                concepts: company.intelligence.concepts,
                products: company.intelligence.products,
                lastChanged: company.lastChanged,
                recentChanges: company.recentChanges
            });

            // Track technology nodes
            company.intelligence.technologies.forEach(tech => {
                if (!techNodes.has(tech)) {
                    techNodes.set(tech, new Set());
                }
                techNodes.get(tech).add(company.id);
            });

            // Track concept nodes
            company.intelligence.concepts.forEach(concept => {
                if (!conceptNodes.has(concept)) {
                    conceptNodes.set(concept, new Set());
                }
                conceptNodes.get(concept).add(company.id);
            });
        });

        // Create technology nodes
        techNodes.forEach((companies, tech) => {
            const techId = `tech-${tech}`;
            nodes.push({
                id: techId,
                name: tech,
                nodeType: 'technology',
                companyCount: companies.size
            });

            // Create links from companies to technology
            companies.forEach(companyId => {
                links.push({
                    source: companyId,
                    target: techId,
                    linkType: 'technology',
                    strength: 1
                });
            });
        });

        // Create concept nodes
        conceptNodes.forEach((companies, concept) => {
            const conceptId = `concept-${concept}`;
            nodes.push({
                id: conceptId,
                name: concept,
                nodeType: 'concept',
                companyCount: companies.size
            });

            // Create links from companies to concepts
            companies.forEach(companyId => {
                links.push({
                    source: companyId,
                    target: conceptId,
                    linkType: 'concept',
                    strength: 1
                });
            });
        });

        // Create company-to-company links based on shared technologies
        const companyPairs = new Map();
        
        companies.forEach((company1, i) => {
            companies.slice(i + 1).forEach(company2 => {
                const sharedTech = company1.intelligence.technologies.filter(t => 
                    company2.intelligence.technologies.includes(t)
                );
                
                if (sharedTech.length > 0) {
                    const pairKey = `${company1.id}-${company2.id}`;
                    companyPairs.set(pairKey, {
                        source: company1.id,
                        target: company2.id,
                        linkType: 'shared-technology',
                        strength: sharedTech.length,
                        technologies: sharedTech
                    });
                }
            });
        });

        // Add company-to-company links
        companyPairs.forEach(link => links.push(link));

        // Store the processed data
        this.processedData = { nodes, links };

        return { nodes, links };
    }

    /**
     * Normalize entity type
     * @param {string} type - Raw entity type
     * @returns {string} Normalized type
     */
    normalizeEntityType(type) {
        return this.entityTypeMap[type] || type;
    }

    /**
     * Check if term is too generic
     * @param {string} term - Term to check
     * @returns {boolean} True if generic
     */
    isGenericTerm(term) {
        const genericTerms = ['ai', 'ml', 'data', 'api', 'web', 'cloud', 'software', 'platform'];
        return genericTerms.includes(term.toLowerCase());
    }

    /**
     * Get raw data
     * @returns {Array} Raw company data
     */
    getRawData() {
        return this.rawData;
    }

    /**
     * Get processed data
     * @returns {Object} Processed graph data
     */
    getProcessedData() {
        return this.processedData;
    }

    /**
     * Get data statistics
     * @returns {Object} Data statistics
     */
    getStatistics() {
        const stats = {
            companies: 0,
            technologies: 0,
            concepts: 0,
            links: 0,
            entityTypes: new Set(),
            avgTechnologies: 0,
            avgConcepts: 0
        };

        // Use processed data if available, otherwise raw data
        if (this.processedData && this.processedData.nodes.length > 0) {
            stats.links = this.processedData.links.length;
            
            this.processedData.nodes.forEach(node => {
                if (node.nodeType === 'company') {
                    stats.companies++;
                    stats.entityTypes.add(node.companyType);
                    stats.avgTechnologies += node.technologies?.length || 0;
                    stats.avgConcepts += node.concepts?.length || 0;
                } else if (node.nodeType === 'technology') {
                    stats.technologies++;
                } else if (node.nodeType === 'concept') {
                    stats.concepts++;
                }
            });

            if (stats.companies > 0) {
                stats.avgTechnologies /= stats.companies;
                stats.avgConcepts /= stats.companies;
            }
        } else if (this.rawData) {
            // Fall back to raw data statistics
            stats.companies = this.rawData.length;
            const types = new Set();
            this.rawData.forEach(company => {
                if (company.type) types.add(company.type);
            });
            stats.entityTypes = types;
        }

        stats.entityTypes = Array.from(stats.entityTypes);
        
        return stats;
    }
}

// Create singleton instance
export const graph3DData = new Graph3DData();
