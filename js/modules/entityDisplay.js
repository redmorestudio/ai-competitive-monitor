/**
 * @module entityDisplay
 * @description Handles entity groups display and toggling between views
 * @since 1.0.0
 */

import { escapeHtml } from './utils.js';

class EntityDisplay {
    constructor() {
        this.currentView = 'graph'; // 'graph' or 'detail'
        this.entityData = null;
        this.container = null;
        this.countElement = null;
    }

    /**
     * Initialize the entity display module
     */
    init() {
        this.container = document.getElementById('entityGroupsDisplay');
        this.countElement = document.querySelector('.entity-count');
        
        // Make available globally for onclick handlers
        window.entityDisplay = this;
    }

    /**
     * Load and display entity data
     * @param {Object} entityData - Entity groups data from API
     */
    async loadEntityData(entityData) {
        if (!entityData) {
            console.warn('No entity data provided');
            this.showError('No entity data available');
            return;
        }
        
        this.entityData = entityData;
        this.render();
    }

    /**
     * Toggle between graph and detail view
     * @param {string} view - 'graph' or 'detail'
     */
    toggleView(view) {
        if (view === this.currentView) return;
        
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });
        
        // Re-render with new view
        this.render();
    }

    /**
     * Render the entity display based on current view
     */
    render() {
        if (!this.entityData) {
            this.showLoading();
            return;
        }
        
        const entities = this.currentView === 'graph' 
            ? this.entityData.graph_entities 
            : this.entityData.all_entities;
        
        if (!entities || entities.length === 0) {
            this.showError('No entities found');
            return;
        }
        
        // Update count
        this.updateCount(entities.length);
        
        // Group entities by type
        const byType = this.groupByType(entities);
        
        // Render stats summary
        const statsHtml = this.renderStats(entities);
        
        // Render entity groups
        const groupsHtml = this.renderEntityGroups(byType);
        
        this.container.innerHTML = statsHtml + groupsHtml;
    }

    /**
     * Group entities by type
     * @private
     */
    groupByType(entities) {
        const groups = {};
        
        entities.forEach(entity => {
            const type = entity.type || 'other';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(entity);
        });
        
        // Sort each group by significance
        Object.keys(groups).forEach(type => {
            groups[type].sort((a, b) => {
                // Monitored companies first
                if (a.is_monitored && !b.is_monitored) return -1;
                if (!a.is_monitored && b.is_monitored) return 1;
                
                // Then by mention count
                return (b.mentioned_by || 0) - (a.mentioned_by || 0);
            });
        });
        
        return groups;
    }

    /**
     * Render statistics summary
     * @private
     */
    renderStats(entities) {
        const stats = this.entityData.statistics || {};
        const metadata = this.entityData.metadata || {};
        
        return `
            <div class="entity-stats">
                <div class="entity-stat">
                    <div class="entity-stat-value">${entities.length}</div>
                    <div class="entity-stat-label">${this.currentView === 'graph' ? 'Key Entities' : 'Total Entities'}</div>
                </div>
                ${stats.new_entities_count > 0 ? `
                <div class="entity-stat">
                    <div class="entity-stat-value">🆕 ${stats.new_entities_count}</div>
                    <div class="entity-stat-label">New Entities</div>
                </div>
                ` : ''}
                <div class="entity-stat">
                    <div class="entity-stat-value">${metadata.monitored_companies || 0}</div>
                    <div class="entity-stat-label">Monitored Companies</div>
                </div>
                <div class="entity-stat">
                    <div class="entity-stat-value">${stats.high_significance_count || 0}</div>
                    <div class="entity-stat-label">High Significance</div>
                </div>
            </div>
        `;
    }

    /**
     * Render entity groups
     * @private
     */
    renderEntityGroups(byType) {
        const typeOrder = ['company', 'product', 'technology', 'concept', 'person', 'other'];
        const sortedTypes = Object.keys(byType).sort((a, b) => {
            const aIndex = typeOrder.indexOf(a);
            const bIndex = typeOrder.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
        
        let html = '<div class="entity-groups-grid">';
        
        sortedTypes.forEach(type => {
            const entities = byType[type];
            const displayLimit = this.currentView === 'graph' ? 10 : 20;
            const displayed = entities.slice(0, displayLimit);
            const remaining = entities.length - displayLimit;
            
            html += `
                <div class="entity-type-card">
                    <div class="entity-type-header">
                        <span class="entity-type-title">${this.getTypeIcon(type)} ${type}</span>
                        <span class="entity-count-badge">${entities.length}</span>
                    </div>
                    <div class="entity-list">
                        ${displayed.map(entity => this.renderEntity(entity)).join('')}
                        ${remaining > 0 ? `
                            <span class="entity-tag" style="background: var(--hover-bg); border: 1px dashed var(--border-color);">
                                +${remaining} more
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Render a single entity tag
     * @private
     */
    renderEntity(entity) {
        const classes = ['entity-tag'];
        if (entity.is_monitored) classes.push('monitored');
        if (entity.is_new) classes.push('new');
        
        const mentionCount = entity.mentioned_by > 0 ? 
            `<span class="entity-mention-count">${entity.mentioned_by}</span>` : '';
        
        // Map entity type to plural form for KWIC
        const entityTypeMap = {
            'company': 'companies',
            'product': 'products',
            'technology': 'technologies',
            'concept': 'concepts',
            'person': 'companies', // People might be in company contexts
            'other': 'technologies' // Default fallback
        };
        const kwicType = entityTypeMap[entity.type] || 'technologies';
        
        return `
            <span class="${classes.join(' ')}" 
                  title="${escapeHtml(entity.description || `${entity.type}: ${entity.name}`)}"
                  onclick="window.kwic && window.kwic.show('${escapeHtml(entity.name).replace(/'/g, "\\\\'")}', '${kwicType}')"
                  data-entity-id="${entity.id}">
                ${escapeHtml(entity.name)}
                ${mentionCount}
            </span>
        `;
    }

    /**
     * Get icon for entity type
     * @private
     */
    getTypeIcon(type) {
        const icons = {
            company: '🏢',
            product: '📦',
            technology: '⚡',
            concept: '💡',
            person: '👤',
            other: '🏷️'
        };
        return icons[type] || icons.other;
    }

    /**
     * Update entity count display
     * @private
     */
    updateCount(count) {
        if (this.countElement) {
            const label = this.currentView === 'graph' ? 'key entities' : 'total entities';
            this.countElement.textContent = `${count} ${label}`;
        }
    }

    /**
     * Show loading state
     * @private
     */
    showLoading() {
        if (this.container) {
            this.container.innerHTML = '<div class="loading">Loading entity data...</div>';
        }
    }

    /**
     * Show error state
     * @private
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
        }
    }
}

// Create and export singleton instance
export const entityDisplay = new EntityDisplay();
