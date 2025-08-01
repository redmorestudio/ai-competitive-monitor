/**
 * @module utils
 * @description Utility functions for formatting, storage, and common operations
 * @since 1.0.0
 */

/**
 * Utilities Module
 * Common utility functions used across the application
 */

// Format date/time for display
export function formatDate(date, options = {}) {
    const d = new Date(date);
    
    if (options.relative) {
        return getRelativeTime(d);
    }
    
    if (options.time) {
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Get relative time string (e.g., "2 hours ago")
export function getRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const seconds = Math.floor((now - d) / 1000);
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
        }
    }
    
    return 'just now';
}

// Format numbers with commas
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Truncate text with ellipsis
export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Get category color
export function getCategoryColor(category) {
    const colors = {
        'automotive': '#FF6B6B',
        'finance': '#4ECDC4',
        'retail': '#45B7D1',
        'technology': '#96CEB4',
        'healthcare': '#9B59B6',
        'energy': '#F39C12',
        'default': '#95A5A6'
    };
    
    return colors[category?.toLowerCase()] || colors.default;
}

// Get interest score color
export function getInterestScoreColor(score) {
    if (score >= 0.8) return '#FF6B6B';  // High interest - red
    if (score >= 0.6) return '#FFA726';  // Medium-high - orange
    if (score >= 0.4) return '#FFEE58';  // Medium - yellow
    return '#66BB6A';  // Low - green
}

// Debounce function for performance
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Deep clone object
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// Generate unique ID
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Parse query parameters from URL
export function parseQueryParams(url = window.location.href) {
    const params = new URLSearchParams(new URL(url).search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

// Build query string from object
export function buildQueryString(params) {
    return Object.entries(params)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

// Safe JSON parse
export function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('Failed to parse JSON:', e);
        return defaultValue;
    }
}

// Local storage wrapper with error handling
export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? safeJsonParse(item, defaultValue) : defaultValue;
        } catch (e) {
            console.warn('Failed to get from storage:', e);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Failed to set in storage:', e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Failed to remove from storage:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Failed to clear storage:', e);
            return false;
        }
    }
};

// Event emitter for custom events
export class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}

// Fetch with retry logic
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            lastError = error;
            console.warn(`Fetch attempt ${i + 1} failed:`, error);
            
            if (i < maxRetries - 1) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }
    
    throw lastError;
}

// HTML escape function for security
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Get interest level color based on score
export function getInterestColor(score) {
    if (score >= 8) return '#ff4444';  // High interest - red
    if (score >= 6) return '#ff8800';  // Medium-high - orange
    if (score >= 4) return '#ffcc00';  // Medium - yellow
    return '#44ff44';  // Low - green
}

// Get interest level emoji based on score
export function getInterestEmoji(score) {
    if (score >= 8) return '🔥';  // High interest
    if (score >= 6) return '⚡';  // Medium-high
    if (score >= 4) return '💡';  // Medium
    return '💚';  // Low
}

// Export utility functions for testing
export const utils = {
    formatDate,
    getRelativeTime,
    formatNumber,
    truncateText,
    getCategoryColor,
    getInterestScoreColor,
    debounce,
    throttle,
    deepClone,
    generateId,
    parseQueryParams,
    buildQueryString,
    safeJsonParse,
    fetchWithRetry
};
