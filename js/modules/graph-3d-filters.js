/**
 * @module graph-3d-filters
 * @description Filtering system for 3D graph nodes and relationships
 * @since 1.0.0
 */

/**
 * 3D Graph Filters Module
 * Handles all filtering logic for nodes and links
 */

export class Graph3DFilters {
    constructor() {
        // Filter states
        this.entityTypeFilters = new Set();
        this.technologyFilters = new Set();
        this.conceptFilters = new Set();
        this.searchQuery = '';
        this.searchDepth = 1;
        this.linkThreshold = 0;
        this.entityLimit = 200;
        this.showTechnologyNodes = true;
        this.showConceptNodes = true;
        this.showCompanyNodes = true;
        this.customTagFilter = null;
        this.viewModeFilter = null;
    }

    /**
     * Apply all filters to the data
     * @param {Object} rawData - Original unfiltered data
     * @returns {Object} Filtered data with nodes and links
     */
    applyFilters(rawData) {
        if (!rawData || !rawData.nodes) {
            return { nodes: [], links: [] };
        }

        let filteredNodes = [...rawData.nodes];
        let filteredLinks = [...rawData.links];

        // Step 1: Apply node type visibility
        filteredNodes = this.filterByNodeVisibility(filteredNodes);

        // Step 2: Apply custom tag filter if active
        if (this.customTagFilter) {
            filteredNodes = this.filterByCustomTag(filteredNodes, rawData);
        }

        // Step 3: Apply view mode filter
        if (this.viewModeFilter) {
            filteredNodes = this.filterByViewMode(filteredNodes);
        }

        // Step 4: Apply entity type filters
        if (this.entityTypeFilters.size > 0) {
            filteredNodes = this.filterByEntityType(filteredNodes);
        }

        // Step 5: Apply search with depth
        if (this.searchQuery) {
            filteredNodes = this.filterBySearch(filteredNodes, rawData);
        }

        // Step 6: Apply technology filters
        if (this.technologyFilters.size > 0) {
            filteredNodes = this.filterByTechnology(filteredNodes, rawData);
        }

        // Step 7: Apply concept filters
        if (this.conceptFilters.size > 0) {
            filteredNodes = this.filterByConcept(filteredNodes, rawData);
        }

        // Step 8: Apply entity limit
        if (filteredNodes.length > this.entityLimit) {
            filteredNodes = filteredNodes.slice(0, this.entityLimit);
        }

        // Step 9: Filter links based on visible nodes and threshold
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        filteredLinks = filteredLinks.filter(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            return nodeIds.has(sourceId) && 
                   nodeIds.has(targetId) && 
                   (link.strength || 0) >= this.linkThreshold;
        });

        return { nodes: filteredNodes, links: filteredLinks };
    }

    /**
     * Filter by node type visibility
     * @param {Array} nodes - Nodes to filter
     * @returns {Array} Filtered nodes
     */
    filterByNodeVisibility(nodes) {
        return nodes.filter(node => {
            if (node.nodeType === 'technology' && !this.showTechnologyNodes) return false;
            if (node.nodeType === 'concept' && !this.showConceptNodes) return false;
            if (node.nodeType === 'company' && !this.showCompanyNodes) return false;
            return true;
        });
    }

    /**
     * Filter by custom tag
     * @param {Array} nodes - Nodes to filter
     * @param {Object} rawData - Original data for relationships
     * @returns {Array} Filtered nodes
     */
    filterByCustomTag(nodes, rawData) {
        const tag = this.customTagFilter;
        const matchingCompanies = new Set();

        // Find companies with this technology or concept
        rawData.nodes.forEach(node => {
            if (node.nodeType === 'company') {
                if (node.technologies?.includes(tag) || node.concepts?.includes(tag)) {
                    matchingCompanies.add(node.id);
                }
            }
        });

        // Include matching companies and the tag node itself
        return nodes.filter(node => {
            if (matchingCompanies.has(node.id)) return true;
            if (node.id === `tech-${tag}` || node.id === `concept-${tag}`) return true;
            return false;
        });
    }

    /**
     * Filter by view mode
     * @param {Array} nodes - Nodes to filter
     * @returns {Array} Filtered nodes
     */
    filterByViewMode(nodes) {
        switch (this.viewModeFilter) {
            case 'high-interest':
                return nodes.filter(node => 
                    node.nodeType !== 'company' || node.interestLevel >= 7
                );
            case 'recent-activity':
                const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
                return nodes.filter(node => 
                    node.nodeType !== 'company' || (node.lastChanged && node.lastChanged > dayAgo)
                );
            default:
                return nodes;
        }
    }

    /**
     * Filter by entity type
     * @param {Array} nodes - Nodes to filter
     * @returns {Array} Filtered nodes
     */
    filterByEntityType(nodes) {
        return nodes.filter(node => {
            if (node.nodeType !== 'company') return true;
            return this.entityTypeFilters.has(node.companyType);
        });
    }

    /**
     * Filter by search query with depth
     * @param {Array} nodes - Nodes to filter
     * @param {Object} rawData - Original data for BFS
     * @returns {Array} Filtered nodes
     */
    filterBySearch(nodes, rawData) {
        const query = this.searchQuery.toLowerCase();
        const depth = this.searchDepth;

        // Find nodes matching the search
        const matchingNodes = new Set();
        nodes.forEach(node => {
            const name = (node.name || node.id || '').toLowerCase();
            if (name.includes(query)) {
                matchingNodes.add(node.id);
            }
        });

        // If depth > 0, use BFS to include connected nodes
        if (depth > 0 && matchingNodes.size > 0) {
            const visited = new Set(matchingNodes);
            const queue = Array.from(matchingNodes);
            let currentDepth = 0;

            while (queue.length > 0 && currentDepth < depth) {
                const levelSize = queue.length;
                
                for (let i = 0; i < levelSize; i++) {
                    const nodeId = queue.shift();
                    
                    // Find all connected nodes
                    rawData.links.forEach(link => {
                        const sourceId = link.source.id || link.source;
                        const targetId = link.target.id || link.target;
                        
                        if (sourceId === nodeId && !visited.has(targetId)) {
                            visited.add(targetId);
                            queue.push(targetId);
                        } else if (targetId === nodeId && !visited.has(sourceId)) {
                            visited.add(sourceId);
                            queue.push(sourceId);
                        }
                    });
                }
                
                currentDepth++;
            }

            return nodes.filter(node => visited.has(node.id));
        }

        return nodes.filter(node => matchingNodes.has(node.id));
    }

    /**
     * Filter by technology
     * @param {Array} nodes - Nodes to filter
     * @param {Object} rawData - Original data
     * @returns {Array} Filtered nodes
     */
    filterByTechnology(nodes, rawData) {
        const techNodes = Array.from(this.technologyFilters).map(tech => `tech-${tech}`);
        const companiesWithTech = new Set();

        // Find companies with selected technologies
        rawData.nodes.forEach(node => {
            if (node.nodeType === 'company' && node.technologies) {
                const hasTech = node.technologies.some(tech => 
                    this.technologyFilters.has(tech)
                );
                if (hasTech) {
                    companiesWithTech.add(node.id);
                }
            }
        });

        return nodes.filter(node => 
            techNodes.includes(node.id) || 
            companiesWithTech.has(node.id) ||
            node.nodeType === 'concept'
        );
    }

    /**
     * Filter by concept
     * @param {Array} nodes - Nodes to filter
     * @param {Object} rawData - Original data
     * @returns {Array} Filtered nodes
     */
    filterByConcept(nodes, rawData) {
        const conceptNodes = Array.from(this.conceptFilters).map(concept => `concept-${concept}`);
        const companiesWithConcept = new Set();

        // Find companies with selected concepts
        rawData.nodes.forEach(node => {
            if (node.nodeType === 'company' && node.concepts) {
                const hasConcept = node.concepts.some(concept => 
                    this.conceptFilters.has(concept)
                );
                if (hasConcept) {
                    companiesWithConcept.add(node.id);
                }
            }
        });

        return nodes.filter(node => 
            conceptNodes.includes(node.id) || 
            companiesWithConcept.has(node.id) ||
            node.nodeType === 'technology'
        );
    }

    /**
     * Set entity type filters
     * @param {Set} types - Set of entity types to show
     */
    setEntityTypeFilters(types) {
        this.entityTypeFilters = new Set(types);
    }

    /**
     * Set technology filters
     * @param {Set} technologies - Set of technologies to filter by
     */
    setTechnologyFilters(technologies) {
        this.technologyFilters = new Set(technologies);
    }

    /**
     * Set concept filters
     * @param {Set} concepts - Set of concepts to filter by
     */
    setConceptFilters(concepts) {
        this.conceptFilters = new Set(concepts);
    }

    /**
     * Set search query
     * @param {string} query - Search query
     */
    setSearchQuery(query) {
        this.searchQuery = query;
    }

    /**
     * Set search depth
     * @param {number} depth - Search depth (0, 1, or 2)
     */
    setSearchDepth(depth) {
        this.searchDepth = Math.max(0, Math.min(2, depth));
    }

    /**
     * Set link threshold
     * @param {number} threshold - Minimum link strength to display
     */
    setLinkThreshold(threshold) {
        this.linkThreshold = threshold;
    }

    /**
     * Set entity limit
     * @param {number} limit - Maximum number of entities to display
     */
    setEntityLimit(limit) {
        this.entityLimit = limit;
    }

    /**
     * Set node type visibility
     * @param {string} type - Node type (technology, concept, company)
     * @param {boolean} visible - Whether to show this type
     */
    setNodeTypeVisibility(type, visible) {
        switch (type) {
            case 'technology':
                this.showTechnologyNodes = visible;
                break;
            case 'concept':
                this.showConceptNodes = visible;
                break;
            case 'company':
                this.showCompanyNodes = visible;
                break;
        }
    }

    /**
     * Set custom tag filter
     * @param {string|null} tag - Tag to filter by, or null to clear
     */
    setCustomTagFilter(tag) {
        this.customTagFilter = tag;
    }

    /**
     * Set view mode filter
     * @param {string|null} mode - View mode filter, or null to clear
     */
    setViewModeFilter(mode) {
        this.viewModeFilter = mode;
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.entityTypeFilters.clear();
        this.technologyFilters.clear();
        this.conceptFilters.clear();
        this.searchQuery = '';
        this.searchDepth = 1;
        this.linkThreshold = 0;
        this.entityLimit = 200;
        this.showTechnologyNodes = true;
        this.showConceptNodes = true;
        this.showCompanyNodes = true;
        this.customTagFilter = null;
        this.viewModeFilter = null;
    }

    /**
     * Get filter statistics
     * @param {Object} data - Graph data
     * @returns {Object} Statistics about filters
     */
    getFilterStats(data) {
        const stats = {
            totalNodes: data.nodes.length,
            totalLinks: data.links.length,
            activeFilters: 0
        };

        if (this.entityTypeFilters.size > 0) stats.activeFilters++;
        if (this.technologyFilters.size > 0) stats.activeFilters++;
        if (this.conceptFilters.size > 0) stats.activeFilters++;
        if (this.searchQuery) stats.activeFilters++;
        if (this.linkThreshold > 0) stats.activeFilters++;
        if (this.entityLimit < 200) stats.activeFilters++;
        if (!this.showTechnologyNodes || !this.showConceptNodes || !this.showCompanyNodes) stats.activeFilters++;
        if (this.customTagFilter) stats.activeFilters++;
        if (this.viewModeFilter) stats.activeFilters++;

        return stats;
    }

    /**
     * Get current filter settings
     * @returns {Object} Current filter settings
     */
    getSettings() {
        return {
            entityTypeFilters: Array.from(this.entityTypeFilters),
            technologyFilters: Array.from(this.technologyFilters),
            conceptFilters: Array.from(this.conceptFilters),
            searchQuery: this.searchQuery,
            searchDepth: this.searchDepth,
            linkThreshold: this.linkThreshold,
            entityLimit: this.entityLimit,
            showTechnologyNodes: this.showTechnologyNodes,
            showConceptNodes: this.showConceptNodes,
            showCompanyNodes: this.showCompanyNodes,
            customTagFilter: this.customTagFilter,
            viewModeFilter: this.viewModeFilter
        };
    }

    /**
     * Apply settings object
     * @param {Object} settings - Filter settings to apply
     */
    applySettings(settings) {
        if (settings.entityTypeFilters) this.setEntityTypeFilters(new Set(settings.entityTypeFilters));
        if (settings.technologyFilters) this.setTechnologyFilters(new Set(settings.technologyFilters));
        if (settings.conceptFilters) this.setConceptFilters(new Set(settings.conceptFilters));
        if (settings.searchQuery !== undefined) this.searchQuery = settings.searchQuery;
        if (settings.searchDepth !== undefined) this.searchDepth = settings.searchDepth;
        if (settings.linkThreshold !== undefined) this.linkThreshold = settings.linkThreshold;
        if (settings.entityLimit !== undefined) this.entityLimit = settings.entityLimit;
        if (settings.showTechnologyNodes !== undefined) this.showTechnologyNodes = settings.showTechnologyNodes;
        if (settings.showConceptNodes !== undefined) this.showConceptNodes = settings.showConceptNodes;
        if (settings.showCompanyNodes !== undefined) this.showCompanyNodes = settings.showCompanyNodes;
        if (settings.customTagFilter !== undefined) this.customTagFilter = settings.customTagFilter;
        if (settings.viewModeFilter !== undefined) this.viewModeFilter = settings.viewModeFilter;
    }
}

// Create singleton instance
export const graph3DFilters = new Graph3DFilters();
