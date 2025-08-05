/**
 * @module main
 * @description Central application coordinator that manages initialization, module integration, and cross-module communication
 * @since 1.0.0
 */

/**
 * Main Module - Central Application Coordinator
 * Manages initialization, module integration, and cross-module communication
 */

import { CONFIG, timingConfig, features } from './config.js';
import { 
    loadDashboardData, 
    getCompanies, 
    getDashboardData,
    getChangesData,
    getWorkflowStatus,
    subscribeToState 
} from './data.js';
import { api } from './api.js';
import { formatDate, getRelativeTime, storage, escapeHtml, getInterestEmoji } from './utils.js';
import { initControls } from './controls.js';
import { initFilters, applyFilters, createFilterUI } from './filters.js';
import { dashboard } from './dashboard.js';
import { ui } from './ui.js';
import { VERSION, displayVersion } from './version.js';
import { kwic } from './kwic.js';
import { entityDisplay } from './entityDisplay.js';

// Global application state
const appState = {
    initialized: false,
    currentView: 'dashboard',
    filterState: {},
    refreshInterval: null
};

/**
 * Initialize the application
 * @async
 * @returns {Promise<void>}
 */
export async function init() {
    if (appState.initialized) {
        console.warn('⚠️ Application already initialized');
        return;
    }
    
    const startTime = performance.now();
    
    try {
        // Initialize modules in correct order
        // 1. Initialize controls (handles modals, tabs, etc.)
        initControls();
        
        // 2. Initialize dashboard UI
        dashboard.init();
        
        // 3. Initialize UI module
        ui.init();
        
        // 4. Initialize filters
        initFilters();
        
        // 5. Initialize KWIC module
        kwic.init();
        
        // 6. Initialize entity display module
        entityDisplay.init();
        
        // 7. Load initial data
        await loadInitialData();
        
        // 6. Set up auto-refresh
        if (features.autoRefresh) {
            setupAutoRefresh();
        }
        
        // 7. Subscribe to state changes
        setupStateSubscriptions();
        
        // 8. Display version information
        displayVersionInfo();
        
        appState.initialized = true;
        
        const loadTime = performance.now() - startTime;
        ui.showNotification(`✅ Application loaded in ${loadTime.toFixed(0)}ms`, 'success');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        ui.showNotification('Failed to initialize application', 'error');
        throw error;
    }
}

/**
 * Load initial data
 * @async
 * @private
 * @returns {Promise<void>}
 */
async function loadInitialData() {
    ui.showLoading();
    
    try {
        await loadDashboardData();
        
        // Initialize current view
        const currentTab = document.querySelector('.tab.active')?.dataset.tab || 'dashboard';
        appState.currentView = currentTab;
        
        if (currentTab === 'dashboard') {
            dashboard.render();
        } else if (currentTab === 'changes') {
            renderChangesView();
        }
        
    } finally {
        ui.hideLoading();
    }
}

/**
 * Set up state subscriptions
 * @private
 */
function setupStateSubscriptions() {
    // Subscribe to data changes
    subscribeToState((state) => {
        if (appState.currentView === 'dashboard') {
            dashboard.render();
        } else if (appState.currentView === 'changes') {
            renderChangesView();
        }
    });
}

/**
 * Set up auto-refresh
 * @private
 */
function setupAutoRefresh() {
    const refreshInterval = timingConfig.dashboardRefresh || 300000; // Default 5 minutes
    
    appState.refreshInterval = setInterval(() => {
        refreshData();
    }, refreshInterval);
}

/**
 * Refresh data
 * @async
 * @param {Event} [event] - Optional event object
 * @returns {Promise<void>}
 */
export async function refreshData(event) {
    if (event) {
        event.preventDefault();
    }
    
    ui.showNotification('🔄 Refreshing data...', 'info');
    
    try {
        await loadDashboardData();
        ui.showNotification('✅ Data refreshed', 'success');
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        ui.showNotification('Failed to refresh data', 'error');
    }
}

/**
 * Switch view
 * @param {string} view - View name ('dashboard' or 'changes')
 */
export function switchView(view) {
    appState.currentView = view;
    
    if (view === 'dashboard') {
        dashboard.render();
    } else if (view === 'changes') {
        renderChangesView();
    }
}

/**
 * Render changes view
 * @private
 */
function renderChangesView() {
    const changesContent = document.getElementById('changesContent');
    const changesData = getChangesData();
    const filterContainer = document.getElementById('filterContainer');
    
    if (!changesData || changesData.length === 0) {
        changesContent.innerHTML = '<div class="empty-state">No changes found</div>';
        return;
    }
    
    // Create filter UI
    filterContainer.innerHTML = createFilterUI();
    
    // Apply filters and render
    const filteredChanges = applyFilters(changesData, appState.filterState);
    renderFilteredChanges(filteredChanges);
}

/**
 * Render filtered changes
 * @private
 * @param {Array} changes - Filtered changes array
 */
function renderFilteredChanges(changes) {
    const changesContent = document.getElementById('changesContent');
    
    if (changes.length === 0) {
        changesContent.innerHTML = '<div class="empty-state">No changes match the current filters</div>';
        return;
    }
    
    const html = changes.map(change => {
        const emoji = getInterestEmoji(change.interest_level);
        const companyBadge = change.company ? 
            `<span class="company-badge">${escapeHtml(change.company)}</span>` : '';
        
        return `
            <div class="change-item" data-change-id="${change.id}">
                <div class="change-header">
                    <span class="change-type ${change.change_type}">${change.change_type}</span>
                    ${companyBadge}
                    <span class="change-date">${getRelativeTime(change.detection_date)}</span>
                </div>
                <div class="change-content">
                    <strong>${escapeHtml(change.title || change.item || 'Change')}</strong>
                    ${change.description ? `<p>${escapeHtml(change.description)}</p>` : ''}
                </div>
                <div class="change-meta">
                    <span class="interest-level">${emoji} ${change.interest_level}</span>
                    ${change.url ? `<a href="${change.url}" target="_blank">View →</a>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    changesContent.innerHTML = html;
}

/**
 * Update filter state
 * @param {string} filterType - Type of filter
 * @param {*} value - Filter value
 */
export function updateFilter(filterType, value) {
    appState.filterState[filterType] = value;
    
    if (appState.currentView === 'changes') {
        renderChangesView();
    }
}

/**
 * Clear all filters
 */
export function clearFilters() {
    appState.filterState = {};
    
    if (appState.currentView === 'changes') {
        renderChangesView();
    }
}

/**
 * Display version information
 * @private
 */
function displayVersionInfo() {
    // Try to display version in a dedicated element if it exists
    displayVersion('versionInfo');
    
    // Also log to console for debugging
    console.log(`🚀 AI Monitor ${VERSION.number} - ${VERSION.name}`);
    console.log(`Build: ${VERSION.buildNumber} | Released: ${VERSION.releaseDate}`);
}

/**
 * Clean up resources
 */
export function cleanup() {
    if (appState.refreshInterval) {
        clearInterval(appState.refreshInterval);
        appState.refreshInterval = null;
    }
}

// Export main app interface
export const app = {
    init,
    refreshData,
    switchView,
    updateFilter,
    clearFilters,
    cleanup
};

// Make app available globally for onclick handlers
window.app = app;