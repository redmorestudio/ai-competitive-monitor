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
        this.configMode = 'simple';
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
            <button class="collapse-btn" onclick="toggleControlsCollapse()">◀</button>
            <h4 style="color: #00ff88; margin-bottom: 20px;">Configuration</h4>
            
            <div class="control-content">
                <!-- Configuration Mode -->
                ${this.renderConfigMode()}
                
                <!-- SIMPLE MODE SECTIONS -->
                <div class="simple-sections">
                    <!-- Draw By -->
                    ${this.renderDrawByMode()}
                    
                    <!-- Legend -->
                    ${this.renderLegend()}
                    
                    <!-- View Mode -->
                    ${this.renderViewMode()}
                    
                    <!-- Node Size -->
                    ${this.renderNodeSize()}
                    
                    <!-- View Mode 2D Toggle -->
                    ${this.renderFlattenGraphSimple()}
                    
                    <!-- Node Visibility -->
                    ${this.renderNodeVisibilitySimple()}
                    
                    <!-- Graph Physics -->
                    ${this.renderPhysicsControlsSimple()}
                    
                    <!-- Link Strength Filter -->
                    ${this.renderLinkStrengthFilterSimple()}
                    
                    <!-- Number of Entities -->
                    ${this.renderEntityLimitSimple()}
                    
                    <!-- Filter by Type -->
                    ${this.renderEntityTypeFilter()}
                    
                    <!-- Search -->
                    ${this.renderSearch()}
                </div>
                
                <!-- ADVANCED MODE SECTIONS -->
                <div class="advanced-sections" style="display: none;">
                    <!-- View Mode -->
                    ${this.renderViewModeAdvanced()}
                    
                    <!-- Node Size -->
                    ${this.renderNodeSizeAdvanced()}
                    
                    <!-- Visual Settings -->
                    ${this.renderVisualSettings()}
                    
                    <!-- View Mode 2D Toggle -->
                    ${this.renderFlattenGraph()}
                    
                    <!-- Node Visibility -->
                    ${this.renderNodeVisibility()}
                    
                    <!-- Camera Controls -->
                    ${this.renderCameraControls()}
                    
                    <!-- Graph Physics -->
                    ${this.renderPhysicsControls()}
                    
                    <!-- Link Strength Filter -->
                    ${this.renderLinkStrengthFilter()}
                    
                    <!-- Number of Entities -->
                    ${this.renderEntityLimit()}
                    
                    <!-- Filter by Type -->
                    ${this.renderEntityTypeFilterAdvanced()}
                    
                    <!-- Filter by Technology -->
                    ${this.renderTechnologyFilter()}
                    
                    <!-- Filter by AI Concepts -->
                    ${this.renderConceptFilter()}
                    
                    <!-- Search -->
                    ${this.renderSearchAdvanced()}
                </div>
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
            <div class="control-group" style="margin-bottom: 20px;">
                <div style="display: flex; gap: 0;">
                    <button id="simple-mode-btn" class="mode-btn active" onclick="setConfigMode('simple')" 
                            style="flex: 1; padding: 10px; background: rgba(0, 255, 136, 0.2); 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px 0 0 4px; cursor: pointer; font-size: 16px;">
                        Simple
                    </button>
                    <button id="advanced-mode-btn" class="mode-btn" onclick="setConfigMode('advanced')" 
                            style="flex: 1; padding: 10px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 0 4px 4px 0; cursor: pointer; font-size: 16px; 
                                   border-left: none;">
                        Advanced
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * SIMPLE MODE RENDERERS
     */
    
    renderDrawByMode() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Draw By</h4>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: block; margin-bottom: 5px;">Layout Mode</span>
                    <select id="draw-mode-simple" style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="normal">Normal</option>
                        <option value="group">Group by Type</option>
                        <option value="changes-24h">Changes Past 24 Hours</option>
                        <option value="changes-48h">Changes Past 48 Hours</option>
                        <option value="changes-week">Changes Past Week</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; line-height: 1.4;">
                    • Normal: Standard force-directed layout<br>
                    • Group by Type: Cluster by entity type<br>
                    • Changes: Highlight companies with recent updates
                </div>
            </div>
        `;
    }

    renderLegend() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Legend</h4>
                <div id="legend-content" style="font-size: 14px;"></div>
            </div>
        `;
    }

    renderViewMode() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">View Mode</h4>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: block; margin-bottom: 5px;">Color By</span>
                    <select id="view-mode-simple" style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="entity-type">Entity Type</option>
                        <option value="interest-level">Interest Level</option>
                        <option value="connections">Number of Connections</option>
                        <option value="all">All Connections</option>
                        <option value="technology">Technology Links Only</option>
                        <option value="concept">Concept Links Only</option>
                        <option value="recent-activity">Recent Activity</option>
                        <option value="high-interest">High Interest Only</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; line-height: 1.4;">
                    • Entity Type: Colors by company type<br>
                    • Interest Level: Strategic importance (1-10)<br>
                    • Number of Connections: How many other nodes connected
                </div>
            </div>
        `;
    }

    renderNodeSize() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Node Size</h4>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: block; margin-bottom: 5px;">Size By</span>
                    <select id="node-size-simple" style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="uniform">Uniform</option>
                        <option value="url-count">By URL Count</option>
                        <option value="connections">By Connections</option>
                        <option value="interest-level">By Interest Level</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666;">
                    Control how node sizes are calculated
                </div>
            </div>
        `;
    }

    renderFlattenGraphSimple() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">View Mode</h4>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Flatten Graph (2D-like)</span>
                    <input type="checkbox" id="flatten-graph-simple" style="width: 20px; height: 20px;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Toggle between 3D physics and flat 2D layout
                </div>
            </div>
        `;
    }

    renderNodeVisibilitySimple() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Node Visibility</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Show Technology Nodes</span>
                        <input type="checkbox" id="show-technology-nodes-simple" checked style="width: 20px; height: 20px;">
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Show Concept Nodes</span>
                        <input type="checkbox" id="show-concept-nodes-simple" checked style="width: 20px; height: 20px;">
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Show Company Nodes</span>
                        <input type="checkbox" id="show-company-nodes-simple" checked style="width: 20px; height: 20px;">
                    </label>
                </div>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Toggle visibility of different node types
                </div>
            </div>
        `;
    }

    renderPhysicsControlsSimple() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Graph Physics</h4>
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Force Strength</span>
                        <span id="force-value-simple" style="color: #00ff88; font-weight: bold;">-300</span>
                    </div>
                    <input type="range" id="force-strength-simple" min="-1000" max="-50" value="-300" 
                           style="width: 100%;">
                </label>
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Link Distance</span>
                        <span id="link-distance-value-simple" style="color: #00ff88; font-weight: bold;">30</span>
                    </div>
                    <input type="range" id="link-distance-simple" min="10" max="200" value="30" 
                           style="width: 100%;">
                </label>
                <label style="display: block;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Center Gravity</span>
                        <span id="center-gravity-value-simple" style="color: #00ff88; font-weight: bold;">0.3</span>
                    </div>
                    <input type="range" id="center-gravity-simple" min="0" max="1" step="0.1" value="0.3" 
                           style="width: 100%;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 10px; line-height: 1.4;">
                    • Force: How strongly nodes repel each other<br>
                    • Distance: Preferred length of connections<br>
                    • Gravity: Pull toward center (0=none, 1=strong)
                </div>
            </div>
        `;
    }

    renderLinkStrengthFilterSimple() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Link Strength Filter</h4>
                <label style="display: block;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Connection Threshold</span>
                        <span id="link-threshold-value-simple" style="color: #00ff88; font-weight: bold;">0</span>
                    </div>
                    <input type="range" id="link-threshold-simple" min="0" max="10" value="0" 
                           style="width: 100%;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Hide connections weaker than this value
                </div>
            </div>
        `;
    }

    renderEntityLimitSimple() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Number of Entities</h4>
                <label style="display: block;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Entity Count Limit</span>
                        <span id="entity-limit-value-simple" style="color: #00ff88; font-weight: bold;">200</span>
                    </div>
                    <input type="range" id="entity-limit-simple" min="10" max="500" value="200" 
                           style="width: 100%;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Limit the number of entities displayed
                </div>
            </div>
        `;
    }

    renderEntityTypeFilter() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Filter by Type</h4>
                <div class="select-buttons" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button onclick="selectAllTypes()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select All
                    </button>
                    <button onclick="selectNoneTypes()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select None
                    </button>
                </div>
                <div id="type-filters-simple" class="checkbox-group" 
                     style="max-height: 300px; overflow-y: auto; 
                            background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid #333; border-radius: 4px; 
                            padding: 10px;">
                </div>
            </div>
        `;
    }

    renderSearch() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Search</h4>
                <input type="text" id="search-input-simple" placeholder="Search nodes..." 
                       style="width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.5); 
                              border: 1px solid #333; border-radius: 4px; 
                              color: #eee; margin-bottom: 10px;">
                <label style="display: block;">
                    <span style="display: block; margin-bottom: 5px;">Search Depth</span>
                    <select id="search-depth-simple" style="width: 100%; padding: 8px; 
                            background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="0">Match Only</option>
                        <option value="1" selected>1 Level Out</option>
                        <option value="2">2 Levels Out</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Controls how many connections to show from search results
                </div>
            </div>
        `;
    }

    /**
     * ADVANCED MODE RENDERERS
     */
    
    renderViewModeAdvanced() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">View Mode</h4>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: block; margin-bottom: 5px;">Color By</span>
                    <select id="view-mode" style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="entity-type">Entity Type</option>
                        <option value="interest-level">Interest Level</option>
                        <option value="connections">Number of Connections</option>
                        <option value="all">All Connections</option>
                        <option value="technology">Technology Links Only</option>
                        <option value="concept">Concept Links Only</option>
                        <option value="recent-activity">Recent Activity</option>
                        <option value="high-interest">High Interest Only</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; line-height: 1.4;">
                    • Entity Type: Colors by company type<br>
                    • Interest Level: Strategic importance (1-10)<br>
                    • Number of Connections: How many other nodes connected
                </div>
            </div>
        `;
    }

    renderNodeSizeAdvanced() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Node Size</h4>
                <label style="display: block; margin-bottom: 10px;">
                    <span style="display: block; margin-bottom: 5px;">Size By</span>
                    <select id="node-size" style="width: 100%; padding: 8px; background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="uniform">Uniform</option>
                        <option value="url-count">By URL Count</option>
                        <option value="connections">By Connections</option>
                        <option value="interest-level">By Interest Level</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666;">
                    Control how node sizes are calculated
                </div>
            </div>
        `;
    }

    renderVisualSettings() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Visual Settings</h4>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Show Nodes</span>
                    <input type="checkbox" id="show-nodes" checked style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Show Links</span>
                    <input type="checkbox" id="show-links" checked style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Show Labels</span>
                    <input type="checkbox" id="show-labels" checked style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Label Font Size</span>
                        <span id="label-size-value" style="color: #00ff88; font-weight: bold;">12</span>
                    </div>
                    <input type="range" id="label-font-size" min="4" max="24" value="12" step="1"
                           style="width: 100%;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Show Particles</span>
                    <input type="checkbox" id="show-particles" checked style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: block; margin-bottom: 15px;" id="particle-speed-container">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Particle Speed</span>
                        <span id="particle-speed-value" style="color: #00ff88; font-weight: bold;">0.5x</span>
                    </div>
                    <input type="range" id="particle-speed" min="0.05" max="1" step="0.05" value="0.5" 
                           style="width: 100%;">
                </label>
                
                <label style="display: block; margin-bottom: 15px;" id="particle-count-container">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Particle Count</span>
                        <span id="particle-count-value" style="color: #00ff88; font-weight: bold;">4</span>
                    </div>
                    <input type="range" id="particle-count" min="0" max="10" step="1" value="4" 
                           style="width: 100%;">
                </label>
                
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Link Width Multiplier</span>
                        <span id="link-width-value" style="color: #00ff88; font-weight: bold;">12</span>
                    </div>
                    <input type="range" id="link-width-multiplier" min="1" max="50" value="12" 
                           style="width: 100%;">
                </label>
                
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Link Opacity</span>
                        <span id="link-opacity-value" style="color: #00ff88; font-weight: bold;">0.5</span>
                    </div>
                    <input type="range" id="link-opacity" min="0" max="1" step="0.1" value="0.5" 
                           style="width: 100%;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Floating Tooltip</span>
                    <input type="checkbox" id="floating-tooltip" checked style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Thin Lines</span>
                    <input type="checkbox" id="thin-lines" style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span>Monochrome Mode</span>
                    <input type="checkbox" id="monochrome-mode" style="width: 20px; height: 20px;">
                </label>
                
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Show Change Rings</span>
                    <input type="checkbox" id="show-change-rings" style="width: 20px; height: 20px;">
                </label>
            </div>
        `;
    }

    renderFlattenGraph() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">View Mode</h4>
                <label style="display: flex; align-items: center; justify-content: space-between;">
                    <span>Flatten Graph (2D-like)</span>
                    <input type="checkbox" id="flatten-graph" style="width: 20px; height: 20px;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Toggle between 3D physics and flat 2D layout
                </div>
            </div>
        `;
    }

    renderNodeVisibility() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Node Visibility</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Show Technology Nodes</span>
                        <input type="checkbox" id="show-technology-nodes" checked style="width: 20px; height: 20px;">
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Show Concept Nodes</span>
                        <input type="checkbox" id="show-concept-nodes" checked style="width: 20px; height: 20px;">
                    </label>
                    <label style="display: flex; align-items: center; justify-content: space-between;">
                        <span>Show Company Nodes</span>
                        <input type="checkbox" id="show-company-nodes" checked style="width: 20px; height: 20px;">
                    </label>
                </div>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Toggle visibility of different node types
                </div>
            </div>
        `;
    }

    renderCameraControls() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Camera Controls</h4>
                <button onclick="centerView()" 
                        style="width: 100%; padding: 12px; background: transparent; 
                               border: 2px solid #00ff88; color: #00ff88; 
                               border-radius: 4px; cursor: pointer; font-size: 16px;">
                    Center View
                </button>
            </div>
        `;
    }

    renderPhysicsControls() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Graph Physics</h4>
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Force Strength</span>
                        <span id="force-value" style="color: #00ff88; font-weight: bold;">-300</span>
                    </div>
                    <input type="range" id="force-strength" min="-1000" max="-50" value="-300" 
                           style="width: 100%;">
                </label>
                <label style="display: block; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Link Distance</span>
                        <span id="link-distance-value" style="color: #00ff88; font-weight: bold;">30</span>
                    </div>
                    <input type="range" id="link-distance" min="10" max="200" value="30" 
                           style="width: 100%;">
                </label>
                <label style="display: block;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Center Gravity</span>
                        <span id="center-gravity-value" style="color: #00ff88; font-weight: bold;">0.3</span>
                    </div>
                    <input type="range" id="center-gravity" min="0" max="1" step="0.1" value="0.3" 
                           style="width: 100%;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 10px; line-height: 1.4;">
                    • Force: How strongly nodes repel each other<br>
                    • Distance: Preferred length of connections<br>
                    • Gravity: Pull toward center (0=none, 1=strong)
                </div>
            </div>
        `;
    }

    renderLinkStrengthFilter() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Link Strength Filter</h4>
                <label style="display: block;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Connection Threshold</span>
                        <span id="link-threshold-value" style="color: #00ff88; font-weight: bold;">0</span>
                    </div>
                    <input type="range" id="link-threshold" min="0" max="10" value="0" 
                           style="width: 100%;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Hide connections weaker than this value
                </div>
            </div>
        `;
    }

    renderEntityLimit() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Number of Entities</h4>
                <label style="display: block;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Entity Count Limit</span>
                        <span id="entity-limit-value" style="color: #00ff88; font-weight: bold;">200</span>
                    </div>
                    <input type="range" id="entity-limit" min="10" max="500" value="200" 
                           style="width: 100%;">
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Limit the number of entities displayed
                </div>
            </div>
        `;
    }

    renderEntityTypeFilterAdvanced() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Filter by Type</h4>
                <div class="select-buttons" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button onclick="selectAllTypes()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select All
                    </button>
                    <button onclick="selectNoneTypes()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select None
                    </button>
                </div>
                <div id="type-filters" class="checkbox-group" 
                     style="max-height: 200px; overflow-y: auto; 
                            background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid #333; border-radius: 4px; 
                            padding: 10px;">
                </div>
            </div>
        `;
    }

    renderTechnologyFilter() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Filter by Technology</h4>
                <div class="select-buttons" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button onclick="selectAllTechnologies()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select All
                    </button>
                    <button onclick="selectNoneTechnologies()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select None
                    </button>
                </div>
                <input type="text" id="tech-search" placeholder="Search technologies..." 
                       style="width: 100%; padding: 8px; margin-bottom: 10px; 
                              background: rgba(0, 0, 0, 0.5); 
                              border: 1px solid #333; border-radius: 4px; color: #eee;">
                <div id="tech-filters" class="checkbox-group" 
                     style="max-height: 200px; overflow-y: auto; 
                            background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid #333; border-radius: 4px; 
                            padding: 10px;">
                </div>
            </div>
        `;
    }

    renderConceptFilter() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Filter by AI Concepts</h4>
                <div class="select-buttons" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button onclick="selectAllConcepts()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select All
                    </button>
                    <button onclick="selectNoneConcepts()" 
                            style="flex: 1; padding: 8px; background: transparent; 
                                   border: 1px solid #00ff88; color: #00ff88; 
                                   border-radius: 4px; cursor: pointer;">
                        Select None
                    </button>
                </div>
                <input type="text" id="concept-search" placeholder="Search concepts..." 
                       style="width: 100%; padding: 8px; margin-bottom: 10px; 
                              background: rgba(0, 0, 0, 0.5); 
                              border: 1px solid #333; border-radius: 4px; color: #eee;">
                <div id="concept-filters" class="checkbox-group" 
                     style="max-height: 200px; overflow-y: auto; 
                            background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid #333; border-radius: 4px; 
                            padding: 10px;">
                </div>
            </div>
        `;
    }

    renderSearchAdvanced() {
        return `
            <div class="control-group">
                <h4 style="color: #00ff88; font-size: 14px; margin-bottom: 10px;">Search</h4>
                <input type="text" id="search-input" placeholder="Search nodes..." 
                       style="width: 100%; padding: 10px; background: rgba(0, 0, 0, 0.5); 
                              border: 1px solid #333; border-radius: 4px; 
                              color: #eee; margin-bottom: 10px;">
                <label style="display: block;">
                    <span style="display: block; margin-bottom: 5px;">Search Depth</span>
                    <select id="search-depth" style="width: 100%; padding: 8px; 
                            background: rgba(0, 0, 0, 0.5); 
                            border: 1px solid #333; border-radius: 4px; color: #eee;">
                        <option value="0">Match Only</option>
                        <option value="1" selected>1 Level Out</option>
                        <option value="2">2 Levels Out</option>
                    </select>
                </label>
                <div class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                    Controls how many connections to show from search results
                </div>
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
            
            // Simple mode elements
            drawModeSimple: document.getElementById('draw-mode-simple'),
            viewModeSimple: document.getElementById('view-mode-simple'),
            nodeSizeSimple: document.getElementById('node-size-simple'),
            flattenGraphSimple: document.getElementById('flatten-graph-simple'),
            showTechnologyNodesSimple: document.getElementById('show-technology-nodes-simple'),
            showConceptNodesSimple: document.getElementById('show-concept-nodes-simple'),
            showCompanyNodesSimple: document.getElementById('show-company-nodes-simple'),
            forceStrengthSimple: document.getElementById('force-strength-simple'),
            linkDistanceSimple: document.getElementById('link-distance-simple'),
            centerGravitySimple: document.getElementById('center-gravity-simple'),
            linkThresholdSimple: document.getElementById('link-threshold-simple'),
            entityLimitSimple: document.getElementById('entity-limit-simple'),
            searchInputSimple: document.getElementById('search-input-simple'),
            searchDepthSimple: document.getElementById('search-depth-simple'),
            
            // Advanced mode elements
            viewMode: document.getElementById('view-mode'),
            nodeSize: document.getElementById('node-size'),
            searchDepth: document.getElementById('search-depth'),
            searchInput: document.getElementById('search-input'),
            techSearch: document.getElementById('tech-search'),
            conceptSearch: document.getElementById('concept-search'),
            
            // Visual settings sliders
            labelFontSize: document.getElementById('label-font-size'),
            linkWidthMultiplier: document.getElementById('link-width-multiplier'),
            linkOpacity: document.getElementById('link-opacity'),
            particleSpeed: document.getElementById('particle-speed'),
            particleCount: document.getElementById('particle-count'),
            
            // Physics sliders
            forceStrength: document.getElementById('force-strength'),
            linkDistance: document.getElementById('link-distance'),
            centerGravity: document.getElementById('center-gravity'),
            linkThreshold: document.getElementById('link-threshold'),
            entityLimit: document.getElementById('entity-limit'),
            
            // Checkboxes
            showNodes: document.getElementById('show-nodes'),
            showLinks: document.getElementById('show-links'),
            showLabels: document.getElementById('show-labels'),
            showParticles: document.getElementById('show-particles'),
            floatingTooltip: document.getElementById('floating-tooltip'),
            thinLines: document.getElementById('thin-lines'),
            monochromeMode: document.getElementById('monochrome-mode'),
            showChangeRings: document.getElementById('show-change-rings'),
            flattenGraph: document.getElementById('flatten-graph'),
            showTechnologyNodes: document.getElementById('show-technology-nodes'),
            showConceptNodes: document.getElementById('show-concept-nodes'),
            showCompanyNodes: document.getElementById('show-company-nodes'),
            
            // Display elements
            forceValueSimple: document.getElementById('force-value-simple'),
            particleSpeedValue: document.getElementById('particle-speed-value'),
            particleCountValue: document.getElementById('particle-count-value'),
            linkDistanceValueSimple: document.getElementById('link-distance-value-simple'),
            centerGravityValueSimple: document.getElementById('center-gravity-value-simple'),
            linkThresholdValueSimple: document.getElementById('link-threshold-value-simple'),
            entityLimitValueSimple: document.getElementById('entity-limit-value-simple'),
            labelSizeValue: document.getElementById('label-size-value'),
            linkWidthValue: document.getElementById('link-width-value'),
            linkOpacityValue: document.getElementById('link-opacity-value'),
            forceValue: document.getElementById('force-value'),
            linkDistanceValue: document.getElementById('link-distance-value'),
            centerGravityValue: document.getElementById('center-gravity-value'),
            linkThresholdValue: document.getElementById('link-threshold-value'),
            entityLimitValue: document.getElementById('entity-limit-value'),
            legendContent: document.getElementById('legend-content'),
            typeFiltersSimple: document.getElementById('type-filters-simple'),
            typeFilters: document.getElementById('type-filters'),
            techFilters: document.getElementById('tech-filters'),
            conceptFilters: document.getElementById('concept-filters')
        };
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Simple mode listeners
        if (this.elements.drawModeSimple) {
            this.elements.drawModeSimple.addEventListener('change', (e) => {
                if (this.callbacks.onDrawModeChange) {
                    this.callbacks.onDrawModeChange(e.target.value);
                }
            });
        }

        if (this.elements.viewModeSimple) {
            this.elements.viewModeSimple.addEventListener('change', (e) => {
                if (this.callbacks.onViewModeChange) {
                    this.callbacks.onViewModeChange(e.target.value);
                }
            });
        }

        if (this.elements.nodeSizeSimple) {
            this.elements.nodeSizeSimple.addEventListener('change', (e) => {
                if (this.callbacks.onNodeSizeChange) {
                    this.callbacks.onNodeSizeChange(e.target.value);
                }
            });
        }

        if (this.elements.searchInputSimple) {
            this.elements.searchInputSimple.addEventListener('input', (e) => {
                if (this.callbacks.onSearchChange) {
                    this.callbacks.onSearchChange(e.target.value);
                }
            });
        }

        if (this.elements.searchDepthSimple) {
            this.elements.searchDepthSimple.addEventListener('change', (e) => {
                if (this.callbacks.onSearchDepthChange) {
                    this.callbacks.onSearchDepthChange(parseInt(e.target.value));
                }
            });
        }

        // Simple mode checkboxes
        this.attachCheckboxListener('flattenGraphSimple', 'onFlattenGraphChange');
        this.attachCheckboxListener('showTechnologyNodesSimple', 'onShowTechnologyNodesChange');
        this.attachCheckboxListener('showConceptNodesSimple', 'onShowConceptNodesChange');
        this.attachCheckboxListener('showCompanyNodesSimple', 'onShowCompanyNodesChange');

        // Simple mode sliders
        this.attachSliderListener('forceStrengthSimple', 'forceValueSimple', 'onForceStrengthChange');
        this.attachSliderListener('linkDistanceSimple', 'linkDistanceValueSimple', 'onLinkDistanceChange');
        this.attachSliderListener('centerGravitySimple', 'centerGravityValueSimple', 'onCenterGravityChange');
        this.attachSliderListener('linkThresholdSimple', 'linkThresholdValueSimple', 'onLinkThresholdChange');
        this.attachSliderListener('entityLimitSimple', 'entityLimitValueSimple', 'onEntityLimitChange');

        // Advanced mode listeners
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

        // Visual settings sliders
        this.attachSliderListener('labelFontSize', 'labelSizeValue', 'onLabelFontSizeChange');
        this.attachSliderListener('linkWidthMultiplier', 'linkWidthValue', 'onLinkWidthChange');
        this.attachSliderListener('linkOpacity', 'linkOpacityValue', 'onLinkOpacityChange');
        
        // Physics sliders
        this.attachSliderListener('forceStrength', 'forceValue', 'onForceStrengthChange');
        this.attachSliderListener('linkDistance', 'linkDistanceValue', 'onLinkDistanceChange');
        this.attachSliderListener('centerGravity', 'centerGravityValue', 'onCenterGravityChange');
        this.attachSliderListener('linkThreshold', 'linkThresholdValue', 'onLinkThresholdChange');
        this.attachSliderListener('entityLimit', 'entityLimitValue', 'onEntityLimitChange');

        // Checkboxes
        this.attachCheckboxListener('showNodes', (checked) => {
            if (this.callbacks.onVisualToggle) {
                this.callbacks.onVisualToggle('nodes', checked);
            }
        });
        this.attachCheckboxListener('showLinks', (checked) => {
            if (this.callbacks.onVisualToggle) {
                this.callbacks.onVisualToggle('links', checked);
            }
        });
        this.attachCheckboxListener('showLabels', (checked) => {
            if (this.callbacks.onVisualToggle) {
                this.callbacks.onVisualToggle('labels', checked);
            }
        });
        this.attachCheckboxListener('showParticles', (checked) => {
            if (this.callbacks.onVisualToggle) {
                this.callbacks.onVisualToggle('particles', checked);
            }
            // Show/hide particle speed and count sliders
            const speedContainer = document.getElementById('particle-speed-container');
            const countContainer = document.getElementById('particle-count-container');
            if (speedContainer) {
                speedContainer.style.display = checked ? 'block' : 'none';
            }
            if (countContainer) {
                countContainer.style.display = checked ? 'block' : 'none';
            }
        });
        
        // Particle speed slider
        if (this.elements.particleSpeed) {
            this.elements.particleSpeed.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                if (this.elements.particleSpeedValue) {
                    // Format display based on value
                    if (speed < 0.1) {
                        this.elements.particleSpeedValue.textContent = speed.toFixed(2) + 'x';
                    } else {
                        this.elements.particleSpeedValue.textContent = speed.toFixed(1) + 'x';
                    }
                }
                if (this.callbacks.onParticleSpeedChange) {
                    this.callbacks.onParticleSpeedChange(speed);
                }
            });
        }
        
        // Particle count slider
        if (this.elements.particleCount) {
            this.elements.particleCount.addEventListener('input', (e) => {
                const count = parseInt(e.target.value);
                if (this.elements.particleCountValue) {
                    this.elements.particleCountValue.textContent = count;
                }
                if (this.callbacks.onParticleCountChange) {
                    this.callbacks.onParticleCountChange(count);
                }
            });
        }
        this.attachCheckboxListener('thinLines', (checked) => {
            if (this.callbacks.onVisualToggle) {
                this.callbacks.onVisualToggle('thinLines', checked);
            }
        });
        this.attachCheckboxListener('monochromeMode', 'onMonochromeModeChange');
        this.attachCheckboxListener('showChangeRings', 'onShowChangeRingsChange');
        this.attachCheckboxListener('flattenGraph', 'onFlattenGraphChange');
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
     * Update legend
     */
    updateLegend(legendData) {
        if (!this.elements.legendContent) return;
        
        this.elements.legendContent.innerHTML = legendData.map(item => `
            <div class="legend-item" style="display: flex; align-items: center; margin: 8px 0;">
                <span class="legend-color" style="display: inline-block; width: 12px; height: 12px; 
                      border-radius: 50%; background: ${item.color}; margin-right: 10px;"></span>
                <span style="flex: 1;">${item.type} (${item.count})</span>
            </div>
        `).join('');
    }

    /**
     * Update entity type filters
     */
    updateEntityTypeFilters(types, selected) {
        // Update both simple and advanced mode filters
        const updateFilters = (containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            container.innerHTML = types.map(type => `
                <label style="display: flex; align-items: center; padding: 8px 0; 
                              border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <input type="checkbox" value="${type.name}" 
                           ${selected.has(type.name) ? 'checked' : ''}
                           onchange="handleEntityTypeChange(this)"
                           style="width: 20px; height: 20px; margin-right: 10px; cursor: pointer;">
                    <span style="flex: 1;">${type.name}</span>
                    <span style="color: #666; font-size: 12px;">(${type.count})</span>
                </label>
            `).join('');
        };
        
        updateFilters('type-filters-simple');
        updateFilters('type-filters');
    }

    /**
     * Update technology filters
     */
    updateTechnologyFilters(technologies, selected) {
        if (!this.elements.techFilters) return;
        
        this.elements.techFilters.innerHTML = technologies.map(tech => `
            <label style="display: flex; align-items: center; padding: 6px 0;">
                <input type="checkbox" value="${tech.name}" 
                       ${selected.has(tech.name) ? 'checked' : ''}
                       onchange="handleTechnologyChange(this)"
                       style="width: 20px; height: 20px; margin-right: 8px;">
                <span style="flex: 1; font-size: 12px;">${tech.name}</span>
                <span style="color: #666; font-size: 11px;">(${tech.count})</span>
            </label>
        `).join('');
    }

    /**
     * Update concept filters
     */
    updateConceptFilters(concepts, selected) {
        if (!this.elements.conceptFilters) return;
        
        this.elements.conceptFilters.innerHTML = concepts.map(concept => `
            <label style="display: flex; align-items: center; padding: 6px 0;">
                <input type="checkbox" value="${concept.name}" 
                       ${selected.has(concept.name) ? 'checked' : ''}
                       onchange="handleConceptChange(this)"
                       style="width: 20px; height: 20px; margin-right: 8px;">
                <span style="flex: 1; font-size: 12px;">${concept.name}</span>
                <span style="color: #666; font-size: 11px;">(${concept.count})</span>
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
            label.style.display = text.includes(lowerQuery) ? 'flex' : 'none';
        });
    }

    /**
     * Set configuration mode
     */
    setConfigMode(mode) {
        this.configMode = mode;
        const simpleSections = document.querySelector('.simple-sections');
        const advancedSections = document.querySelector('.advanced-sections');
        
        if (mode === 'simple') {
            this.elements.simpleModeBtn?.classList.add('active');
            this.elements.advancedModeBtn?.classList.remove('active');
            if (simpleSections) simpleSections.style.display = 'block';
            if (advancedSections) advancedSections.style.display = 'none';
        } else {
            this.elements.simpleModeBtn?.classList.remove('active');
            this.elements.advancedModeBtn?.classList.add('active');
            if (simpleSections) simpleSections.style.display = 'none';
            if (advancedSections) advancedSections.style.display = 'block';
        }
    }

    /**
     * Show custom tag filter UI
     */
    showCustomTagFilter(tag) {
        const infoPanel = document.getElementById('node-info');
        if (infoPanel) {
            infoPanel.innerHTML = `
                <div style="padding: 10px; background: rgba(0, 255, 136, 0.1); 
                            border: 1px solid #00ff88; border-radius: 4px;">
                    <strong>Filtering by: ${tag}</strong>
                    <button onclick="clearTagFilter()" 
                            style="margin-left: 10px; padding: 2px 8px;">
                        Clear Filter
                    </button>
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

    /**
     * Toggle controls collapse
     */
    toggleControlsCollapse() {
        const controls = document.getElementById('controls');
        const btn = controls?.querySelector('.collapse-btn');
        if (controls) {
            controls.classList.toggle('collapsed');
            if (btn) btn.textContent = controls.classList.contains('collapsed') ? '◀' : '▶';
        }
    }
}

// Create singleton instance
export const graph3DUI = new Graph3DUI();
