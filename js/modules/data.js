/**
 * @module data
 * @description Data management module handling API calls, state management, and data transformations
 * @since 1.0.0
 */

/**
 * Data Module
 * Manages all application data and state
 */

import { getApiUrl, networkConfig } from './config.js';

// Application state
const state = {
    companies: [],
    dashboardData: null,
    changesData: null,
    workflowStatus: null,
    selectedCompany: null,
    filters: {
        search: '',
        category: 'all',
        timeRange: 'all'
    },
    loading: {
        dashboard: false,
        changes: false,
        companies: false
    },
    errors: {}
};

// State getters
export function getCompanies() {
    return state.companies;
}

export function getDashboardData() {
    return state.dashboardData;
}

export function getChangesData() {
    return state.changesData;
}

export function getWorkflowStatus() {
    return state.workflowStatus;
}

export function getSelectedCompany() {
    return state.selectedCompany;
}

export function getFilters() {
    return { ...state.filters };
}

export function isLoading(component) {
    return component ? state.loading[component] : Object.values(state.loading).some(v => v);
}

export function getError(component) {
    return state.errors[component];
}

// State setters
export function setCompanies(companies) {
    state.companies = companies;
    notifyStateChange('companies', companies);
}

export function setSelectedCompany(company) {
    state.selectedCompany = company;
    notifyStateChange('selectedCompany', company);
}

export function setFilter(filterName, value) {
    state.filters[filterName] = value;
    notifyStateChange('filters', state.filters);
}

export function setLoading(component, isLoading) {
    state.loading[component] = isLoading;
    notifyStateChange('loading', { component, isLoading });
}

export function setError(component, error) {
    state.errors[component] = error;
    notifyStateChange('error', { component, error });
}

// Data loading functions
export async function loadStaticData(filename) {
    const maxRetries = networkConfig.maxRetries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(`${getApiUrl(filename)}?t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            lastError = error;
            console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${filename}:`, error.message);
            
            if (attempt < maxRetries) {
                await new Promise(resolve => 
                    setTimeout(resolve, networkConfig.retryDelay * attempt)
                );
            }
        }
    }

    console.error(`❌ Failed to load ${filename} after ${maxRetries} attempts:`, lastError.message);
    throw lastError;
}

// Load all dashboard data
export async function loadDashboardData() {
    setLoading('dashboard', true);
    setError('dashboard', null);
    
    try {
        const [dashboard, changes, workflow] = await Promise.all([
            loadStaticData('dashboard'),
            loadStaticData('changes'),
            loadStaticData('workflowStatus')
        ]);
        
        state.dashboardData = dashboard;
        state.changesData = changes;
        state.workflowStatus = workflow;
        
        // Extract companies from dashboard data
        if (dashboard.companies) {
            setCompanies(dashboard.companies);
        } else if (dashboard.company_activity) {
            setCompanies(dashboard.company_activity);
        } else {
            setCompanies([]);
        }
        
        notifyStateChange('dataLoaded', { dashboard, changes, workflow });
        return { dashboard, changes, workflow };
    } catch (error) {
        setError('dashboard', error.message);
        throw error;
    } finally {
        setLoading('dashboard', false);
    }
}

// Load company details
export async function loadCompanyDetails(companyId) {
    setLoading('companies', true);
    setError('companies', null);
    
    try {
        const details = await loadStaticData(`company-${companyId}`);
        return details;
    } catch (error) {
        setError('companies', error.message);
        throw error;
    } finally {
        setLoading('companies', false);
    }
}

// Data filtering functions
export function filterCompanies(companies, filters) {
    let filtered = [...companies];
    
    // Search filter
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(company => 
            company.name.toLowerCase().includes(searchLower) ||
            company.category?.toLowerCase().includes(searchLower) ||
            company.description?.toLowerCase().includes(searchLower)
        );
    }
    
    // Category filter
    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(company => 
            company.category === filters.category
        );
    }
    
    return filtered;
}

export function filterChanges(changes, filters) {
    let filtered = [...changes];
    
    // Time range filter
    if (filters.timeRange && filters.timeRange !== 'all') {
        const now = new Date();
        const ranges = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const cutoff = now - ranges[filters.timeRange];
        filtered = filtered.filter(change => 
            new Date(change.timestamp) > cutoff
        );
    }
    
    // Company filter
    if (filters.company) {
        filtered = filtered.filter(change => 
            change.company === filters.company
        );
    }
    
    return filtered;
}

// State change notification system
const stateListeners = new Map();

export function subscribeToState(event, callback) {
    if (!stateListeners.has(event)) {
        stateListeners.set(event, new Set());
    }
    stateListeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
        const listeners = stateListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    };
}

function notifyStateChange(event, data) {
    const listeners = stateListeners.get(event);
    if (listeners) {
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in state listener for ${event}:`, error);
            }
        });
    }
    
    // Also notify wildcard listeners
    const wildcardListeners = stateListeners.get('*');
    if (wildcardListeners) {
        wildcardListeners.forEach(callback => {
            try {
                callback({ event, data });
            } catch (error) {
                console.error(`Error in wildcard state listener:`, error);
            }
        });
    }
}

// Data transformation utilities
export function aggregateStatsByCompany(companies) {
    return companies.reduce((stats, company) => {
        stats.total++;
        stats.byCategory[company.category] = (stats.byCategory[company.category] || 0) + 1;
        stats.totalUrls += company.urls?.length || 0;
        stats.totalChanges += company.changeCount || 0;
        return stats;
    }, {
        total: 0,
        byCategory: {},
        totalUrls: 0,
        totalChanges: 0
    });
}

export function getRecentChanges(changes, limit = 10) {
    return changes
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
}

export function getHighInterestChanges(changes, threshold = 0.7) {
    return changes.filter(change => 
        change.interestScore >= threshold
    );
}

// Export state for debugging
export function getState() {
    if (process.env.NODE_ENV === 'development') {
        return { ...state };
    }
    return null;
}
