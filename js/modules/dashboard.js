/**
 * @module dashboard
 * @description Main dashboard UI component handling company cards, changes feed, and stats display
 * @since 1.0.0
 */

/**
 * Dashboard Module
 * Handles main dashboard UI rendering and interactions
 */

import { escapeHtml, getRelativeTime, getInterestEmoji } from './utils.js';
import { filterHighInterestChanges } from './filters.js';
import { api } from './api.js';

class Dashboard {
    constructor() {
        this.companiesContainer = null;
        this.recentChangesContainer = null;
        this.statsBar = null;
    }

    /**
     * Initialize the dashboard module
     */
    init() {
        // Get DOM references
        this.companiesContainer = document.getElementById('companiesDisplay');
        this.recentChangesContainer = document.getElementById('recentChanges');
        this.statsBar = document.getElementById('statsBar');
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.querySelector('button[onclick*="refreshStatus"]');
        if (refreshBtn) {
            refreshBtn.onclick = (e) => this.handleRefresh(e);
        }
    }

    /**
     * Handle refresh button click
     */
    async handleRefresh(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Trigger refresh through main coordinator
        if (window.app && window.app.refreshData) {
            await window.app.refreshData();
        }
    }

    /**
     * Update stats bar with current data
     */
    updateStatsBar(dashboardData, workflowStatus) {
        if (!this.statsBar) return;
        
        // Use company_activity since that's where the data is
        const companies = dashboardData?.company_activity || dashboardData?.companies || [];
        const companyCount = companies.length;
        const urlCount = companies.reduce((sum, company) => 
            sum + (company.urls?.length || company.url_count || 0), 0) || 0;
        
        // Get total changes from various sources
        let totalChanges = 0;
        if (dashboardData?.totalChanges !== undefined) {
            totalChanges = dashboardData.totalChanges;
        } else if (dashboardData?.changes) {
            totalChanges = Array.isArray(dashboardData.changes) 
                ? dashboardData.changes.length 
                : 0;
        }
        
        // Get last check time
        const lastCheck = workflowStatus?.last_run || dashboardData?.lastUpdated;
        const lastCheckText = lastCheck ? getRelativeTime(new Date(lastCheck)) : 'Never';
        
        // Update the stats bar
        this.statsBar.innerHTML = `
            <div class="stat-item">🏢 <strong>${companyCount}</strong> Companies</div>
            <div class="stat-item">🔍 <strong>${urlCount}</strong> URLs Monitored</div>
            <div class="stat-item">📊 <strong>${totalChanges}</strong> Changes Tracked</div>
            <div class="stat-item">⏰ Last Check: <strong>${lastCheckText}</strong></div>
        `;
        
        }

    /**
     * Update companies display
     */
    updateCompaniesDisplay(companies) {
        console.log('📊 updateCompaniesDisplay called with:', companies);
        if (!this.companiesContainer) {
            console.error('❌ companiesContainer not found!');
            return;
        }
        
        if (!companies || companies.length === 0) {
            console.warn('⚠️ No companies data provided');
            this.companiesContainer.innerHTML = 
                '<h3>📊 Monitored Companies</h3><div class="error-message">No companies found in configuration.</div>';
            return;
        }
        
        // Sort companies by recent activity
        const sortedCompanies = [...companies].sort((a, b) => {
            const dateA = a.lastChange ? new Date(a.lastChange) : new Date(0);
            const dateB = b.lastChange ? new Date(b.lastChange) : new Date(0);
            return dateB - dateA;
        });
        
        let html = '<h3>📊 Monitored Companies</h3><div class="company-grid">';
        
        sortedCompanies.forEach(company => {
            html += this.renderCompanyCard(company);
        });
        
        html += '</div>';
        this.companiesContainer.innerHTML = html;
    }

    /**
     * Render a single company card
     */
    renderCompanyCard(company) {
        // Handle both data structures (company_activity has different field names)
        const companyName = company.company || company.name;
        const urlCount = company.url_count || company.urls?.length || 0;
        const changeCount = company.changeCount || company.recent_activity?.change_count_7d || 0;
        const lastChange = company.latest_change?.time_ago || company.lastChange;
        const hasRecentChanges = company.hasRecentActivity || (company.recent_activity?.change_count_7d > 0) || false;
        
        // Get recent high-interest changes
        const recentHighInterest = company.recentChanges?.filter(c => 
            (c.interest_level || 0) >= 7
        ).length || 0;
        
        return `
            <div class="company-card ${hasRecentChanges ? 'recent-change' : ''}" 
                 onclick="window.controls.showCompanyDetails('${escapeHtml(companyName)}')">
                <div class="company-header">
                    <h4>${escapeHtml(companyName)}</h4>
                    ${hasRecentChanges ? '<span class="activity-indicator">🔴 Recent Activity</span>' : ''}
                </div>
                
                <div class="company-stats">
                    <div class="stat">
                        <span class="stat-label">URLs Monitored</span>
                        <span class="stat-value">${urlCount}</span>
                    </div>
                    ${recentHighInterest > 0 ? `
                    <div class="stat highlight">
                        <span class="stat-label">High Interest</span>
                        <span class="stat-value">🌟 ${recentHighInterest}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${lastChange ? `
                <div class="last-activity">
                    <small>Last change: ${typeof lastChange === 'string' && lastChange.includes('/') ? lastChange : getRelativeTime(new Date(lastChange))}</small>
                </div>
                ` : ''}
                
                <div class="company-actions">
                    <button type="button" class="button button-primary" 
                            onclick="event.stopPropagation(); window.controls.showCompanyDetails('${escapeHtml(companyName)}')">
                        View Details
                    </button>
                    <button type="button" class="button button-secondary" 
                            onclick="event.stopPropagation(); window.controls.showCompanyUrls('${escapeHtml(companyName)}')">
                        View URLs
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Update recent changes display
     */
    async updateRecentChanges(changesData) {
        if (!this.recentChangesContainer) return;
        
        try {
            // Handle both array and object structures
            let changes = [];
            if (Array.isArray(changesData)) {
                changes = changesData;
            } else if (changesData?.changes) {
                changes = changesData.changes;
            }
            
            // Filter for high-interest changes (7+ interest level)
            const highInterestChanges = filterHighInterestChanges(changes, 7)
                .sort((a, b) => new Date(b.detected_at || b.detectedAt) - new Date(a.detected_at || a.detectedAt))
                .slice(0, 5); // Show top 5
            
            // Store high interest changes globally for the modal to access
            window.highInterestChanges = highInterestChanges;
        
        // Also create a map for quick lookup by a unique key
        window.highInterestChangesMap = new Map();
        highInterestChanges.forEach((change, index) => {
            const key = `${change.company}-${change.detected_at || change.detectedAt}-${index}`;
            window.highInterestChangesMap.set(key, change);
        });
            
            if (highInterestChanges.length === 0) {
                this.recentChangesContainer.innerHTML = 
                    '<p style="color: var(--text-secondary);">No high-interest changes detected recently.</p>';
                return;
            }
            
            let html = '<div class="recent-changes-list">';
            
            highInterestChanges.forEach((change, index) => {
                html += this.renderRecentChange(change, index);
            });
            
            html += '</div>';
            this.recentChangesContainer.innerHTML = html;
            
        } catch (error) {
            console.error('Error updating recent changes:', error);
            this.recentChangesContainer.innerHTML = 
                '<p class="error-message">Unable to load recent changes.</p>';
        }
    }

    /**
     * Render a single recent change item
     */
    renderRecentChange(change, index) {
        const changeDate = new Date(change.detected_at || change.detectedAt);
        const timeAgo = getRelativeTime(changeDate);
        
        // Parse the summary field which contains the actual AI analysis
        let summaryText = '';
        if (change.summary) {
            try {
                // The summary field contains a JSON string with the full AI analysis
                const analysisData = JSON.parse(change.summary);
                
                // Extract the actual summary text from the parsed data
                if (analysisData.change_summary && analysisData.change_summary.what_changed) {
                    summaryText = analysisData.change_summary.what_changed;
                } else if (analysisData.summary) {
                    // Sometimes it might be nested differently
                    summaryText = analysisData.summary;
                } else {
                    // Fallback to the raw summary if we can't parse it
                    summaryText = change.summary;
                }
            } catch (e) {
                // If parsing fails, check if it's already plain text
                if (typeof change.summary === 'string' && !change.summary.startsWith('{')) {
                    summaryText = change.summary;
                } else {
                    console.warn('Failed to parse change summary:', e);
                    summaryText = 'Change detected';
                }
            }
        } else {
            summaryText = 'Change detected';
        }
        
        const interestEmoji = getInterestEmoji(change.interest_level);
        
        // Create a unique identifier that includes the timestamp
        const changeId = `high-interest-${index}-${(change.detected_at || change.detectedAt).replace(/[:.]/g, '-')}`;
        
        // Store the change data directly on the element for retrieval
        window[`changeData_${changeId}`] = change;
        
        return `
            <div class="recent-change-item" 
                 onclick="window.controls.showChangeDetail('${changeId}', '${escapeHtml(change.company)}', event)">
                <div class="change-header">
                    <span class="company-name">${escapeHtml(change.company)}</span>
                    <span class="interest-indicator">${interestEmoji} ${change.interest_level}/10</span>
                </div>
                <div class="change-summary">
                    ${escapeHtml(summaryText.substring(0, 150))}${summaryText.length > 150 ? '...' : ''}
                </div>
                <div class="change-time">${timeAgo}</div>
            </div>
        `;
    }

    /**
     * Show loading state
     */
    showLoading(container) {
        if (container) {
            container.innerHTML = '<div class="loading">Loading...</div>';
        }
    }

    /**
     * Show error state
     */
    showError(container, message) {
        if (container) {
            container.innerHTML = `<div class="error-message">${escapeHtml(message)}</div>`;
        }
    }

    /**
     * Main render method - updates all dashboard components
     */
    async render() {
        console.log('🎨 Dashboard render() called');
        try {
            // Get data from the data module
            const { getDashboardData, getWorkflowStatus, getChangesData } = await import('./data.js');
            
            const dashboardData = getDashboardData();
            const workflowStatus = getWorkflowStatus();
            const changesData = getChangesData();
            
            console.log('📈 Dashboard data:', dashboardData);
            console.log('📈 Has companies?', dashboardData?.companies ? 'YES' : 'NO');
            console.log('📈 Has company_activity?', dashboardData?.company_activity ? 'YES' : 'NO');
            
            // Update all components
            this.updateStatsBar(dashboardData, workflowStatus);
            // Use company_activity instead of companies since that's where the data is
            this.updateCompaniesDisplay(dashboardData?.company_activity || dashboardData?.companies || []);
            await this.updateRecentChanges(changesData || dashboardData?.changes || []);
            
        } catch (error) {
            console.error('Error rendering dashboard:', error);
            this.showError(this.companiesContainer, 'Failed to load dashboard data');
        }
    }
}

// Create and export singleton instance
export const dashboard = new Dashboard();
