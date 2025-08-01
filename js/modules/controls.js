/**
 * @module controls
 * @description UI controls including modals, tabs, settings panel, and event handling
 * @since 1.0.0
 */

/**
 * Controls Module
 * Handles all UI controls, tab switching, modal management, and user interactions
 */

import { getInterestColor, getInterestEmoji, escapeHtml } from './utils.js';
import { loadStaticData } from './data.js';
import { 
    applyFilters, 
    createFilterUI, 
    uiHandlers, 
    getUniqueCompanies,
    getUniqueTechnologies,
    getUniqueConcepts,
    groupChangesByDate,
    setFiltersChangedCallback 
} from './filters.js';

// Tab management
export function showTab(event, tabName) {
    // Hide all tab contents
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    // Remove active class from all tabs
    const tabs = document.getElementsByClassName('tab');
    for (let tab of tabs) {
        tab.classList.remove('active');
    }

    // Show selected tab and mark button as active
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');

    // Load data for specific tabs
    if (tabName === 'changes') {
        loadAllChanges();
    }
}

// Modal management
export function closeModal() {
    document.getElementById('companyModal').style.display = 'none';
}

// Initialize global click handler for modals
export function initModalClickHandler() {
    window.onclick = function(event) {
        const modal = document.getElementById('companyModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Show company details modal
export async function showCompanyDetails(companyName) {
    const modal = document.getElementById('companyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    // Set title and show modal
    modalTitle.textContent = `${companyName} - Company Details`;
    modal.style.display = 'block';
    
    try {
        // Load company configuration from GitHub
        const configData = await loadStaticData('config.json');
        const companyConfig = configData.companies.find(c => c.name === companyName);
        
        if (!companyConfig) {
            throw new Error('Company configuration not found');
        }
        
        modalContent.innerHTML = `
            <div class="config-section">
                <h4>📊 Company Configuration</h4>
                <p><strong>Industry:</strong> ${escapeHtml(companyConfig.industry || 'Technology')}</p>
                <p><strong>Description:</strong> ${escapeHtml(companyConfig.description || 'AI/ML technology company')}</p>
                <p><strong>Monitoring Active:</strong> <span class="status-badge active">Yes</span></p>
            </div>
            
            <div class="config-section">
                <h4>🌐 Monitored URLs (${companyConfig.urls.length})</h4>
                <div class="url-list">
                    ${companyConfig.urls.map(url => `
                        <div class="url-item">
                            <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="config-section">
                <h4>🏷️ AI Focus Areas</h4>
                <div class="tag-list">
                    ${companyConfig.ai_keywords ? companyConfig.ai_keywords.map(keyword => 
                        `<span class="tag">${escapeHtml(keyword)}</span>`
                    ).join('') : '<p>No specific keywords configured</p>'}
                </div>
            </div>
            
            <div class="config-section">
                <h4>📈 Recent Activity</h4>
                <div id="companyRecentActivity">
                    <div class="loading">Loading recent changes...</div>
                </div>
            </div>
        `;
        
        // Load recent changes for this company
        loadCompanyRecentChanges(companyName);
        
    } catch (error) {
        console.error('Error loading company details:', error);
        modalContent.innerHTML = `<div class="error-message">Error loading company details: ${escapeHtml(error.message)}</div>`;
    }
}

// Show company URLs modal
export async function showCompanyUrls(companyName) {
    const modal = document.getElementById('companyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = `${companyName} - Monitored URLs`;
    modal.style.display = 'block';
    
    try {
        const configData = await loadStaticData('config.json');
        const companyConfig = configData.companies.find(c => c.name === companyName);
        
        if (!companyConfig) {
            throw new Error('Company configuration not found');
        }
        
        modalContent.innerHTML = `
            <div class="config-section">
                <h4>🌐 All Monitored URLs for ${escapeHtml(companyName)}</h4>
                <p style="margin-bottom: 20px;">Total URLs monitored: ${companyConfig.urls.length}</p>
                
                <div style="max-height: 400px; overflow-y: auto;">
                    ${companyConfig.urls.map((url, index) => `
                        <div class="url-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <strong>#${index + 1}</strong>
                                    <a href="${escapeHtml(url)}" target="_blank" style="margin-left: 10px; color: var(--primary-color);">
                                        ${escapeHtml(url)}
                                    </a>
                                </div>
                                <div>
                                    <span class="status-badge active">Active</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading URLs:', error);
        modalContent.innerHTML = `<div class="error-message">Error loading URLs: ${escapeHtml(error.message)}</div>`;
    }
}

// Show change detail modal
export async function showChangeDetail(changeId, companyName, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const modal = document.getElementById('companyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = `Change Details - ${companyName}`;
    modal.style.display = 'block';
    
    try {
        // Load detailed change data
        const response = await fetch(`./api-data/changes/${changeId}.json`);
        if (!response.ok) {
            throw new Error('Change details not found');
        }
        
        const changeData = await response.json();
        
        // Display the change details
        modalContent.innerHTML = `
            <div class="config-section">
                <h4>📊 Change Summary</h4>
                <p><strong>Company:</strong> ${escapeHtml(changeData.company || companyName)}</p>
                <p><strong>URL:</strong> <a href="${escapeHtml(changeData.page_url || changeData.url || '')}" target="_blank">${escapeHtml(changeData.page_url || changeData.url || 'N/A')}</a></p>
                <p><strong>Detected:</strong> ${new Date(changeData.detected_at).toLocaleString()}</p>
                <p><strong>Interest Level:</strong> <span class="interest-badge interest-${changeData.interest_level}">${changeData.interest_level}/10</span></p>
            </div>
            
            <div class="config-section">
                <h4>🔍 AI Analysis</h4>
                <p><strong>Summary:</strong> ${escapeHtml(changeData.summary || 'No summary available')}</p>
                <p><strong>Category:</strong> ${escapeHtml(changeData.category || 'General Update')}</p>
                ${changeData.business_impact ? `<p><strong>Business Impact:</strong> ${escapeHtml(changeData.business_impact)}</p>` : ''}
                ${changeData.competitive_implications ? `<p><strong>Competitive Implications:</strong> ${escapeHtml(changeData.competitive_implications)}</p>` : ''}
            </div>
            
            ${changeData.key_insights && changeData.key_insights.length > 0 ? `
            <div class="config-section">
                <h4>💡 Key Insights</h4>
                <ul>
                    ${changeData.key_insights.map(insight => `<li>${escapeHtml(insight)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        `;
        
    } catch (error) {
        console.error('Error loading change details:', error);
        modalContent.innerHTML = `
            <div class="error-message">
                <p>Unable to load change details.</p>
                <p>Error: ${escapeHtml(error.message)}</p>
                <p><small>Change ID: ${escapeHtml(changeId)}</small></p>
            </div>
        `;
    }
}

// Load recent changes for a specific company
async function loadCompanyRecentChanges(companyName) {
    const activityDiv = document.getElementById('companyRecentActivity');
    
    try {
        const changesData = await loadStaticData('changes.json');
        
        // Handle both array and object structures
        let changes = [];
        if (Array.isArray(changesData)) {
            changes = changesData;
        } else if (changesData.changes) {
            changes = changesData.changes;
        }
        
        // Filter changes for this company
        const companyChanges = changes
            .filter(change => change.company === companyName)
            .sort((a, b) => new Date(b.detected_at || b.detectedAt) - new Date(a.detected_at || a.detectedAt))
            .slice(0, 5); // Show last 5 changes
        
        if (companyChanges.length === 0) {
            activityDiv.innerHTML = '<p>No recent changes detected for this company.</p>';
            return;
        }
        
        let html = '';
        companyChanges.forEach((change, index) => {
            const changeDate = new Date(change.detected_at || change.detectedAt);
            const interestLevel = change.interest_level || 1;
            
            // Parse AI analysis to get summary
            let summary = change.summary || '';
            if (!summary && change.ai_analysis) {
                try {
                    const analysis = JSON.parse(change.ai_analysis);
                    summary = analysis.summary || '';
                } catch (e) {
                    summary = 'Change detected';
                }
            }
            
            // Generate ID if missing
            if (!change.id) {
                change.id = `change-${index}-${Date.now()}`;
            }
            
            html += `
                <div class="change-item" style="margin-bottom: 10px; padding: 10px; background: var(--card-bg); border-radius: 8px; cursor: pointer;"
                     onclick="showChangeDetail('${change.id}', '${escapeHtml(companyName)}', event)">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span class="interest-badge interest-${interestLevel}">Interest: ${interestLevel}/10</span>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">${changeDate.toLocaleDateString()}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem;">${escapeHtml(summary.substring(0, 100))}${summary.length > 100 ? '...' : ''}</p>
                </div>
            `;
        });
        
        activityDiv.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading company changes:', error);
        activityDiv.innerHTML = '<p class="error-message">Error loading recent activity</p>';
    }
}

// Load all changes for the changes tab
export async function loadAllChanges() {
    const changesData = await loadStaticData('changes.json');
    const contentDiv = document.getElementById('changesContent');
    const filterContainer = document.getElementById('filterContainer');

    // Handle both array and object structures
    let changes = [];
    if (Array.isArray(changesData)) {
        changes = changesData;
    } else if (changesData.changes) {
        changes = changesData.changes;
    } else if (changesData.error) {
        contentDiv.innerHTML = '<div class="error-message">Error loading changes data.</div>';
        return;
    }

    if (changes.length === 0) {
        contentDiv.innerHTML = '<div class="error-message">No changes detected yet.</div>';
        return;
    }

    // Ensure all changes have IDs
    changes.forEach((change, index) => {
        if (!change.id) {
            change.id = `change-${index}-${Date.now()}`;
        }
    });

    // Store changes globally for filtering
    window.allChanges = changes;

    // Create filter UI if not already present
    if (filterContainer && !filterContainer.innerHTML) {
        const companies = getUniqueCompanies(changes);
        const technologies = getUniqueTechnologies(changes);
        const concepts = getUniqueConcepts(changes);
        
        filterContainer.innerHTML = createFilterUI({
            companies,
            technologies,
            concepts
        });
        
        // Set up filter change handler
        setFiltersChangedCallback(() => {
            renderFilteredChanges();
        });
    }

    // Initial render
    renderFilteredChanges();
}

// Render filtered changes
function renderFilteredChanges() {
    const contentDiv = document.getElementById('changesContent');
    const changes = window.allChanges || [];
    
    // Apply filters
    const filteredChanges = applyFilters(changes);
    
    if (filteredChanges.length === 0) {
        contentDiv.innerHTML = '<div class="error-message">No changes match the current filters.</div>';
        return;
    }

    // Group changes by date
    const changesByDate = groupChangesByDate(filteredChanges);

    let html = `
        <p style="margin-bottom: 20px;">Showing ${filteredChanges.length} of ${changes.length} changes</p>
        <div style="max-height: 600px; overflow-y: auto;">
    `;

    // Display changes grouped by date
    Object.entries(changesByDate).forEach(([date, dateChanges]) => {
        html += `<h4 style="margin: 20px 0 10px 0; color: var(--primary-color);">${date}</h4>`;
        
        dateChanges.forEach(change => {
            const changeDate = new Date(change.detected_at || change.detectedAt || change.created_at);
            const timeStr = changeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Parse AI analysis to get summary
            let summary = change.summary || '';
            if (!summary && change.ai_analysis) {
                try {
                    const analysis = JSON.parse(change.ai_analysis);
                    summary = analysis.summary || '';
                } catch (e) {
                    summary = 'Change detected';
                }
            }
            
            const interestLevel = change.interest_level || 1;
            const interestColor = getInterestColor(interestLevel);
            
            html += `
                <div class="change-item" style="border-left-color: ${interestColor};" onclick="window.controls.showChangeDetail('${change.id}', '${escapeHtml(change.company)}', event)">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <strong>${escapeHtml(change.company)}</strong>
                            <span class="interest-badge interest-${interestLevel}" style="font-size: 0.75rem;">
                                Interest: ${interestLevel}/10
                            </span>
                        </div>
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">${timeStr}</span>
                    </div>
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">
                        ${change.url ? `<a href="${escapeHtml(change.url)}" target="_blank" style="color: var(--primary-color); text-decoration: none;">${escapeHtml(change.url)}</a>` : 'URL not available'}
                    </div>
                    <div style="color: var(--text-primary); font-size: 0.9rem;">
                        ${escapeHtml(summary.substring(0, 200))}${summary.length > 200 ? '...' : ''}
                    </div>
                </div>
            `;
        });
    });

    html += '</div>';
    contentDiv.innerHTML = html;
}

// Initialize controls
export function initControls() {
    // Initialize modal click handler
    initModalClickHandler();
    
    // Export functions to window for inline onclick handlers
    window.controls = {
        showTab,
        closeModal,
        showCompanyDetails,
        showCompanyUrls,
        showChangeDetail
    };
    
    // Export filter handlers to window
    window.filters = uiHandlers;
}
