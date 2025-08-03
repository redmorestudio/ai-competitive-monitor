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
        // Load company details from the correct file
        const companyDetailsData = await loadStaticData('company-details.json');
        const companyDetails = companyDetailsData.companies[companyName];
        
        if (!companyDetails) {
            throw new Error('Company details not found');
        }
        
        // Also load company list data for additional info
        const companiesData = await loadStaticData('companies.json');
        const companyInfo = companiesData.find(c => c.name === companyName) || {};
        
        modalContent.innerHTML = `
            <div class="config-section">
                <h4>📊 Company Overview</h4>
                <p><strong>Category:</strong> ${escapeHtml(companyInfo.category || 'Technology')}</p>
                <p><strong>Industry:</strong> ${escapeHtml(companyInfo.industry || 'AI/ML Technology')}</p>
                <p><strong>Monitoring Active:</strong> <span class="status-badge active">Yes</span></p>
            </div>
            
            <div class="config-section">
                <h4>📈 Activity Statistics</h4>
                ${companyDetails.stats ? `
                    <p><strong>Total Changes:</strong> ${companyDetails.stats.total_changes || 0}</p>
                    <p><strong>Changes (7 days):</strong> ${companyDetails.stats.changes_7d || 0}</p>
                    <p><strong>Changes (30 days):</strong> ${companyDetails.stats.changes_30d || 0}</p>
                    <p><strong>Average Interest Level:</strong> ${parseFloat(companyDetails.stats.avg_interest_level || 0).toFixed(1)}/10</p>
                    <p><strong>Last Change:</strong> ${companyDetails.stats.last_change ? new Date(companyDetails.stats.last_change).toLocaleDateString() : 'No changes yet'}</p>
                ` : '<p>No statistics available</p>'}
            </div>
            
            <div class="config-section">
                <h4>🌐 Monitored URLs (${companyDetails.urls ? companyDetails.urls.length : 0})</h4>
                <div class="url-list">
                    ${companyDetails.urls ? companyDetails.urls.map(urlObj => `
                        <div class="url-item">
                            <a href="${escapeHtml(urlObj.url)}" target="_blank">${escapeHtml(urlObj.url)}</a>
                            <span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 10px;">(${escapeHtml(urlObj.category || urlObj.name)})</span>
                        </div>
                    `).join('') : '<p>No URLs configured</p>'}
                </div>
            </div>
            
            ${companyInfo.intelligence ? `
            <div class="config-section">
                <h4>🏷️ AI Intelligence</h4>
                ${companyInfo.intelligence.top_products && companyInfo.intelligence.top_products.length > 0 ? `
                    <div class="intel-section">
                        <div class="intel-label">Products:</div>
                        <div class="intel-pills">
                            ${companyInfo.intelligence.top_products.map(product => 
                                `<span class="intel-pill" 
                                       title="Click to see where this appears">
                                    ${escapeHtml(product)}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                ${companyInfo.intelligence.ai_technologies && companyInfo.intelligence.ai_technologies.length > 0 ? `
                    <div class="intel-section">
                        <div class="intel-label">Technologies:</div>
                        <div class="intel-pills">
                            ${companyInfo.intelligence.ai_technologies.map(tech => 
                                `<span class="intel-pill tech-tag" 
                                       title="Click to see where this appears">
                                    ${escapeHtml(tech)}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            ` : ''}
            
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
        const companyDetailsData = await loadStaticData('company-details.json');
        const companyDetails = companyDetailsData.companies[companyName];
        
        if (!companyDetails || !companyDetails.urls) {
            throw new Error('Company URLs not found');
        }
        
        modalContent.innerHTML = `
            <div class="config-section">
                <h4>🌐 All Monitored URLs for ${escapeHtml(companyName)}</h4>
                <p style="margin-bottom: 20px;">Total URLs monitored: ${companyDetails.urls.length}</p>
                
                <div style="max-height: 400px; overflow-y: auto;">
                    ${companyDetails.urls.map((urlObj, index) => `
                        <div class="url-item" style="padding: 10px; border-bottom: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <strong>#${index + 1}</strong>
                                    <a href="${escapeHtml(urlObj.url)}" target="_blank" style="margin-left: 10px; color: var(--primary-color);">
                                        ${escapeHtml(urlObj.url)}
                                    </a>
                                    <span style="color: var(--text-secondary); font-size: 0.85rem; margin-left: 10px;">
                                        (${escapeHtml(urlObj.category || urlObj.name)})
                                    </span>
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
        let changeData = null;
        
        // Strategy 1: Check if we have the change in window.allChanges (from changes tab)
        if (window.allChanges) {
            // If it's a generated ID, find by index
            if (changeId.startsWith('recent-') || changeId.startsWith('change-')) {
                const parts = changeId.split('-');
                const index = parseInt(parts[1]);
                if (!isNaN(index) && window.allChanges[index]) {
                    changeData = window.allChanges[index];
                }
            } else {
                // Try to find by exact ID match
                changeData = window.allChanges.find(change => change.id === changeId);
            }
        }
        
        // Strategy 1.5: Check if it's a high-interest change from the dashboard
        if (!changeData && changeId.startsWith('high-interest-')) {
            // First try to get the data directly from the stored reference
            if (window[`changeData_${changeId}`]) {
                changeData = window[`changeData_${changeId}`];
            } else {
                // Fall back to parsing the index
                const parts = changeId.split('-');
                const index = parseInt(parts[2]);
                if (!isNaN(index) && window.highInterestChanges && window.highInterestChanges[index]) {
                    changeData = window.highInterestChanges[index];
                }
            }
        }
        
        // Strategy 2: Load from changes.json and find the matching change
        if (!changeData) {
            const changesResponse = await loadStaticData('changes.json');
            const changes = Array.isArray(changesResponse) ? changesResponse : changesResponse.changes || [];
            
            // For generated IDs, try to match by company and approximate time
            if (changeId.startsWith('recent-') || changeId.startsWith('change-')) {
                // Find changes for this company
                const companyChanges = changes.filter(c => c.company === companyName);
                
                // Sort by detected_at descending
                companyChanges.sort((a, b) => 
                    new Date(b.detected_at || b.detectedAt) - new Date(a.detected_at || a.detectedAt)
                );
                
                // Extract index from generated ID and use it
                const parts = changeId.split('-');
                const index = parseInt(parts[1]);
                
                if (!isNaN(index) && companyChanges[index]) {
                    changeData = companyChanges[index];
                } else if (companyChanges.length > 0) {
                    // Fallback to most recent change for this company
                    changeData = companyChanges[0];
                }
            }
        }
        
        // Strategy 3: Try to load from manifest and individual file for richer data
        // BUT ONLY USE IT FOR ADDITIONAL DATA, NOT TO OVERRIDE SCORES
        if (changeData && changeData.company) {
            try {
                const manifestResponse = await fetch('./api-data/changes/manifest.json');
                if (manifestResponse.ok) {
                    const manifest = await manifestResponse.json();
                    
                    // Find a file for this company and approximate time
                    const changeFile = manifest.files.find(f => {
                        if (f.company !== companyName) return false;
                        
                        // Check if the times are close (within 1 minute)
                        const fileTime = new Date(f.detected_at).getTime();
                        const changeTime = new Date(changeData.detected_at || changeData.detectedAt).getTime();
                        return Math.abs(fileTime - changeTime) < 60000; // 1 minute tolerance
                    });
                    
                    if (changeFile) {
                        const fileResponse = await fetch(`./api-data/changes/${changeFile.filename}`);
                        if (fileResponse.ok) {
                            const detailedData = await fileResponse.json();
                            // Only merge non-conflicting data - keep the original interest_level from changes.json
                            const { interest_level, ...otherDetailedData } = detailedData;
                            changeData = { ...otherDetailedData, ...changeData };
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not load detailed data from manifest:', e);
            }
        }
        
        if (!changeData) {
            throw new Error('Change details not found');
        }
        
        // Parse AI analysis from the summary field
        let aiAnalysis = {};
        let summaryText = '';
        
        // First try to parse the summary field which contains the actual AI analysis
        if (changeData.summary) {
            try {
                // The summary field contains a JSON string with the full AI analysis
                const parsedSummary = JSON.parse(changeData.summary);
                aiAnalysis = parsedSummary;
                
                // Extract the actual summary text
                if (parsedSummary.change_summary && parsedSummary.change_summary.what_changed) {
                    summaryText = parsedSummary.change_summary.what_changed;
                } else if (parsedSummary.summary) {
                    summaryText = parsedSummary.summary;
                }
            } catch (e) {
                // If parsing fails, check if it's already plain text
                if (typeof changeData.summary === 'string' && !changeData.summary.startsWith('{')) {
                    summaryText = changeData.summary;
                } else {
                    console.warn('Failed to parse summary field:', e);
                }
            }
        }
        
        // Fallback to ai_analysis field if needed (for backwards compatibility)
        if (!summaryText && changeData.ai_analysis) {
            try {
                const parsed = typeof changeData.ai_analysis === 'string' 
                    ? JSON.parse(changeData.ai_analysis) 
                    : changeData.ai_analysis;
                if (parsed.summary) {
                    summaryText = parsed.summary;
                }
            } catch (e) {
                console.warn('Failed to parse AI analysis:', e);
            }
        }
        
        if (!summaryText) {
            summaryText = 'No summary available';
        }
        
        // Display the change details
        modalContent.innerHTML = `
            <div class="config-section">
                <h4>📊 Change Summary</h4>
                <p><strong>Company:</strong> ${escapeHtml(changeData.company || companyName)}</p>
                <p><strong>URL:</strong> <a href="${escapeHtml(changeData.url || '')}" target="_blank">${escapeHtml(changeData.url || 'N/A')}</a></p>
                <p><strong>Detected:</strong> ${new Date(changeData.detected_at || changeData.detectedAt).toLocaleString()}</p>
                <p><strong>Change Type:</strong> ${escapeHtml(changeData.change_type || 'Unknown')}</p>
                <p><strong>Interest Level:</strong> <span class="interest-badge" style="background-color: ${getInterestColor(changeData.interest_level)}">${changeData.interest_level}/10</span></p>
            </div>
            
            <div class="config-section">
                <h4>🔍 AI Analysis</h4>
                <p><strong>Summary:</strong> ${escapeHtml(summaryText)}</p>
                ${aiAnalysis.category || changeData.category ? `<p><strong>Category:</strong> ${escapeHtml(changeData.category || aiAnalysis.category)}</p>` : ''}
                ${aiAnalysis.technical_innovation_score !== undefined ? `<p><strong>Technical Innovation Score:</strong> ${aiAnalysis.technical_innovation_score}/10</p>` : ''}
                ${aiAnalysis.business_impact_score !== undefined ? `<p><strong>Business Impact Score:</strong> ${aiAnalysis.business_impact_score}/10</p>` : ''}
                ${changeData.business_impact ? `<p><strong>Business Impact:</strong> ${escapeHtml(changeData.business_impact)}</p>` : ''}
                ${changeData.competitive_implications ? `<p><strong>Competitive Implications:</strong> ${escapeHtml(changeData.competitive_implications)}</p>` : ''}
            </div>
            
            ${aiAnalysis.interest_drivers && aiAnalysis.interest_drivers.length > 0 ? `
            <div class="config-section">
                <h4>🎯 Interest Drivers</h4>
                <ul>
                    ${aiAnalysis.interest_drivers.map(driver => `<li>${escapeHtml(driver)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${aiAnalysis.impact_areas && aiAnalysis.impact_areas.length > 0 ? `
            <div class="config-section">
                <h4>💼 Impact Areas</h4>
                <div class="tag-list">
                    ${aiAnalysis.impact_areas.map(area => 
                        `<span class="tag">${escapeHtml(area)}</span>`
                    ).join('')}
                </div>
            </div>
            ` : ''}
            
            ${changeData.change_summary && changeData.change_summary.specific_changes ? `
            <div class="config-section">
                <h4>🔄 Specific Changes</h4>
                <ul>
                    ${changeData.change_summary.specific_changes.slice(0, 5).map(change => 
                        `<li>${escapeHtml(change)}</li>`
                    ).join('')}
                    ${changeData.change_summary.specific_changes.length > 5 ? 
                        `<li><em>...and ${changeData.change_summary.specific_changes.length - 5} more changes</em></li>` : ''}
                </ul>
            </div>
            ` : ''}
            
            ${changeData.key_insights && changeData.key_insights.length > 0 ? `
            <div class="config-section">
                <h4>💡 Key Insights</h4>
                <ul>
                    ${changeData.key_insights.map(insight => `<li>${escapeHtml(insight)}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${changeData.insights && changeData.insights.recommended_actions ? `
            <div class="config-section">
                <h4>🎯 Recommended Actions</h4>
                <ul>
                    ${changeData.insights.recommended_actions.map(action => 
                        `<li>${escapeHtml(action)}</li>`
                    ).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${changeData.entities && (changeData.entities.products || changeData.entities.features || changeData.entities.technologies) ? `
            <div class="config-section">
                <h4>🏷️ Entities Detected</h4>
                ${changeData.entities.products && changeData.entities.products.length > 0 ? `
                    <p><strong>Products:</strong></p>
                    <div class="tag-list">
                        ${changeData.entities.products.map(product => 
                            `<span class="tag">${escapeHtml(product)}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                ${changeData.entities.features && changeData.entities.features.length > 0 ? `
                    <p><strong>Features:</strong></p>
                    <div class="tag-list">
                        ${changeData.entities.features.map(feature => 
                            `<span class="tag">${escapeHtml(feature)}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                ${changeData.entities.technologies && changeData.entities.technologies.length > 0 ? `
                    <p><strong>Technologies:</strong></p>
                    <div class="tag-list">
                        ${changeData.entities.technologies.map(tech => 
                            `<span class="tag tech-tag">${escapeHtml(tech)}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
            ` : ''}
            
            ${changeData.content_snippet ? `
            <div class="config-section">
                <h4>📄 Content Preview</h4>
                <div style="background: var(--card-bg); padding: 15px; border-radius: 8px; font-size: 0.9rem; max-height: 200px; overflow-y: auto;">
                    ${escapeHtml(changeData.content_snippet).replace(/\n/g, '<br>')}
                </div>
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
            
            // Parse the summary field to get the actual summary text
            let summaryText = '';
            if (change.summary) {
                try {
                    // The summary field contains a JSON string with the full AI analysis
                    const analysisData = JSON.parse(change.summary);
                    
                    // Extract the actual summary text
                    if (analysisData.change_summary && analysisData.change_summary.what_changed) {
                        summaryText = analysisData.change_summary.what_changed;
                    } else if (analysisData.summary) {
                        summaryText = analysisData.summary;
                    } else {
                        summaryText = change.summary;
                    }
                } catch (e) {
                    // If parsing fails, check if it's already plain text
                    if (typeof change.summary === 'string' && !change.summary.startsWith('{')) {
                        summaryText = change.summary;
                    } else {
                        summaryText = 'Change detected';
                    }
                }
            } else {
                summaryText = 'Change detected';
            }
            
            // Use a consistent ID based on company and index
            const changeId = `company-change-${index}`;
            
            html += `
                <div class="change-item" style="margin-bottom: 10px; padding: 10px; background: var(--card-bg); border-radius: 8px; cursor: pointer;"
                     onclick="window.controls.showChangeDetail('${changeId}', '${escapeHtml(companyName)}', event)">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <span class="interest-badge interest-${interestLevel}">Interest: ${interestLevel}/10</span>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">${changeDate.toLocaleDateString()}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem;">${escapeHtml(summaryText.substring(0, 100))}${summaryText.length > 100 ? '...' : ''}</p>
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

    // Store changes globally for filtering and detail viewing
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
        
        dateChanges.forEach((change, index) => {
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
            
            // Find the index of this change in the full array
            const globalIndex = changes.findIndex(c => 
                c.company === change.company && 
                c.detected_at === change.detected_at &&
                c.url === change.url
            );
            
            const changeId = globalIndex !== -1 ? `change-${globalIndex}` : `change-temp-${index}`;
            
            html += `
                <div class="change-item" style="border-left-color: ${interestColor};" onclick="window.controls.showChangeDetail('${changeId}', '${escapeHtml(change.company)}', event)">
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
