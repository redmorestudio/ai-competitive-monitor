/**
 * @module api
 * @description API client for backend communication with retry logic and error handling
 * @since 1.0.0
 */

/**
 * API Module
 * Handles all API interactions and data fetching
 */

import { getApiUrl, networkConfig } from './config.js';
import { setLoading, setError } from './data.js';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear expired cache entries
function clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
        }
    }
}

// Periodic cache cleanup
setInterval(clearExpiredCache, 60 * 1000); // Every minute

// Generic fetch with retry logic
async function fetchWithRetry(url, options = {}, retries = networkConfig.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), networkConfig.timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            if (error.name === 'AbortError') {
                console.error(`Request timeout for ${url}`);
            } else {
                console.warn(`Attempt ${attempt}/${retries} failed for ${url}:`, error.message);
            }
            
            if (attempt < retries) {
                await new Promise(resolve => 
                    setTimeout(resolve, networkConfig.retryDelay * attempt)
                );
            }
        }
    }
    
    throw lastError;
}

// Fetch JSON data with caching
async function fetchJson(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    const cacheKey = `${url}${JSON.stringify(options)}`;
    
    // Check cache first
    if (!options.noCache && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }
    
    // Add timestamp to prevent browser caching
    const urlWithTimestamp = `${url}?t=${Date.now()}`;
    
    const response = await fetchWithRetry(urlWithTimestamp, options);
    const data = await response.json();
    
    // Cache the response
    cache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
    
    return data;
}

// API methods
export const api = {
    // Load dashboard data
    async getDashboard() {
        setLoading('dashboard', true);
        try {
            const data = await fetchJson('dashboard');
            setError('dashboard', null);
            return data;
        } catch (error) {
            setError('dashboard', error.message);
            throw error;
        } finally {
            setLoading('dashboard', false);
        }
    },
    
    // Load changes data
    async getChanges(options = {}) {
        setLoading('changes', true);
        try {
            const data = await fetchJson('changes', options);
            setError('changes', null);
            return data;
        } catch (error) {
            setError('changes', error.message);
            throw error;
        } finally {
            setLoading('changes', false);
        }
    },
    
    // Load workflow status
    async getWorkflowStatus() {
        try {
            return await fetchJson('workflowStatus', { noCache: true });
        } catch (error) {
            console.error('Failed to load workflow status:', error);
            return null;
        }
    },
    
    // Load company details
    async getCompanyDetails(companyId) {
        setLoading('companyDetails', true);
        try {
            const data = await fetchJson(`company-${companyId}`);
            setError('companyDetails', null);
            return data;
        } catch (error) {
            setError('companyDetails', error.message);
            throw error;
        } finally {
            setLoading('companyDetails', false);
        }
    },
    
    // Load graph data for 3D visualization
    async getGraphData() {
        setLoading('graph', true);
        try {
            const data = await fetchJson('graphData');
            setError('graph', null);
            return data;
        } catch (error) {
            setError('graph', error.message);
            throw error;
        } finally {
            setLoading('graph', false);
        }
    },
    
    // Load all data in parallel
    async getAllData() {
        setLoading('all', true);
        try {
            const [dashboard, changes, workflowStatus] = await Promise.all([
                this.getDashboard(),
                this.getChanges(),
                this.getWorkflowStatus()
            ]);
            
            return { dashboard, changes, workflowStatus };
        } catch (error) {
            console.error('Failed to load all data:', error);
            throw error;
        } finally {
            setLoading('all', false);
        }
    },
    
    // Refresh specific data
    async refresh(dataType) {
        // Clear cache for the specific data type
        const endpoints = {
            dashboard: 'dashboard',
            changes: 'changes',
            workflow: 'workflowStatus',
            all: null
        };
        
        if (dataType === 'all') {
            cache.clear();
            return this.getAllData();
        } else if (endpoints[dataType]) {
            const url = getApiUrl(endpoints[dataType]);
            // Remove from cache
            for (const key of cache.keys()) {
                if (key.startsWith(url)) {
                    cache.delete(key);
                }
            }
            
            // Fetch fresh data
            switch (dataType) {
                case 'dashboard':
                    return this.getDashboard();
                case 'changes':
                    return this.getChanges();
                case 'workflow':
                    return this.getWorkflowStatus();
            }
        }
    },
    
    // Clear all cached data
    clearCache() {
        cache.clear();
        },
    
    // Get cache statistics (for debugging)
    getCacheStats() {
        return {
            size: cache.size,
            entries: Array.from(cache.keys())
        };
    }
};

// Export for testing and migration
export { fetchWithRetry, fetchJson };
