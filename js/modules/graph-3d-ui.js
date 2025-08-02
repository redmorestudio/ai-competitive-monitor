/**
 * @module graph-3d-ui
 * @description User interface components and controls for 3D graph interaction
 * @since 1.0.0
 */

/**
 * 3D Graph UI Module
 * Handles control panel generation and UI component rendering
 */

export class Graph3DUI {
    constructor() {
        this.container = null;
        this.callbacks = {};
        this.elements = {};
    }

    /**
     * Initialize the UI
     * @param {HTMLElement} container - Container for controls
     * @param {Object} callbacks - Callback functions for UI events
     */
    init(container, callbacks = {}) {
        this.container = container;
        this.callbacks = callbacks;
        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the complete control panel
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <button class="collapse-btn" onclick="toggleControlsCollapse()">→</button>
            <h4>Graph Intelligence ▶</h4>
            
            <div class="control-content">
                <!-- Configuration Mode -->
                ${this.renderConfigMode()}
                
                <!-- Draw By Mode -->
                ${this.renderDrawByMode()}
                
                <!-- Stats Display -->
                ${this.renderStats()}
                
                <!-- Legend -->
                ${this.renderLegend()}
                
                <!-- View Mode -->
                ${this.renderViewMode()}
                
                <!-- Node Size -->
                ${this.renderNodeSize()}
                
                <!-- Visual Settings -->
                ${this.renderVisualSettings()}
                
                <!-- Node Visibility -->
                ${this.renderNodeVisibility()}
                
                <!-- Camera Controls -->
                ${this.renderCameraControls()}
                
                <!-- Physics Controls -->
                ${this.renderPhysicsControls()}
                
                <!-- Link Strength Filter -->
                ${this.renderLinkStrengthFilter()}
                
                <!-- Entity Limit -->
                ${this.renderEntityLimit()}
                
                <!-- Entity Type Filter -->
                ${this.renderEntityTypeFilter()}
                
                <!-- Technology Filter -->
                ${this.renderTechnologyFilter()}
                
                <!-- Concept Filter -->
                ${this.renderConceptFilter()}
                
                <!-- Search -->
                ${this.renderSearch()}
            </div>
        `;

        // Store element references
        this.cacheElements();
    }

    /**
     * Render configuration mode toggle
     */
    renderConfigMode() {
        return `
            <div class="control-group">
                <button id="simple-mode-btn" class="mode-btn active" onclick="setConfigMode('simple')">Simple</button>
                <button id="advanced-mode-btn" class="mode-btn" onclick="setConfigMode('advanced')">Advanced</button>
            </div>
        `;
    }

    /**
     * Render draw by mode selector
     */
    renderDrawByMode() {
        return `
            <div class="control-group simple-group">
                <label>Draw By:</label>
                <select id="draw-mode">
                    <option value="normal">Normal</option>
                    <option value="group">Group by Type</option>
                    <option value="changes-24h">Changes Past 24 Hours</option>
                    <option value="changes-48h">Changes Past 48 Hours</option>
                    <option value="changes-week">Changes Past Week</option>
                </select>
            </div>
        `;
    }

    /**
     * Render stats display
     */
    renderStats() {
        return `
            <div class="control-group advanced-group" style="display: none;">
                <div id="stats">
                    <div>Monitoring: <span id="company-count">0</span> companies</div>
                    <div>URLs: <span id="url-count">0</span></div>
                    <div>Nodes: <span id="node-count">0</span></div>
                    <div>Links: <span id="link-count">0</span></div>
                </div>
            </div>
        `;
    }

    /**
     * Render legend
     */
    renderLegend() {
        return `
            <div class="control-group simple-group">
                <label>Legend:</label>
                <div id="legend-content"></div>
            </div>
        `;
    }

    /**
     * Render view mode selector
     */
    renderViewMode() {
        return `
            <div class="control-group simple-group">
                <label>View Mode (Color By):</label>
                <select id="view-mode">
                    <option value="entity-type">Entity Type</option>
                    <option value="interest-level">Interest Level</option>
                    <option value="connections">Number of Connections</option>
                    <option value="all">All Connections</option>
                    <option value="technology">Technology Links Only</option>
                    <option value="concept">Concept Links Only</option>
                    <option value="recent-activity">Recent Activity</option>
                    <option value="high-interest">High Interest Only</option>
                </select>
            </div>
        `;
    }

    /**
     * Render node size selector
     */
    renderNodeSize() {
        return `
            <div class="control-group simple-group">
                <label>Node Size:</label>
                <select id="node-size">
                    <option value="uniform">Uniform</option>
                    <option value="url-count">By URL Count</option>
                    <option value="connections">By Connections</option>
                    <option value="interest-level">By Interest Level</option>
                </select>
            </div>
        `;
    }

    /**
     * Render visual settings
     */
    renderVisualSettings() {
        return `
            <div class="control-group advanced-group" style="display: none;">
                <label>Visual Settings:</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="show-links" checked> Show Links</label>
                    <label><input type="checkbox" id="show-labels" checked> Show Labels</label>
                    <label><input type="checkbox" id="show-particles" checked> Show Particles</label>
                    <label><input type="checkbox" id="thin-lines"> Thin Lines Mode</label>
                    <label><input type="checkbox" id="floating-tooltip" checked> Floating Tooltip</label>
                    <label><input type="checkbox" id="monochrome-mode"> Monochrome Mode</label>
                    <label><input type="checkbox" id="show-change-rings"> Show Change Rings</label>
                    <label><input type="checkbox" id="auto-rotate"> Auto-rotate</label>
                </div>
            </div>
        `;
    }

    /**
     * Render node visibility toggles
     */
    renderNodeVisibility() {
        return `
            <div class="control-group simple-group">
                <label>Show Nodes:</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" id="show-technology-nodes" checked> Technology Nodes</label>
                    <label><input type="checkbox" id="show-concept-nodes" checked> Concept Nodes</label>
                    <label><input type="checkbox" id="show-company-nodes" checked> Company Nodes</label>
                </div>
            </div>
        `;
    }

    /**
     * Render camera controls
     */
    renderCameraControls() {
        return `
            <div class="control-group advanced-group" style="display: none;">
                <label>Camera:</label>
                <button id="center-view-btn" onclick="centerView()">Center View</button>
            </div>
        `;
    }

    /**
     * Render physics controls
     */
    renderPhysicsControls() {
        return `
            <div class="control-group simple-group">
                <label>Graph Physics:</label>
                <div class="slider-container">
                    <label>Force Strength: <span id="force-value">-300</span></label>
                    <input type="range" id="force-strength" min="-1000" max="-50" value="-300" step="10">
                </div>
                <div class="slider-container">
                    <label>Link Distance: <span id="link-distance-value">30</span></label>
                    <input type="range" id="link-distance" min="10" max="200" value="30" step="5">
                </div>
                <div class="slider-container">
                    <label>Center Gravity: <span id="center-gravity-value">0.3</span></label>
                    <input type="range" id="center-gravity" min="0" max="1" value="0.3" step="0.05">
                </div>
            </div>
        `;
    }

    /**
     * Render link strength filter
     */
    renderLinkStrengthFilter() {
        return `
            <div class="control-group simple-group">
                <label>Link Strength Filter:</label>
                <div class="slider-container">
                    <label>Connection Threshold: <span id="link-threshold-value">0</span></label>
                    <input type="range" id="link-threshold" min="0" max="10" value="0" step="0.5">
                </div>
            </div>
        `;
    }

    /**
     * Render entity limit control
     */
    renderEntityLimit() {
        return `
            <div class="control-group simple-group">
                <label>Number of Entities:</label>
                <div class="slider-container">
                    <label>Entity Count Limit: <span id="entity-limit-value">200</span></label>
                    <input type="range" id="entity-limit" min="10" max="200" value="200" step="10">
                </div>
            </div>
        `;
    }

    /**
     * Render entity type filter
     */
    renderEntityTypeFilter() {
        return `
            <div class="control-group simple-group">
                <label>Filter by Type:</label>
                <div style="margin-bottom: 8px;">
                    <button onclick="selectAllTypes()">Select All</button>
                    <button onclick="selectNoneTypes()">Select None</button>
                </div>
                <div class="checkbox-group" id="type-filters">
                    <!-- Populated dynamically -->
                </div>
            </div>
        `;
    }

    /**
     * Render technology filter
     */
    renderTechnologyFilter() {
        return `
            <div class="control-group advanced-group" style="display: none;">
                <label>Filter by Technology:</label>
                <input type="text" id="tech-search" placeholder="Search technologies..." style="margin-bottom: 8px;">
                <div class="checkbox-group" id="tech-filters" style="max-height: 150px;">
                    <!-- Populated dynamically -->
                </div>
            </div>
        `;
    }

    /**
     * Render concept filter
     */
    renderConceptFilter() {
        return `
            <div class="control-group advanced-group" style="display: none;">
                <label>Filter by AI Concepts:</label>
                <input type="text" id="concept-search" placeholder="Search concepts..." style="margin-bottom: 8px;">
                <div class="checkbox-group" id="concept-filters" style="max-height: 150px;">
                    <!-- Populated dynamically -->
                </div>
            </div>
        `;
    }

    /**
     * Render search controls
     */
    renderSearch() {
        return `
            <div class="control-group simple-group">
                <label>Search:</label>
                <input type="text" id="search-input" placeholder="Search nodes...">
                <select id="search-depth" style="margin-top: 5px;">
                    <option value="0">Match Only</option>
                    <option value="1" selected>1 Level Out</option>
                    <option value="2">2 Levels Out</option>
                </select>
            </div>
        `;
    }

    /**
     * Cache element references
     */
    cacheElements() {
        this.elements = {
            // Mode buttons
            simpleModeBtn: document.getElementById('simple-mode-btn'),
            advancedModeBtn: document.getElementById('advanced-mode-btn'),
            
            // Selects
            drawMode: document.getElementById('draw-mode'),
            viewMode: document.getElementById('view-mode'),
            nodeSize: document.getElementById('node-size'),
            searchDepth: document.getElementById('search-depth'),
            
            // Inputs
            searchInput: document.getElementById('search-input'),
            techSearch: document.getElementById('tech-search'),
            conceptSearch: document.getElementById('concept-search'),
            
            // Sliders
            forceStrength: document.getElementById('force-strength'),
            linkDistance: document.getElementById('link-distance'),
            centerGravity: document.getElementById('center-gravity'),
            linkThreshold: document.getElementById('link-threshold'),
            entityLimit: document.getElementById('entity-limit'),
            
            // Checkboxes
            showLinks: document.getElementById('show-links'),
            showLabels: document.getElementById('show-labels'),
            showParticles: document.getElementById('show-particles'),
            thinLines: document.getElementById('thin-lines'),
            floatingTooltip: document.getElementById('floating-tooltip'),
            monochromeMode: document.getElementById('monochrome-mode'),
            showChangeRings: document.getElementById('show-change-rings'),
            autoRotate: document.getElementById('auto-rotate'),
            showTechnologyNodes: document.getElementById('show-technology-nodes'),
            showConceptNodes: document.getElementById('show-concept-nodes'),
            showCompanyNodes: document.getElementById('show-company-nodes'),
            
            // Display elements
            companyCount: document.getElementById('company-count'),
            urlCount: document.getElementById('url-count'),
            nodeCount: document.getElementById('node-count'),
            linkCount: document.getElementById('link-count'),
            forceValue: document.getElementById('force-value'),
            linkDistanceValue: document.getElementById('link-distance-value'),
            centerGravityValue: document.getElementById('center-gravity-value'),
            linkThresholdValue: document.getElementById('link-threshold-value'),
            entityLimitValue: document.getElementById('entity-limit-value'),
            legendContent: document.getElementById('legend-content'),
            typeFilters: document.getElementById('type-filters'),
            techFilters: document.getElementById('tech-filters'),
            conceptFilters: document.getElementById('concept-filters')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Mode changes
        if (this.elements.drawMode) {
            this.elements.drawMode.addEventListener('change', (e) => {
                if (this.callbacks.onDrawModeChange) {
                    this.callbacks.onDrawModeChange(e.target.value);
                }
            });
        }

        if (this.elements.viewMode) {
            this.elements.viewMode.addEventListener('change', (e) => {
                if (this.callbacks.onViewModeChange) {
                    this.callbacks.onViewModeChange(e.target.value);
                }
            });
        }

        if (this.elements.nodeSize) {
            this.elements.nodeSize.addEventListener('change', (e) => {
                if (this.callbacks.onNodeSizeChange) {
                    this.callbacks.onNodeSizeChange(e.target.value);
                }
            });
        }

        // Search
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                if (this.callbacks.onSearchChange) {
                    this.callbacks.onSearchChange(e.target.value);
                }
            });
        }

        if (this.elements.searchDepth) {
            this.elements.searchDepth.addEventListener('change', (e) => {
                if (this.callbacks.onSearchDepthChange) {
                    this.callbacks.onSearchDepthChange(parseInt(e.target.value));
                }
            });
        }

        // Sliders
        this.attachSliderListener('forceStrength', 'forceValue', 'onForceStrengthChange');
        this.attachSliderListener('linkDistance', 'linkDistanceValue', 'onLinkDistanceChange');
        this.attachSliderListener('centerGravity', 'centerGravityValue', 'onCenterGravityChange');
        this.attachSliderListener('linkThreshold', 'linkThresholdValue', 'onLinkThresholdChange');
        this.attachSliderListener('entityLimit', 'entityLimitValue', 'onEntityLimitChange');

        // Checkboxes
        this.attachCheckboxListener('showLinks', 'onShowLinksChange');
        this.attachCheckboxListener('showLabels', 'onShowLabelsChange');
        this.attachCheckboxListener('showParticles', 'onShowParticlesChange');
        this.attachCheckboxListener('thinLines', 'onThinLinesChange');
        this.attachCheckboxListener('floatingTooltip', 'onFloatingTooltipChange');
        this.attachCheckboxListener('monochromeMode', 'onMonochromeModeChange');
        this.attachCheckboxListener('showChangeRings', 'onShowChangeRingsChange');
        this.attachCheckboxListener('autoRotate', 'onAutoRotateChange');
        this.attachCheckboxListener('showTechnologyNodes', 'onShowTechnologyNodesChange');
        this.attachCheckboxListener('showConceptNodes', 'onShowConceptNodesChange');
        this.attachCheckboxListener('showCompanyNodes', 'onShowCompanyNodesChange');

        // Filter searches
        if (this.elements.techSearch) {
            this.elements.techSearch.addEventListener('input', (e) => {
                this.filterCheckboxList('tech-filters', e.target.value);
            });
        }

        if (this.elements.conceptSearch) {
            this.elements.conceptSearch.addEventListener('input', (e) => {
                this.filterCheckboxList('concept-filters', e.target.value);
            });
        }
    }

    /**
     * Attach slider listener
     */
    attachSliderListener(sliderId, displayId, callbackName) {
        const slider = this.elements[sliderId];
        const display = this.elements[displayId];
        
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                display.textContent = e.target.value;
                if (this.callbacks[callbackName]) {
                    this.callbacks[callbackName](parseFloat(e.target.value));
                }
            });
        }
    }

    /**
     * Attach checkbox listener
     */
    attachCheckboxListener(checkboxId, callbackName) {
        const checkbox = this.elements[checkboxId];
        
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (this.callbacks[callbackName]) {
                    this.callbacks[callbackName](e.target.checked);
                }
            });
        }
    }

    /**
     * Update stats display
     */
    updateStats(stats) {
        if (this.elements.companyCount) this.elements.companyCount.textContent = stats.companies || 0;
        if (this.elements.urlCount) this.elements.urlCount.textContent = stats.urls || 0;
        if (this.elements.nodeCount) this.elements.nodeCount.textContent = stats.nodes || 0;
        if (this.elements.linkCount) this.elements.linkCount.textContent = stats.links || 0;
    }

    /**
     * Update legend
     */
    updateLegend(legendData) {
        if (!this.elements.legendContent) return;
        
        this.elements.legendContent.innerHTML = legendData.map(item => `
            <div class="legend-item">
                <span class="legend-color" style="background: ${item.color}"></span>
                <span>${item.type} (${item.count})</span>
            </div>
        `).join('');
    }

    /**
     * Update entity type filters
     */
    updateEntityTypeFilters(types, selected) {
        if (!this.elements.typeFilters) return;
        
        this.elements.typeFilters.innerHTML = types.map(type => `
            <label>
                <input type="checkbox" value="${type.name}" 
                       ${selected.has(type.name) ? 'checked' : ''}
                       onchange="handleEntityTypeChange(this)">
                ${type.name} (${type.count})
            </label>
        `).join('');
    }

    /**
     * Update technology filters
     */
    updateTechnologyFilters(technologies, selected) {
        if (!this.elements.techFilters) return;
        
        this.elements.techFilters.innerHTML = technologies.map(tech => `
            <label>
                <input type="checkbox" value="${tech.name}" 
                       ${selected.has(tech.name) ? 'checked' : ''}
                       onchange="handleTechnologyChange(this)">
                ${tech.name} (${tech.count})
            </label>
        `).join('');
    }

    /**
     * Update concept filters
     */
    updateConceptFilters(concepts, selected) {
        if (!this.elements.conceptFilters) return;
        
        this.elements.conceptFilters.innerHTML = concepts.map(concept => `
            <label>
                <input type="checkbox" value="${concept.name}" 
                       ${selected.has(concept.name) ? 'checked' : ''}
                       onchange="handleConceptChange(this)">
                ${concept.name} (${concept.count})
            </label>
        `).join('');
    }

    /**
     * Filter checkbox list by search query
     */
    filterCheckboxList(containerId, query) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const labels = container.querySelectorAll('label');
        const lowerQuery = query.toLowerCase();
        
        labels.forEach(label => {
            const text = label.textContent.toLowerCase();
            label.style.display = text.includes(lowerQuery) ? 'block' : 'none';
        });
    }

    /**
     * Set configuration mode
     */
    setConfigMode(mode) {
        const simpleGroups = document.querySelectorAll('.simple-group');
        const advancedGroups = document.querySelectorAll('.advanced-group');
        
        if (mode === 'simple') {
            this.elements.simpleModeBtn?.classList.add('active');
            this.elements.advancedModeBtn?.classList.remove('active');
            advancedGroups.forEach(g => g.style.display = 'none');
        } else {
            this.elements.simpleModeBtn?.classList.remove('active');
            this.elements.advancedModeBtn?.classList.add('active');
            advancedGroups.forEach(g => g.style.display = 'block');
        }
    }

    /**
     * Show custom tag filter UI
     */
    showCustomTagFilter(tag) {
        const infoPanel = document.getElementById('node-info');
        if (infoPanel) {
            infoPanel.innerHTML = `
                <div style="padding: 10px; background: rgba(0, 255, 136, 0.1); border: 1px solid #00ff88; border-radius: 4px;">
                    <strong>Filtering by: ${tag}</strong>
                    <button onclick="clearTagFilter()" style="margin-left: 10px; padding: 2px 8px;">Clear Filter</button>
                </div>
            `;
        }
    }

    /**
     * Clear custom tag filter UI
     */
    clearCustomTagFilter() {
        const infoPanel = document.getElementById('node-info');
        if (infoPanel) {
            infoPanel.innerHTML = 'Hover over nodes for details';
        }
    }
}

// Create singleton instance
export const graph3DUI = new Graph3DUI();
