/**
 * Filters and Search Module
 * Handles all filtering, searching, and sorting functionality
 */

// Filter state
let filterState = {
    searchQuery: '',
    companyFilter: 'all',
    interestLevelMin: 1,
    interestLevelMax: 10,
    dateRangeStart: null,
    dateRangeEnd: null,
    sortBy: 'date', // 'date', 'interest', 'company'
    sortOrder: 'desc' // 'asc', 'desc'
};

// Active filters callback
let onFiltersChangedCallback = null;

/**
 * Initialize filters module
 * @param {Function} onFiltersChanged - Callback when filters change
 */
export function initFilters(onFiltersChanged) {
    onFiltersChangedCallback = onFiltersChanged;
    
    // Also check for global callback (for existing code integration)
    if (!onFiltersChangedCallback && window.onFiltersChanged) {
        onFiltersChangedCallback = window.onFiltersChanged;
    }
}

/**
 * Apply filters to a list of changes
 * @param {Array} changes - Array of change objects
 * @returns {Array} Filtered changes
 */
export function applyFilters(changes) {
    if (!Array.isArray(changes)) {
        return [];
    }

    let filtered = [...changes];

    // Apply search query filter
    if (filterState.searchQuery) {
        const query = filterState.searchQuery.toLowerCase();
        filtered = filtered.filter(change => {
            const company = (change.company || '').toLowerCase();
            const summary = (change.summary || '').toLowerCase();
            const url = (change.url || change.page_url || '').toLowerCase();
            const category = (change.category || '').toLowerCase();
            
            return company.includes(query) || 
                   summary.includes(query) || 
                   url.includes(query) ||
                   category.includes(query);
        });
    }

    // Apply company filter
    if (filterState.companyFilter !== 'all') {
        filtered = filtered.filter(change => 
            change.company === filterState.companyFilter
        );
    }

    // Apply interest level filter
    filtered = filtered.filter(change => {
        const level = change.interest_level || 1;
        return level >= filterState.interestLevelMin && 
               level <= filterState.interestLevelMax;
    });

    // Apply date range filter
    if (filterState.dateRangeStart || filterState.dateRangeEnd) {
        filtered = filtered.filter(change => {
            const changeDate = new Date(change.detected_at || change.detectedAt || change.created_at);
            
            if (filterState.dateRangeStart && changeDate < new Date(filterState.dateRangeStart)) {
                return false;
            }
            
            if (filterState.dateRangeEnd && changeDate > new Date(filterState.dateRangeEnd)) {
                return false;
            }
            
            return true;
        });
    }

    // Apply sorting
    filtered = sortChanges(filtered, filterState.sortBy, filterState.sortOrder);

    return filtered;
}

/**
 * Sort changes by specified criteria
 * @param {Array} changes - Array of changes
 * @param {string} sortBy - Sort criteria
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Array} Sorted changes
 */
function sortChanges(changes, sortBy, sortOrder) {
    const sorted = [...changes];
    
    sorted.sort((a, b) => {
        let compareValue = 0;
        
        switch (sortBy) {
            case 'date':
                const dateA = new Date(a.detected_at || a.detectedAt || a.created_at);
                const dateB = new Date(b.detected_at || b.detectedAt || b.created_at);
                compareValue = dateB - dateA;
                break;
                
            case 'interest':
                compareValue = (b.interest_level || 1) - (a.interest_level || 1);
                break;
                
            case 'company':
                compareValue = (a.company || '').localeCompare(b.company || '');
                break;
                
            default:
                // Default to date
                const defaultDateA = new Date(a.detected_at || a.detectedAt || a.created_at);
                const defaultDateB = new Date(b.detected_at || b.detectedAt || b.created_at);
                compareValue = defaultDateB - defaultDateA;
        }
        
        // Apply sort order
        return sortOrder === 'asc' ? -compareValue : compareValue;
    });
    
    return sorted;
}

/**
 * Update search query
 * @param {string} query - Search query
 */
export function setSearchQuery(query) {
    filterState.searchQuery = query;
    notifyFiltersChanged();
}

/**
 * Update company filter
 * @param {string} company - Company name or 'all'
 */
export function setCompanyFilter(company) {
    filterState.companyFilter = company;
    notifyFiltersChanged();
}

/**
 * Update interest level filter
 * @param {number} min - Minimum interest level
 * @param {number} max - Maximum interest level
 */
export function setInterestLevelFilter(min, max) {
    filterState.interestLevelMin = Math.max(1, Math.min(10, min));
    filterState.interestLevelMax = Math.max(1, Math.min(10, max));
    notifyFiltersChanged();
}

/**
 * Update date range filter
 * @param {Date|string|null} start - Start date
 * @param {Date|string|null} end - End date
 */
export function setDateRangeFilter(start, end) {
    filterState.dateRangeStart = start;
    filterState.dateRangeEnd = end;
    notifyFiltersChanged();
}

/**
 * Update sort criteria
 * @param {string} sortBy - Sort criteria
 * @param {string} sortOrder - Sort order
 */
export function setSorting(sortBy, sortOrder = 'desc') {
    filterState.sortBy = sortBy;
    filterState.sortOrder = sortOrder;
    notifyFiltersChanged();
}

/**
 * Reset all filters to default
 */
export function resetFilters() {
    filterState = {
        searchQuery: '',
        companyFilter: 'all',
        interestLevelMin: 1,
        interestLevelMax: 10,
        dateRangeStart: null,
        dateRangeEnd: null,
        sortBy: 'date',
        sortOrder: 'desc'
    };
    notifyFiltersChanged();
}

/**
 * Get current filter state
 * @returns {Object} Current filter state
 */
export function getFilterState() {
    return { ...filterState };
}

/**
 * Get list of unique companies from changes
 * @param {Array} changes - Array of changes
 * @returns {Array} Unique company names
 */
export function getUniqueCompanies(changes) {
    const companies = new Set();
    changes.forEach(change => {
        if (change.company) {
            companies.add(change.company);
        }
    });
    return Array.from(companies).sort();
}

/**
 * Filter changes by interest level threshold
 * @param {Array} changes - Array of changes
 * @param {number} threshold - Minimum interest level
 * @returns {Array} Filtered changes
 */
export function filterHighInterestChanges(changes, threshold = 7) {
    return changes.filter(change => (change.interest_level || 0) >= threshold);
}

/**
 * Get recent changes within time period
 * @param {Array} changes - Array of changes
 * @param {number} days - Number of days to look back
 * @returns {Array} Recent changes
 */
export function getRecentChanges(changes, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return changes.filter(change => {
        const changeDate = new Date(change.detected_at || change.detectedAt || change.created_at);
        return changeDate >= cutoffDate;
    });
}

/**
 * Group changes by company
 * @param {Array} changes - Array of changes
 * @returns {Object} Changes grouped by company
 */
export function groupChangesByCompany(changes) {
    const grouped = {};
    
    changes.forEach(change => {
        const company = change.company || 'Unknown';
        if (!grouped[company]) {
            grouped[company] = [];
        }
        grouped[company].push(change);
    });
    
    return grouped;
}

/**
 * Group changes by date
 * @param {Array} changes - Array of changes
 * @returns {Object} Changes grouped by date
 */
export function groupChangesByDate(changes) {
    const grouped = {};
    
    changes.forEach(change => {
        const changeDate = new Date(change.detected_at || change.detectedAt || change.created_at);
        const dateKey = changeDate.toLocaleDateString();
        
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(change);
    });
    
    return grouped;
}

/**
 * Notify that filters have changed
 */
function notifyFiltersChanged() {
    if (onFiltersChangedCallback) {
        onFiltersChangedCallback(filterState);
    }
}

/**
 * Create filter UI HTML
 * @param {Array} companies - List of companies for dropdown
 * @returns {string} HTML for filter controls
 */
export function createFilterUI(companies = []) {
    return `
        <div class="filter-controls">
            <div class="filter-row">
                <!-- Search Input -->
                <div class="filter-group">
                    <label for="searchInput">Search:</label>
                    <input type="text" 
                           id="searchInput" 
                           placeholder="Search changes..." 
                           class="filter-input"
                           oninput="window.filters.handleSearchInput(this.value)">
                </div>
                
                <!-- Company Filter -->
                <div class="filter-group">
                    <label for="companyFilter">Company:</label>
                    <select id="companyFilter" 
                            class="filter-select"
                            onchange="window.filters.handleCompanyFilter(this.value)">
                        <option value="all">All Companies</option>
                        ${companies.map(company => 
                            `<option value="${company}">${company}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <!-- Interest Level Range -->
                <div class="filter-group">
                    <label>Interest Level:</label>
                    <div class="range-inputs">
                        <input type="number" 
                               id="interestMin" 
                               min="1" max="10" 
                               value="1" 
                               class="filter-input-small"
                               onchange="window.filters.handleInterestRange()">
                        <span>-</span>
                        <input type="number" 
                               id="interestMax" 
                               min="1" max="10" 
                               value="10" 
                               class="filter-input-small"
                               onchange="window.filters.handleInterestRange()">
                    </div>
                </div>
                
                <!-- Sort Options -->
                <div class="filter-group">
                    <label for="sortBy">Sort by:</label>
                    <select id="sortBy" 
                            class="filter-select"
                            onchange="window.filters.handleSort(this.value)">
                        <option value="date">Date</option>
                        <option value="interest">Interest Level</option>
                        <option value="company">Company</option>
                    </select>
                </div>
                
                <!-- Reset Button -->
                <div class="filter-group">
                    <button type="button" 
                            class="button button-secondary" 
                            onclick="window.filters.handleReset()">
                        Reset Filters
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Export handlers for UI events
export const uiHandlers = {
    handleSearchInput(value) {
        setSearchQuery(value);
    },
    
    handleCompanyFilter(value) {
        setCompanyFilter(value);
    },
    
    handleInterestRange() {
        const min = parseInt(document.getElementById('interestMin').value) || 1;
        const max = parseInt(document.getElementById('interestMax').value) || 10;
        setInterestLevelFilter(min, max);
    },
    
    handleSort(value) {
        setSorting(value);
    },
    
    handleReset() {
        resetFilters();
        // Reset UI elements
        document.getElementById('searchInput').value = '';
        document.getElementById('companyFilter').value = 'all';
        document.getElementById('interestMin').value = '1';
        document.getElementById('interestMax').value = '10';
        document.getElementById('sortBy').value = 'date';
    }
};

// Set filter change callback (for integration with existing code)
export function setFiltersChangedCallback(callback) {
    onFiltersChangedCallback = callback;
}
