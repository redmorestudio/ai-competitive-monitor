/**
 * @module config
 * @description Application configuration including API endpoints, UI settings, and feature flags
 * @since 1.0.0
 */

/**
 * Configuration Module
 * Centralizes all application configuration
 */

// Application configuration
export const CONFIG = {
    // GitHub repository configuration
    github: {
        repo: 'redmorestudio/ai-competitive-monitor',
        repoUrl: 'https://github.com/redmorestudio/ai-competitive-monitor'
    },
    
    // API configuration
    api: {
        baseUrl: './api-data',  // Static files served by GitHub Pages
        endpoints: {
            dashboard: 'dashboard.json',
            changes: 'changes.json',
            workflowStatus: 'workflow-status.json',
            companyDetails: 'company-details.json',
            graphData: 'graph-data.json',
            entityGroups: 'entity-groups.json'  // NEW: Entity groups endpoint
        }
    },
    
    // Timing configuration
    timing: {
        refreshInterval: 5 * 60 * 1000, // 5 minutes
        autoRefresh: true
    },
    
    // Network configuration
    network: {
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 30000 // 30 seconds
    },
    
    // UI configuration
    ui: {
        maxRecentChanges: 10,
        maxChangesPerCompany: 5,
        animationDuration: 300,
        modalFadeDelay: 100
    },
    
    // Feature flags
    features: {
        enableAutoRefresh: true,
        enableNotifications: false,
        enableAdvancedFilters: true,
        enable3DGraph: true
    },
    
    // Thresholds and limits
    thresholds: {
        highInterestScore: 0.7,
        significantChangeWords: 50,
        recentChangeHours: 24
    }
};

// Get configuration value by path (e.g., 'api.baseUrl')
export function getConfig(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], CONFIG);
}

// Update configuration value dynamically
export function setConfig(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
        if (!obj[key]) obj[key] = {};
        return obj[key];
    }, CONFIG);
    target[lastKey] = value;
}

// Get full API URL for an endpoint
export function getApiUrl(endpoint) {
    const baseUrl = CONFIG.api.baseUrl;
    const endpointPath = CONFIG.api.endpoints[endpoint] || endpoint;
    return `${baseUrl}/${endpointPath}`;
}

// Export individual config sections for convenience
export const githubConfig = CONFIG.github;
export const apiConfig = CONFIG.api;
export const timingConfig = CONFIG.timing;
export const networkConfig = CONFIG.network;
export const uiConfig = CONFIG.ui;
export const features = CONFIG.features;
export const thresholds = CONFIG.thresholds;
