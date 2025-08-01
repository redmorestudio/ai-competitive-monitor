/**
 * Main Module
 * Coordinates initialization and module integration
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
import { formatDate, getRelativeTime, storage } from './utils.js';

// Export modules for global access
export { CONFIG, api };

// Initialize the application
export async function init() {
    console.log('🚀 AI Competitive Monitor - Modular Architecture');
    console.log('📊 Initializing modules...');
    
    try {
        // Load initial data
        await loadDashboardData();
        
        // Set up auto-refresh if enabled
        if (features.enableAutoRefresh && timingConfig.autoRefresh) {
            setInterval(() => {
                refreshData();
            }, timingConfig.refreshInterval);
        }
        
        // Set up state listeners
        setupStateListeners();
        
        // Initialize UI
        updateUI();
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Set up state change listeners
function setupStateListeners() {
    // Listen for company changes
    subscribeToState('companies', (companies) => {
        window.updateCompaniesDisplay?.(companies);
    });
    
    // Listen for data loaded event
    subscribeToState('dataLoaded', ({ dashboard, changes, workflow }) => {
        window.updateStatusDisplay?.(dashboard, changes);
        window.loadRecentChanges?.();
    });
    
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
}

// Refresh data
export async function refreshData() {
    console.log('🔄 Refreshing data...');
    try {
        await api.refresh('all');
        showSuccess('Data refreshed successfully');
    } catch (error) {
        console.error('Failed to refresh data:', error);
        showError('Failed to refresh data. Please try again.');
    }
}

// Update UI with current data
function updateUI() {
    const dashboard = getDashboardData();
    const changes = getChangesData();
    const workflow = getWorkflowStatus();
    
    // Update stats bar
    updateStatsBar(dashboard, workflow);
    
    // Update companies display
    updateCompaniesDisplay(getCompanies());
    
    // Update recent changes
    updateRecentChanges(changes);
}

// Update stats bar
function updateStatsBar(dashboard, workflow) {
    const statsBar = document.getElementById('statsBar');
    if (!statsBar || !dashboard) return;
    
    const totalCompanies = dashboard.companies?.length || 0;
    const totalUrls = dashboard.companies?.reduce((sum, company) => 
        sum + (company.urls?.length || 0), 0) || 0;
    const totalChanges = dashboard.totalChanges || 0;
    const lastCheck = workflow?.last_run ? 
        formatDate(workflow.last_run, { relative: true }) : 'Never';
    
    statsBar.innerHTML = `
        <div class="stat-item">🏢 <strong>${totalCompanies}</strong> Companies</div>
        <div class="stat-item">🔍 <strong>${totalUrls}</strong> URLs Monitored</div>
        <div class="stat-item">📊 <strong>${totalChanges}</strong> Changes Tracked</div>
        <div class="stat-item">⏰ Last Check: <strong>${lastCheck}</strong></div>
    `;
}

// Update companies display (placeholder - will be replaced by UI module)
function updateCompaniesDisplay(companies) {
    // This will be handled by the UI module in future sessions
    if (window.updateCompaniesDisplay) {
        window.updateCompaniesDisplay();
    }
}

// Update recent changes (placeholder - will be replaced by UI module)
function updateRecentChanges(changes) {
    // This will be handled by the UI module in future sessions
    if (window.loadRecentChanges) {
        window.loadRecentChanges();
    }
}

// Loading state management
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

// Error/Success message display
function showError(message) {
    console.error(message);
    // TODO: Implement toast/notification system
}

function showSuccess(message) {
    console.log(message);
    // TODO: Implement toast/notification system
}

// Public API for integration with existing code
export const app = {
    init,
    refreshData,
    
    // Data access
    getCompanies,
    getDashboardData,
    getChangesData,
    getWorkflowStatus,
    
    // Utilities
    formatDate,
    getRelativeTime,
    storage,
    
    // API access
    api
};

// Make app available globally for easy migration
window.AIMonitor = app;

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
