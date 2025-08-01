/**
 * @module ui
 * @description Core UI utilities for notifications, loading states, and common UI patterns
 * @since 1.0.0
 */

/**
 * UI Module
 * Handles general UI rendering helpers and change display
 */

import { escapeHtml, formatTimeAgo, getInterestEmoji } from './utils.js';

class UI {
    constructor() {
        this.changesContainer = null;
    }

    /**
     * Initialize UI module
     */
    init() {
        this.changesContainer = document.getElementById('changesContent');
    }

    /**
     * Display changes in the changes tab
     */
    displayChanges(changes) {
        if (!this.changesContainer) {
            this.changesContainer = document.getElementById('changesContent');
        }
        
        if (!this.changesContainer) return;
        
        if (!changes || changes.length === 0) {
            this.changesContainer.innerHTML = '<p>No changes found matching the filters.</p>';
            return;
        }
        
        // Group changes by date
        const changesByDate = this.groupChangesByDate(changes);
        
        // Generate HTML
        let html = '';
        Object.entries(changesByDate)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .forEach(([date, dateChanges]) => {
                html += `<h4>${date}</h4>`;
                html += '<div class="changes-list">';
                
                dateChanges.forEach(change => {
                    html += this.renderChangeItem(change);
                });
                
                html += '</div>';
            });
        
        this.changesContainer.innerHTML = html;
    }

    /**
     * Group changes by date
     */
    groupChangesByDate(changes) {
        const changesByDate = {};
        
        changes.forEach(change => {
            const date = new Date(change.detected_at || change.detectedAt).toLocaleDateString();
            if (!changesByDate[date]) {
                changesByDate[date] = [];
            }
            changesByDate[date].push(change);
        });
        
        return changesByDate;
    }

    /**
     * Render a single change item
     */
    renderChangeItem(change) {
        const timeAgo = formatTimeAgo(new Date(change.detected_at || change.detectedAt));
        const interestEmoji = getInterestEmoji(change.interest_level);
        
        // Parse AI analysis for better display
        let summary = change.summary || '';
        let technologies = [];
        let concepts = [];
        
        if (change.ai_analysis) {
            try {
                const analysis = JSON.parse(change.ai_analysis);
                summary = analysis.summary || summary;
                technologies = analysis.technologies || [];
                concepts = analysis.concepts || [];
            } catch (e) {
                // Ignore parse errors
            }
        }
        
        const changeId = change.id || `change-${Date.now()}-${Math.random()}`;
        
        return `
            <div class="change-item" onclick="window.controls.showChangeDetail('${changeId}', '${escapeHtml(change.company)}', event)">
                <div class="change-header">
                    <span class="company">${escapeHtml(change.company)}</span>
                    <span class="interest">${interestEmoji} ${change.interest_level}/10</span>
                </div>
                <div class="change-url">${escapeHtml(change.url)}</div>
                <div class="change-info">
                    <span class="change-type">${escapeHtml(change.change_type)}</span>
                    <span class="change-time">${timeAgo}</span>
                </div>
                ${summary ? `<div class="change-summary">${escapeHtml(summary)}</div>` : ''}
                ${technologies.length > 0 ? `
                    <div class="change-tags">
                        ${technologies.map(tech => 
                            `<span class="tag tech-tag">${escapeHtml(tech)}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        if (this.changesContainer) {
            this.changesContainer.innerHTML = `<div class="loading">${escapeHtml(message)}</div>`;
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        if (this.changesContainer) {
            this.changesContainer.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
        }
    }

    /**
     * Show empty state
     */
    showEmpty(message = 'No data available') {
        if (this.changesContainer) {
            this.changesContainer.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
        }
    }
}

// Create and export singleton
export const ui = new UI();
