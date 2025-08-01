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
import { formatDate, getRelativeTime, storage, escapeHtml, formatTimeAgo, getInterestEmoji } from './utils.js';
import { initControls } from './controls.js';
import { initFilters, applyFilters, createFilterUI } from './filters.js';
import { dashboard } from './dashboard.js';
import { ui } from './ui.js';

// Global application state
const appState = {
    initialized: false,
    currentView: 'dashboard',
    filterState: {},
    refreshInterval: null
};

/**
 * Initialize the application
 */
export async function init() {
    console.log('🚀 AI Competitive Monitor - Modular Architecture');
    console.log('📊 Initializing application...');
    
    if (appState.initialized) {
        console.warn('⚠️ Application already initialized');
        return;
    }
    
    try {
        // Initialize modules in correct order
        console.log('📦 Initializing modules...');
        
        // 1. Initialize controls (handles modals, tabs, etc.)
        initControls();
        
        // 2. Initialize dashboard UI
        dashboard.init();
        
        // 3. Initialize UI module
        ui.init();
        
        // 4. Initialize filters
        initFilters(handleFiltersChanged);
        
        // 5. Set up state listeners
        setupStateListeners();
        
        // 6. Load initial data
        await loadInitialData();
        
        // 7. Set up auto-refresh if enabled
        if (features.enableAutoRefresh && timingConfig.autoRefresh) {
            setupAutoRefresh();
        }
        
        // 8. Set up global event handlers
        setupGlobalHandlers();
        
        appState.initialized = true;
        console.log('✅ Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Load initial data for all components
 */
async function loadInitialData() {
    console.log('📥 Loading initial data...');
    
    try {
        // Load dashboard data (companies, changes, status)
        await loadDashboardData();
        
        // Update UI with loaded data
        await updateAllUI();
        
        // Load changes for the changes tab
        await loadChangesTab();
        
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        throw error;
    }
}

/**
 * Set up state change listeners
 */
function setupStateListeners() {
    // Listen for loading state changes
    subscribeToState('loading', ({ component, isLoading }) => {
        updateLoadingState(component, isLoading);
    });
    
    // Listen for errors
    subscribeToState('error', ({ component, error }) => {
        if (error) {
            showError(`Error loading ${component}: ${error}`);
        }
    });
    
    // Listen for data updates
    subscribeToState('dataUpdated', ({ component }) => {
        console.log(`📊 Data updated for ${component}`);
        updateComponentUI(component);
    });
}

/**
 * Set up global event handlers
 */
function setupGlobalHandlers() {
    // Make refresh function globally available
    window.refreshStatus = refreshData;
    
    // Tab switching
    window.addEventListener('tabChanged', (event) => {
        appState.currentView = event.detail.tab;
        console.log(`📑 Switched to ${appState.currentView} view`);
    });
}

/**
 * Set up auto-refresh
 */
function setupAutoRefresh() {
    console.log(`⏰ Setting up auto-refresh (${timingConfig.refreshInterval}ms)`);
    
    appState.refreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refresh triggered');
        await refreshData();
    }, timingConfig.refreshInterval);
}

/**
 * Refresh all data
 */
export async function refreshData(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log('🔄 Starting comprehensive data refresh...');
    
    try {
        // Show loading states
        updateLoadingState('dashboard', true);
        updateLoadingState('changes', true);
        updateLoadingState('recent', true);
        
        // Refresh all data through the data module
        await api.refresh('all');
        
        // Reload dashboard data
        await loadDashboardData();
        
        // Update all UI components
        await updateAllUI();
        
        // Update changes tab if visible
        if (appState.currentView === 'changes') {
            await loadChangesTab();
        }
        
        console.log('✨ Data refresh complete!');
        showSuccess('Data refreshed successfully');
        
    } catch (error) {
        console.error('❌ Error during refresh:', error);
        showError('Failed to refresh data. Please try again.');
    } finally {
        // Hide loading states
        updateLoadingState('dashboard', false);
        updateLoadingState('changes', false);
        updateLoadingState('recent', false);
    }
}

/**
 * Update all UI components
 */
async function updateAllUI() {
    const dashboardData = getDashboardData();
    const workflowStatus = getWorkflowStatus();
    const companies = getCompanies();
    
    // Update stats bar
    dashboard.updateStatsBar(dashboardData, workflowStatus);
    
    // Update companies display
    dashboard.updateCompaniesDisplay(companies);
    
    // Update recent changes
    const changesData = await api.fetchJSON('changes.json');
    await dashboard.updateRecentChanges(changesData);
}

/**
 * Update specific component UI
 */
function updateComponentUI(component) {
    switch (component) {
        case 'dashboard':
            const companies = getCompanies();
            dashboard.updateCompaniesDisplay(companies);
            break;
            
        case 'changes':
            if (appState.currentView === 'changes') {
                loadChangesTab();
            }
            break;
            
        case 'stats':
            const dashboardData = getDashboardData();
            const workflowStatus = getWorkflowStatus();
            dashboard.updateStatsBar(dashboardData, workflowStatus);
            break;
    }
}

/**
 * Load and display changes tab
 */
async function loadChangesTab() {
    const changesContent = document.getElementById('changesContent');
    if (!changesContent) return;
    
    try {
        const changes = getChangesData();
        
        // Create filter UI if not exists
        const filterContainer = document.getElementById('filterContainer');
        if (filterContainer && !filterContainer.hasChildNodes()) {
            filterContainer.innerHTML = createFilterUI();
        }
        
        // Apply filters and display
        const filteredChanges = applyFilters(changes);
        ui.displayChanges(filteredChanges);
        
    } catch (error) {
        console.error('Error loading changes:', error);
        changesContent.innerHTML = '<div class="error-message">Error loading changes</div>';
    }
}



/**
 * Handle filter changes
 */
function handleFiltersChanged(filterState) {
    console.log('🎛️ Filters changed:', filterState);
    appState.filterState = filterState;
    
    // Reload changes tab with new filters
    if (appState.currentView === 'changes') {
        loadChangesTab();
    }
}

/**
 * Update loading state for components
 */
function updateLoadingState(component, isLoading) {
    const elements = {
        dashboard: document.querySelector('#companiesDisplay .loading'),
        changes: document.querySelector('#changesContent .loading'),
        recent: document.querySelector('#recentChanges .loading')
    };
    
    const element = elements[component];
    if (element) {
        element.style.display = isLoading ? 'block' : 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    console.error('❌', message);
    // TODO: Implement toast notification system
    // For now, use alert as fallback
    if (appState.initialized) {
        // Only show alerts after initialization to avoid blocking
        setTimeout(() => {
            if (confirm(message + '\n\nWould you like to refresh the page?')) {
                window.location.reload();
            }
        }, 100);
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    console.log('✅', message);
    // TODO: Implement toast notification system
}

/**
 * Public API
 */
export const app = {
    // Core functions
    init,
    refreshData,
    
    // State
    getState: () => ({ ...appState }),
    
    // Data access
    getCompanies,
    getDashboardData,
    getChangesData,
    getWorkflowStatus,
    
    // UI updates
    updateAllUI,
    showError,
    showSuccess,
    
    // Module access
    api,
    dashboard,
    
    // Utilities
    formatDate,
    getRelativeTime,
    storage
};

// Make app globally available
window.app = app;

// Also expose utilities globally for backward compatibility
window.utils = {
    escapeHtml,
    formatTimeAgo,
    getInterestEmoji,
    formatDate,
    getRelativeTime
};

// Export for module usage
export default app;
