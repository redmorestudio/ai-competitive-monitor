/**
 * @module filters
 * @description Filtering and search functionality for companies, technologies, and concepts
 * @since 1.0.0
 */

/**
 * Filters and Search Module
 * Handles all filtering, searching, and sorting functionality
 */

// Filter state
let filterState = {
    searchQuery: '',
    companyFilters: new Set(), // Changed to Set for multiple selections
    technologyFilters: new Set(), // Changed to Set for multiple selections
    conceptFilters: new Set(), // Changed to Set for multiple selections
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
            const technology = (change.technology || '').toLowerCase();
            const concept = (change.concept || '').toLowerCase();
            
            // Also check in AI analysis if available
            let aiContent = '';
            if (change.ai_analysis) {
                try {
                    const analysis = typeof change.ai_analysis === 'string' 
                        ? JSON.parse(change.ai_analysis) 
                        : change.ai_analysis;
                    aiContent = JSON.stringify(analysis).toLowerCase();
                } catch (e) {
                    aiContent = change.ai_analysis.toLowerCase();
                }
            }
            
            return company.includes(query) || 
                   summary.includes(query) || 
                   url.includes(query) ||
                   category.includes(query) ||
                   technology.includes(query) ||
                   concept.includes(query) ||
                   aiContent.includes(query);
        });
    }

    // Apply company filter (OR logic)
    if (filterState.companyFilters.size > 0) {
        filtered = filtered.filter(change => 
            filterState.companyFilters.has(change.company)
        );
    }

    // Apply technology filter (OR logic)
    if (filterState.technologyFilters.size > 0) {
        filtered = filtered.filter(change => 
            change.technology && filterState.technologyFilters.has(change.technology)
        );
    }

    // Apply concept filter (OR logic)
    if (filterState.conceptFilters.size > 0) {
        filtered = filtered.filter(change => 
            change.concept && filterState.conceptFilters.has(change.concept)
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
 * Toggle company filter
 * @param {string} company - Company name to toggle
 */
export function toggleCompanyFilter(company) {
    if (filterState.companyFilters.has(company)) {
        filterState.companyFilters.delete(company);
    } else {
        filterState.companyFilters.add(company);
    }
    notifyFiltersChanged();
}

/**
 * Toggle technology filter
 * @param {string} technology - Technology name to toggle
 */
export function toggleTechnologyFilter(technology) {
    if (filterState.technologyFilters.has(technology)) {
        filterState.technologyFilters.delete(technology);
    } else {
        filterState.technologyFilters.add(technology);
    }
    notifyFiltersChanged();
}

/**
 * Toggle concept filter
 * @param {string} concept - Concept name to toggle
 */
export function toggleConceptFilter(concept) {
    if (filterState.conceptFilters.has(concept)) {
        filterState.conceptFilters.delete(concept);
    } else {
        filterState.conceptFilters.add(concept);
    }
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
        companyFilters: new Set(),
        technologyFilters: new Set(),
        conceptFilters: new Set(),
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
 * Get list of unique technologies from changes
 * @param {Array} changes - Array of changes
 * @returns {Array} Unique technology names
 */
export function getUniqueTechnologies(changes) {
    const technologies = new Set();
    changes.forEach(change => {
        if (change.technology) {
            technologies.add(change.technology);
        }
    });
    return Array.from(technologies).sort();
}

/**
 * Get list of unique concepts from changes
 * @param {Array} changes - Array of changes
 * @returns {Array} Unique concept names
 */
export function getUniqueConcepts(changes) {
    const concepts = new Set();
    changes.forEach(change => {
        if (change.concept) {
            concepts.add(change.concept);
        }
    });
    return Array.from(concepts).sort();
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
 * @param {Object} options - Options for filter dropdowns
 * @param {Array} options.companies - List of companies
 * @param {Array} options.technologies - List of technologies
 * @param {Array} options.concepts - List of concepts
 * @returns {string} HTML for filter controls
 */
export function createFilterUI(options = {}) {
    const { companies = [], technologies = [], concepts = [] } = options;
    return `
        <div class="filter-controls">
            <h4>🔍 Filter & Search Options</h4>
            
            <!-- Primary Filter Row: Search, Sort, Interest Range -->
            <div class="filter-row">
                <div class="filter-group">
                    <label for="searchInput">Search:</label>
                    <input type="text" 
                           id="searchInput" 
                           placeholder="Search companies, technologies, summaries..." 
                           class="filter-input"
                           oninput="window.filters.handleSearchInput(this.value)">
                </div>
                
                <div class="filter-group">
                    <label for="sortBy">Sort by:</label>
                    <select id="sortBy" 
                            class="filter-select"
                            onchange="window.filters.handleSort(this.value)">
                        <option value="date">Date (Newest)</option>
                        <option value="interest">Interest Level</option>
                        <option value="company">Company A-Z</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Interest Level:</label>
                    <div class="range-inputs">
                        <input type="number" 
                               id="interestMin" 
                               min="1" max="10" 
                               value="1" 
                               class="filter-input-small"
                               onchange="window.filters.handleInterestRange()">
                        <span>to</span>
                        <input type="number" 
                               id="interestMax" 
                               min="1" max="10" 
                               value="10" 
                               class="filter-input-small"
                               onchange="window.filters.handleInterestRange()">
                    </div>
                </div>
                
                <button type="button" 
                        class="reset-filters-btn" 
                        onclick="window.filters.handleReset()">
                    Reset Filters
                </button>
            </div>
            
            <!-- Secondary Filter Row: Company Checkboxes -->
            ${companies.length > 0 ? `
            <div class="filter-row-secondary">
                <div class="companies-filter">
                    <label>Companies:</label>
                    <div class="companies-checkboxes">
                        ${companies.map(company => `
                            <div class="company-checkbox">
                                <input type="checkbox" 
                                       id="company-${company.replace(/\s+/g, '-').toLowerCase()}" 
                                       value="${company}"
                                       onchange="window.filters.handleCompanyCheckbox('${company}', this.checked)">
                                <label for="company-${company.replace(/\s+/g, '-').toLowerCase()}">${company}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}

// Export handlers for UI events
export const uiHandlers = {
    handleSearchInput(value) {
        setSearchQuery(value);
    },
    
    handleCompanyCheckbox(company, isChecked) {
        if (isChecked) {
            filterState.companyFilters.add(company);
        } else {
            filterState.companyFilters.delete(company);
        }
        notifyFiltersChanged();
    },
    
    handleTechnologyCheckbox(technology, isChecked) {
        if (isChecked) {
            filterState.technologyFilters.add(technology);
        } else {
            filterState.technologyFilters.delete(technology);
        }
        notifyFiltersChanged();
    },
    
    handleConceptCheckbox(concept, isChecked) {
        if (isChecked) {
            filterState.conceptFilters.add(concept);
        } else {
            filterState.conceptFilters.delete(concept);
        }
        notifyFiltersChanged();
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
        
        // Uncheck all checkboxes
        document.querySelectorAll('.companies-checkboxes input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        document.getElementById('interestMin').value = '1';
        document.getElementById('interestMax').value = '10';
        document.getElementById('sortBy').value = 'date';
    }
};

// Set filter change callback (for integration with existing code)
export function setFiltersChangedCallback(callback) {
    onFiltersChangedCallback = callback;
}
