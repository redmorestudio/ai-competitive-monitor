/**
 * @module kwic
 * @description Keyword-in-Context (KWIC) module for displaying entity contexts across companies
 * @since 1.0.0
 */

import { escapeHtml } from './utils.js';

class KWICManager {
    constructor() {
        this.contextsCache = new Map();
        this.modal = null;
        this.currentEntity = null;
        this.currentType = null;
        this.isLoading = false;
    }

    /**
     * Initialize the KWIC module
     */
    init() {
        console.log('KWIC: Initializing module');
        this.createModal();
        this.setupEventListeners();
        
        // Export to window for onclick handlers
        window.kwic = {
            show: (entity, entityType) => this.show(entity, entityType),
            close: () => this.close()
        };
        
        console.log('KWIC: Module initialized, modal:', this.modal ? 'created' : 'not created');
    }

    /**
     * Create the KWIC modal HTML
     */
    createModal() {
        // Check if modal already exists
        if (document.getElementById('kwicModal')) {
            this.modal = document.getElementById('kwicModal');
            return;
        }

        // Create modal HTML
        const modalHTML = `
            <div id="kwicModal" class="modal" style="display: none;">
                <div class="modal-content kwic-modal-content">
                    <div class="modal-header">
                        <h2 id="kwicTitle">Keyword in Context</h2>
                        <span class="close" onclick="window.kwic.close()">&times;</span>
                    </div>
                    <div id="kwicStats" class="kwic-stats"></div>
                    <div id="kwicFilters" class="kwic-filters"></div>
                    <div id="kwicContent" class="kwic-content"></div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('kwicModal');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.style.display === 'block') {
                this.close();
            }
        });
    }

    /**
     * Show KWIC modal for an entity
     */
    async show(entity, entityType = 'technologies') {
        console.log(`KWIC: Showing modal for ${entity} (${entityType})`);
        
        if (this.isLoading) {
            console.log('KWIC: Already loading, skipping');
            return;
        }
        
        // Ensure modal exists
        if (!this.modal) {
            console.log('KWIC: Modal not found, creating it now');
            this.createModal();
        }
        
        if (!this.modal) {
            console.error('KWIC: Failed to create modal');
            return;
        }
        
        this.currentEntity = entity;
        this.currentType = entityType;
        this.isLoading = true;

        // Show modal with loading state
        this.modal.style.display = 'block';
        document.getElementById('kwicTitle').textContent = `${entity} - Keyword in Context`;
        document.getElementById('kwicContent').innerHTML = '<div class="loading">Loading contexts...</div>';
        document.getElementById('kwicStats').innerHTML = '';
        document.getElementById('kwicFilters').innerHTML = '';

        try {
            // Load contexts
            const contexts = await this.loadContexts(entityType);
            
            if (!contexts || !contexts.contexts || !contexts.contexts[entity]) {
                throw new Error(`No contexts found for ${entity}`);
            }

            const entityContexts = contexts.contexts[entity];
            this.renderModal(entity, entityContexts, entityType);
            
        } catch (error) {
            console.error('Error loading KWIC:', error);
            document.getElementById('kwicContent').innerHTML = `
                <div class="error-message">
                    Unable to load contexts for "${escapeHtml(entity)}"<br>
                    <small>${escapeHtml(error.message)}</small>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load context data for an entity type
     */
    async loadContexts(entityType) {
        // Check cache first
        if (this.contextsCache.has(entityType)) {
            return this.contextsCache.get(entityType);
        }

        // Map entity type to file name
        const fileMap = {
            'technologies': 'contexts-technologies.json',
            'concepts': 'contexts-concepts.json',
            'products': 'contexts-products.json',
            'companies': 'contexts-companies.json'
        };

        const fileName = fileMap[entityType] || 'contexts-technologies.json';
        
        try {
            const url = `./api-data/${fileName}`;
            console.log(`KWIC: Loading contexts from ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${fileName}: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`KWIC: Loaded ${Object.keys(data.contexts || {}).length} entities from ${fileName}`);
            
            // Cache the data
            this.contextsCache.set(entityType, data);
            
            return data;
        } catch (error) {
            console.error(`Error loading contexts for ${entityType}:`, error);
            throw error;
        }
    }

    /**
     * Render the KWIC modal content
     */
    renderModal(entity, contexts, entityType) {
        // Update title
        document.getElementById('kwicTitle').innerHTML = `
            <span class="kwic-entity-name">${escapeHtml(entity)}</span>
            <span class="kwic-entity-type">${entityType}</span>
        `;

        // Group contexts by company
        const contextsByCompany = this.groupByCompany(contexts);
        const companies = Object.keys(contextsByCompany).sort();
        
        // Calculate stats
        const totalContexts = contexts.length;
        const totalCompanies = companies.length;
        
        // Find most common co-mentions
        const coMentions = this.getTopCoMentions(contexts, 5);

        // Render stats
        document.getElementById('kwicStats').innerHTML = `
            <div class="kwic-stat">
                <span class="stat-label">Found in:</span>
                <span class="stat-value">${totalCompanies} companies</span>
            </div>
            <div class="kwic-stat">
                <span class="stat-label">Total mentions:</span>
                <span class="stat-value">${totalContexts}</span>
            </div>
            ${coMentions.length > 0 ? `
            <div class="kwic-stat">
                <span class="stat-label">Often mentioned with:</span>
                <span class="stat-value co-mentions">
                    ${coMentions.map(cm => 
                        `<span class="co-mention-pill" onclick="window.kwic.show('${escapeHtml(cm.entity)}', 'technologies')">${escapeHtml(cm.entity)} (${cm.count})</span>`
                    ).join(' ')}
                </span>
            </div>
            ` : ''}
        `;

        // Render filters
        document.getElementById('kwicFilters').innerHTML = `
            <div class="kwic-filter-group">
                <label>Filter by company:</label>
                <select id="kwicCompanyFilter" onchange="window.kwic.filterContexts()">
                    <option value="">All Companies (${totalCompanies})</option>
                    ${companies.map(company => 
                        `<option value="${escapeHtml(company)}">${escapeHtml(company)} (${contextsByCompany[company].length})</option>`
                    ).join('')}
                </select>
            </div>
            <div class="kwic-filter-group">
                <label>Sort by:</label>
                <select id="kwicSortBy" onchange="window.kwic.sortContexts()">
                    <option value="company">Company</option>
                    <option value="position">Position in text</option>
                    <option value="mentions">Co-mentions</option>
                </select>
            </div>
        `;

        // Render contexts
        this.renderContexts(contextsByCompany, entity);

        // Add filter function to window
        window.kwic.filterContexts = () => this.filterContexts(contextsByCompany, entity);
        window.kwic.sortContexts = () => this.sortContexts(contexts, entity);
    }

    /**
     * Render context list
     */
    renderContexts(contextsByCompany, entity, filterCompany = null) {
        const companies = filterCompany 
            ? [filterCompany] 
            : Object.keys(contextsByCompany).sort();

        let html = '<div class="kwic-contexts-list">';
        
        companies.forEach(company => {
            if (!contextsByCompany[company]) return;
            
            const companyContexts = contextsByCompany[company];
            const isExpanded = companyContexts.length <= 3; // Auto-expand if few contexts
            
            html += `
                <div class="kwic-company-section">
                    <div class="kwic-company-header" onclick="window.kwic.toggleCompany('${escapeHtml(company).replace(/'/g, "\\'")}')" style="cursor: pointer;">
                        <span class="kwic-company-name">
                            <span class="expand-icon" id="expand-${this.sanitizeId(company)}">${isExpanded ? '▼' : '▶'}</span>
                            ${escapeHtml(company)}
                        </span>
                        <span class="kwic-company-count">${companyContexts.length} mention${companyContexts.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="kwic-company-contexts" id="contexts-${this.sanitizeId(company)}" style="display: ${isExpanded ? 'block' : 'none'};">
            `;
            
            // Show max 10 contexts per company initially
            const contextsToShow = companyContexts.slice(0, 10);
            const hasMore = companyContexts.length > 10;
            
            contextsToShow.forEach((context, index) => {
                html += this.renderSingleContext(context, entity, index);
            });
            
            if (hasMore) {
                html += `
                    <div class="kwic-show-more">
                        <button onclick="window.kwic.showAllContexts('${escapeHtml(company).replace(/'/g, "\\'")}', '${escapeHtml(entity).replace(/'/g, "\\'")}')" class="button button-secondary">
                            Show ${companyContexts.length - 10} more...
                        </button>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        document.getElementById('kwicContent').innerHTML = html;

        // Add toggle function
        window.kwic.toggleCompany = (company) => this.toggleCompany(company);
        window.kwic.showAllContexts = (company, entity) => this.showAllContexts(company, entity);
    }

    /**
     * Render a single context
     */
    renderSingleContext(context, entity, index) {
        // Highlight the keyword in the text
        const highlightedText = this.highlightKeyword(context.text, entity);
        
        // Format co-mentions
        const coMentions = context.co_mentions || [];
        const coMentionsHtml = coMentions.length > 0 
            ? `<span class="kwic-co-mentions">Also mentions: ${coMentions.slice(0, 5).map(cm => 
                `<span class="co-mention-inline">${escapeHtml(cm)}</span>`
              ).join(', ')}</span>`
            : '';

        return `
            <div class="kwic-context-item">
                <div class="kwic-context-text">
                    ${highlightedText}
                </div>
                <div class="kwic-context-meta">
                    <a href="${escapeHtml(context.source_url)}" target="_blank" class="kwic-source-link">
                        View source ↗
                    </a>
                    ${coMentionsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Highlight keyword in text
     */
    highlightKeyword(text, keyword) {
        // Escape special regex characters in keyword
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Create case-insensitive regex
        const regex = new RegExp(`(${escapedKeyword})`, 'gi');
        
        // Escape HTML first, then add highlighting
        const escapedText = escapeHtml(text);
        
        return escapedText.replace(regex, '<mark class="kwic-highlight">$1</mark>');
    }

    /**
     * Group contexts by company
     */
    groupByCompany(contexts) {
        const grouped = {};
        
        contexts.forEach(context => {
            const company = context.company || 'Unknown';
            if (!grouped[company]) {
                grouped[company] = [];
            }
            grouped[company].push(context);
        });
        
        return grouped;
    }

    /**
     * Get top co-mentions across all contexts
     */
    getTopCoMentions(contexts, limit = 5) {
        const coMentionCounts = {};
        
        contexts.forEach(context => {
            if (context.co_mentions) {
                context.co_mentions.forEach(mention => {
                    // Skip the current entity
                    if (mention.toLowerCase() !== this.currentEntity.toLowerCase()) {
                        coMentionCounts[mention] = (coMentionCounts[mention] || 0) + 1;
                    }
                });
            }
        });
        
        // Sort by count and return top N
        return Object.entries(coMentionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([entity, count]) => ({ entity, count }));
    }

    /**
     * Filter contexts by company
     */
    filterContexts(contextsByCompany, entity) {
        const filterValue = document.getElementById('kwicCompanyFilter').value;
        
        if (filterValue) {
            // Show only selected company
            const filtered = {};
            filtered[filterValue] = contextsByCompany[filterValue];
            this.renderContexts(filtered, entity);
        } else {
            // Show all companies
            this.renderContexts(contextsByCompany, entity);
        }
    }

    /**
     * Sort contexts
     */
    sortContexts(contexts, entity) {
        const sortBy = document.getElementById('kwicSortBy').value;
        let sorted = [...contexts];
        
        switch(sortBy) {
            case 'position':
                sorted.sort((a, b) => (a.position || 0) - (b.position || 0));
                break;
            case 'mentions':
                sorted.sort((a, b) => 
                    (b.co_mentions?.length || 0) - (a.co_mentions?.length || 0)
                );
                break;
            case 'company':
            default:
                // Already grouped by company
                break;
        }
        
        const grouped = this.groupByCompany(sorted);
        this.renderContexts(grouped, entity);
    }

    /**
     * Toggle company section expansion
     */
    toggleCompany(company) {
        const sanitizedId = this.sanitizeId(company);
        const contextsDiv = document.getElementById(`contexts-${sanitizedId}`);
        const expandIcon = document.getElementById(`expand-${sanitizedId}`);
        
        if (contextsDiv) {
            if (contextsDiv.style.display === 'none') {
                contextsDiv.style.display = 'block';
                if (expandIcon) expandIcon.textContent = '▼';
            } else {
                contextsDiv.style.display = 'none';
                if (expandIcon) expandIcon.textContent = '▶';
            }
        }
    }

    /**
     * Show all contexts for a company (remove limit)
     */
    async showAllContexts(company, entity) {
        // Reload contexts to get all
        const contexts = await this.loadContexts(this.currentType);
        const entityContexts = contexts.contexts[entity];
        const companyContexts = entityContexts.filter(c => c.company === company);
        
        // Find the container
        const sanitizedId = this.sanitizeId(company);
        const container = document.getElementById(`contexts-${sanitizedId}`);
        
        if (container) {
            let html = '';
            companyContexts.forEach((context, index) => {
                html += this.renderSingleContext(context, entity, index);
            });
            container.innerHTML = html;
        }
    }

    /**
     * Sanitize ID for HTML elements
     */
    sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    }

    /**
     * Close the modal
     */
    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.currentEntity = null;
        this.currentType = null;
    }
}

// Create and export singleton instance
export const kwic = new KWICManager();
