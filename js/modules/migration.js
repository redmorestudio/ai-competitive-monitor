/**
 * Migration Helper
 * Bridges the old global functions with the new modular architecture
 */

import { app } from './main.js';
import { CONFIG } from './config.js';
import { 
    setSelectedCompany,
    loadDashboardData,
    getCompanies,
    getDashboardData,
    getChangesData
} from './data.js';
import { api } from './api.js';

// Migrate global CONFIG
window.CONFIG = CONFIG;

// Migrate global state variables
Object.defineProperty(window, 'companies', {
    get() { return getCompanies(); },
    set(value) { console.warn('Direct assignment to companies is deprecated. Use data module.'); }
});

Object.defineProperty(window, 'dashboardData', {
    get() { return getDashboardData(); },
    set(value) { console.warn('Direct assignment to dashboardData is deprecated. Use data module.'); }
});

Object.defineProperty(window, 'workflowStatus', {
    get() { return app.getWorkflowStatus(); },
    set(value) { console.warn('Direct assignment to workflowStatus is deprecated. Use data module.'); }
});

// Migrate global functions
window.init = function() {
    console.log('Legacy init() called - redirecting to modular init');
    return app.init();
};

window.loadStaticData = async function(filename) {
    console.log('Legacy loadStaticData() called - redirecting to API module');
    return api.fetchJson(filename);
};

window.refreshStatus = async function(event) {
    console.log('Legacy refreshStatus() called - redirecting to app.refreshData');
    
    if (event) {
        event.preventDefault();
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '⏳ Loading...';
        button.disabled = true;

        try {
            await app.refreshData();
        } finally {
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }
    } else {
        await app.refreshData();
    }
};

// Ensure existing UI functions continue to work
const originalUpdateStatusDisplay = window.updateStatusDisplay;
window.updateStatusDisplay = function(data, changesData) {
    console.log('Legacy updateStatusDisplay() called');
    if (originalUpdateStatusDisplay) {
        originalUpdateStatusDisplay(data, changesData);
    }
};

const originalUpdateCompaniesDisplay = window.updateCompaniesDisplay;
window.updateCompaniesDisplay = function() {
    console.log('Legacy updateCompaniesDisplay() called');
    if (originalUpdateCompaniesDisplay) {
        originalUpdateCompaniesDisplay();
    }
};

const originalLoadRecentChanges = window.loadRecentChanges;
window.loadRecentChanges = async function() {
    console.log('Legacy loadRecentChanges() called');
    if (originalLoadRecentChanges) {
        await originalLoadRecentChanges();
    }
};

// Tab management functions
window.showTab = function(event, tabName) {
    console.log('Legacy showTab() called');
    
    // Get all elements with class="tab-content" and hide them
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    // Get all elements with class="tab" and remove the class "active"
    const tabs = document.getElementsByClassName('tab');
    for (let tab of tabs) {
        tab.classList.remove('active');
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');
};

// Modal management functions
window.showCompanyDetails = function(company) {
    console.log('Legacy showCompanyDetails() called');
    setSelectedCompany(company);
    
    // Keep existing modal logic
    const modal = document.getElementById('companyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (modal && modalTitle && modalContent) {
        modalTitle.textContent = company.name;
        // Modal content will be populated by existing code
        modal.style.display = 'block';
    }
};

window.closeModal = function() {
    console.log('Legacy closeModal() called');
    const modal = document.getElementById('companyModal');
    if (modal) {
        modal.style.display = 'none';
    }
    setSelectedCompany(null);
};

// Export migration status
window.MODULE_MIGRATION = {
    status: 'active',
    version: '1.0.0',
    modules: {
        config: true,
        data: true,
        api: true,
        utils: true,
        main: true
    }
};

console.log('✅ Migration helper loaded - legacy functions mapped to new modules');
