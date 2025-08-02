/**
 * @module graph-3d
 * @description Main 3D force graph coordinator managing all graph sub-modules
 * @since 1.0.0
 */

/**
 * 3D Graph Main Coordinator Module
 * Orchestrates all 3D graph modules to create the complete visualization
 */

// Import all modules
import { graph3DCore } from './graph-3d-core.js';
import { graph3DPhysics } from './graph-3d-physics.js';
import { graph3DVisuals } from './graph-3d-visuals.js';
import { graph3DFilters } from './graph-3d-filters.js';
import { graph3DUI } from './graph-3d-ui.js';
import { graph3DData } from './graph-3d-data.js';
import { graph3DContext } from './graph-3d-context.js';
import { graph3DTooltip } from './graph-3d-tooltip.js';
import { graph3DMobile } from './graph-3d-mobile.js';

// Main coordinator class
class Graph3DCoordinator {
    constructor() {
        this.initialized = false;
        this.container = null;
        this.controlsContainer = null;
        this.infoContainer = null;
        this.rawData = null;
        this.filteredData = null;
        this.isPaused = false;
    }

    /**
     * Initialize the complete 3D graph system
     * @param {Object} config - Configuration options
     */
    async init(config = {}) {
        try {
            // Get containers
            this.container = document.getElementById(config.graphContainer || '3d-graph');
            this.controlsContainer = document.getElementById(config.controlsContainer || 'controls');
            this.infoContainer = document.getElementById(config.infoContainer || 'info');

            if (!this.container) {
                throw new Error('Graph container not found');
            }

            // Show loading message
            this.showLoading(true);

            // Initialize mobile UI first
            graph3DMobile.init();

            // Load data
            this.rawData = await graph3DData.loadData();

            // Initialize core graph
            const graph = graph3DCore.init(this.container, {
                backgroundColor: '#0a0a0f'
            });

            // Initialize physics
            graph3DPhysics.init(graph);

            // Initialize UI with callbacks
            if (this.controlsContainer) {
                graph3DUI.init(this.controlsContainer, this.createUICallbacks());
                this.populateFilters();
            }

            // Initialize tooltip
            graph3DTooltip.init();

            // Initialize context menu
            graph3DContext.init(this.createContextCallbacks());

            // Set up graph event handlers
            this.setupGraphEvents();

            // Apply initial filters and render
            this.applyFiltersAndRender();

            // Update initial UI state
            this.updateUIState();

            // Hide loading message
            this.showLoading(false);

            // Show info panel
            if (this.infoContainer) {
                this.infoContainer.style.display = 'block';
            }

            // Store globally for legacy compatibility
            window.Graph = graph;
            window.graphData = this.rawData;
            window.rawData = this.rawData;

            this.initialized = true;
            } catch (error) {
            console.error('Error initializing 3D graph:', error);
            this.showError(error.message);
            throw error;
        }
    }

    /**
     * Create UI callbacks
     */
    createUICallbacks() {
        return {
            // Draw mode
            onDrawModeChange: (mode) => {
                graph3DPhysics.applyLayout(mode, this.filteredData);
            },

            // View mode
            onViewModeChange: (mode) => {
                // Handle special view modes that affect filtering
                if (mode === 'high-interest') {
                    graph3DFilters.setViewModeFilter('high-interest');
                } else if (mode === 'recent-activity') {
                    graph3DFilters.setViewModeFilter('recent-activity');
                } else {
                    graph3DFilters.setViewModeFilter(null);
                }

                // Handle link-only modes
                let linkFilter = 'all';
                if (mode === 'technology') linkFilter = 'technology';
                else if (mode === 'concept') linkFilter = 'concept';

                // Apply visual mode
                graph3DVisuals.applyViewMode(mode, this.filteredData);
                graph3DVisuals.applyLinkVisuals(this.filteredData, linkFilter);
                
                this.applyFiltersAndRender();
            },

            // Node size
            onNodeSizeChange: (mode) => {
                graph3DVisuals.applyNodeSize(mode, this.filteredData);
            },

            // Search
            onSearchChange: (query) => {
                graph3DFilters.setSearchQuery(query);
                this.applyFiltersAndRender();
            },

            onSearchDepthChange: (depth) => {
                graph3DFilters.setSearchDepth(depth);
                if (graph3DFilters.searchQuery) {
                    this.applyFiltersAndRender();
                }
            },

            // Physics controls
            onForceStrengthChange: (value) => {
                graph3DPhysics.setForceStrength(value);
            },

            onLinkDistanceChange: (value) => {
                graph3DPhysics.setLinkDistance(value);
            },

            onCenterGravityChange: (value) => {
                graph3DPhysics.setCenterGravity(value);
            },

            // Filter controls
            onLinkThresholdChange: (value) => {
                graph3DFilters.setLinkThreshold(value);
                this.applyFiltersAndRender();
            },

            onEntityLimitChange: (value) => {
                graph3DFilters.setEntityLimit(value);
                this.applyFiltersAndRender();
            },

            // Visual settings
            onShowLinksChange: (checked) => {
                graph3DVisuals.toggleSetting('links', checked);
                graph3DVisuals.applyLinkVisuals(this.filteredData);
            },

            onShowLabelsChange: (checked) => {
                graph3DVisuals.toggleSetting('labels', checked);
            },

            onShowParticlesChange: (checked) => {
                graph3DVisuals.toggleSetting('particles', checked);
            },

            onThinLinesChange: (checked) => {
                graph3DVisuals.toggleSetting('thinLines', checked);
                graph3DVisuals.applyLinkVisuals(this.filteredData);
            },

            onFloatingTooltipChange: (checked) => {
                graph3DTooltip.setEnabled(checked);
            },

            onMonochromeModeChange: (checked) => {
                graph3DVisuals.toggleSetting('monochrome', checked);
                graph3DVisuals.applyViewMode(graph3DVisuals.viewMode, this.filteredData);
                graph3DVisuals.applyLinkVisuals(this.filteredData);
                this.updateUIState();
            },

            onShowChangeRingsChange: (checked) => {
                graph3DVisuals.toggleSetting('changeRings', checked);
            },

            onAutoRotateChange: (checked) => {
                graph3DVisuals.toggleSetting('autoRotate', checked);
            },

            // Node visibility
            onShowTechnologyNodesChange: (checked) => {
                graph3DFilters.setNodeTypeVisibility('technology', checked);
                this.applyFiltersAndRender();
            },

            onShowConceptNodesChange: (checked) => {
                graph3DFilters.setNodeTypeVisibility('concept', checked);
                this.applyFiltersAndRender();
            },

            onShowCompanyNodesChange: (checked) => {
                graph3DFilters.setNodeTypeVisibility('company', checked);
                this.applyFiltersAndRender();
            }
        };
    }

    /**
     * Create context menu callbacks
     */
    createContextCallbacks() {
        return {
            onReset: () => this.resetAll(),
            onFitToWindow: () => graph3DCore.fitToView(),
            onToggleParticles: () => {
                const particles = document.getElementById('show-particles');
                if (particles) {
                    particles.checked = !particles.checked;
                    particles.dispatchEvent(new Event('change'));
                }
            },
            onToggleLabels: () => {
                const labels = document.getElementById('show-labels');
                if (labels) {
                    labels.checked = !labels.checked;
                    labels.dispatchEvent(new Event('change'));
                }
            },
            onShowAll: () => this.showAllNodes(),
            onTogglePause: () => this.togglePause(),
            onZoomIn: () => this.zoom(0.9),
            onZoomOut: () => this.zoom(1.1),
            onRotateLeft: () => this.rotate(-0.05),
            onRotateRight: () => this.rotate(0.05),
            onEscape: () => this.clearFilters(),
            onQuickViewMode: (mode) => {
                const viewMode = document.getElementById('view-mode');
                if (viewMode) {
                    viewMode.value = mode;
                    viewMode.dispatchEvent(new Event('change'));
                }
            }
        };
    }

    /**
     * Set up graph event handlers
     */
    setupGraphEvents() {
        const graph = graph3DCore.getGraph();
        if (!graph) return;

        // Override default handlers
        graph3DCore.handleNodeClick = (node) => {
            graph3DCore.centerOnNode(node);
        };

        graph3DCore.handleNodeRightClick = (node, event) => {
            event.preventDefault();
            graph3DContext.show(node, event);
        };

        graph3DCore.handleNodeHover = (node) => {
            if (node) {
                graph3DTooltip.show(node);
                this.updateInfoPanel(node);
            } else {
                graph3DTooltip.hide();
                this.updateInfoPanel(null);
            }
        };
    }

    /**
     * Apply filters and render
     */
    applyFiltersAndRender() {
        // Apply filters
        this.filteredData = graph3DFilters.applyFilters(this.rawData);

        // Apply visuals
        graph3DVisuals.applyViewMode(graph3DVisuals.viewMode, this.filteredData);
        graph3DVisuals.applyNodeSize(graph3DVisuals.nodeSize, this.filteredData);
        graph3DVisuals.applyLinkVisuals(this.filteredData);

        // Update graph
        graph3DCore.updateData(this.filteredData);

        // Update UI
        this.updateUIState();
    }

    /**
     * Populate filter checkboxes
     */
    populateFilters() {
        const stats = graph3DData.getStatistics();
        
        // Entity types
        const entityTypes = stats.entityTypes.map(type => ({
            name: type,
            count: this.rawData.nodes.filter(n => n.companyType === type).length
        }));
        graph3DUI.updateEntityTypeFilters(entityTypes, graph3DFilters.entityTypeFilters);

        // Technologies
        const technologies = this.rawData.nodes
            .filter(n => n.nodeType === 'technology')
            .map(n => ({ name: n.name, count: n.companyCount }))
            .sort((a, b) => b.count - a.count);
        graph3DUI.updateTechnologyFilters(technologies, graph3DFilters.technologyFilters);

        // Concepts
        const concepts = this.rawData.nodes
            .filter(n => n.nodeType === 'concept')
            .map(n => ({ name: n.name, count: n.companyCount }))
            .sort((a, b) => b.count - a.count);
        graph3DUI.updateConceptFilters(concepts, graph3DFilters.conceptFilters);
    }

    /**
     * Update UI state
     */
    updateUIState() {
        // Update stats
        const stats = {
            companies: this.filteredData.nodes.filter(n => n.nodeType === 'company').length,
            urls: this.filteredData.nodes
                .filter(n => n.nodeType === 'company')
                .reduce((sum, n) => sum + (n.urlCount || 0), 0),
            nodes: this.filteredData.nodes.length,
            links: this.filteredData.links.length
        };
        graph3DUI.updateStats(stats);

        // Update legend
        const legendData = graph3DVisuals.getLegendData(this.filteredData);
        graph3DUI.updateLegend(legendData);
    }

    /**
     * Update info panel
     */
    updateInfoPanel(node) {
        const nodeInfo = document.getElementById('node-info');
        if (!nodeInfo) return;

        if (node) {
            nodeInfo.innerHTML = graph3DTooltip.generateContent(node);
        } else {
            nodeInfo.innerHTML = 'Hover over nodes for details';
        }
    }

    /**
     * Show loading message
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `<div style="color: #ff4444;">Error: ${message}</div>`;
        }
    }

    /**
     * Global function handlers (for onclick attributes)
     */
    setupGlobalHandlers() {
        // Mode switching
        window.setConfigMode = (mode) => graph3DUI.setConfigMode(mode);
        
        // Filter actions
        window.selectAllTypes = () => {
            const checkboxes = document.querySelectorAll('#type-filters input[type="checkbox"]');
            const types = new Set();
            checkboxes.forEach(cb => {
                cb.checked = true;
                types.add(cb.value);
            });
            graph3DFilters.setEntityTypeFilters(types);
            this.applyFiltersAndRender();
        };

        window.selectNoneTypes = () => {
            const checkboxes = document.querySelectorAll('#type-filters input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            graph3DFilters.setEntityTypeFilters(new Set());
            this.applyFiltersAndRender();
        };

        window.centerView = () => graph3DCore.fitToView();

        window.toggleControlsCollapse = () => {
            const controls = document.getElementById('controls');
            const btn = controls?.querySelector('.collapse-btn');
            if (controls) {
                controls.classList.toggle('collapsed');
                if (btn) btn.textContent = controls.classList.contains('collapsed') ? '←' : '→';
            }
        };

        // Context menu actions
        window.hideContextMenu = () => graph3DContext.hide();
        window.focusOnContextNode = () => {
            const node = graph3DContext.getContextNode();
            if (node) {
                // Show only this node and connected
                graph3DFilters.setSearchQuery(node.name);
                graph3DFilters.setSearchDepth(1);
                this.applyFiltersAndRender();
                graph3DContext.hide();
            }
        };
        window.centerOnContextNode = () => {
            const node = graph3DContext.getContextNode();
            if (node) {
                graph3DCore.centerOnNode(node);
                graph3DContext.hide();
            }
        };
        window.showAllNodes = () => this.showAllNodes();
        window.fitToWindow = () => {
            graph3DCore.fitToView();
            graph3DContext.hide();
        };

        // Tag filtering
        window.filterByTag = (tag) => {
            graph3DFilters.setCustomTagFilter(tag);
            graph3DUI.showCustomTagFilter(tag);
            this.applyFiltersAndRender();
        };

        window.clearTagFilter = () => {
            graph3DFilters.setCustomTagFilter(null);
            graph3DUI.clearCustomTagFilter();
            this.applyFiltersAndRender();
        };

        // Filter handlers
        window.handleEntityTypeChange = (checkbox) => {
            const types = new Set();
            document.querySelectorAll('#type-filters input[type="checkbox"]:checked')
                .forEach(cb => types.add(cb.value));
            graph3DFilters.setEntityTypeFilters(types);
            this.applyFiltersAndRender();
        };

        window.handleTechnologyChange = (checkbox) => {
            const techs = new Set();
            document.querySelectorAll('#tech-filters input[type="checkbox"]:checked')
                .forEach(cb => techs.add(cb.value));
            graph3DFilters.setTechnologyFilters(techs);
            this.applyFiltersAndRender();
        };

        window.handleConceptChange = (checkbox) => {
            const concepts = new Set();
            document.querySelectorAll('#concept-filters input[type="checkbox"]:checked')
                .forEach(cb => concepts.add(cb.value));
            graph3DFilters.setConceptFilters(concepts);
            this.applyFiltersAndRender();
        };

        // Mobile callbacks
        window.graph3DCallbacks = {
            onPinchZoom: (factor) => this.zoom(1 - factor),
            onOrientationChange: (orientation) => {
                setTimeout(() => graph3DCore.fitToView(), 500);
            }
        };
    }

    /**
     * Helper methods
     */
    resetAll() {
        graph3DFilters.clearAllFilters();
        graph3DCore.fitToView();
        this.applyFiltersAndRender();
    }

    showAllNodes() {
        graph3DFilters.clearAllFilters();
        this.applyFiltersAndRender();
    }

    clearFilters() {
        document.getElementById('search-input').value = '';
        graph3DFilters.setSearchQuery('');
        graph3DFilters.setCustomTagFilter(null);
        graph3DUI.clearCustomTagFilter();
        this.applyFiltersAndRender();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        graph3DCore.setPaused(this.isPaused);
    }

    zoom(factor) {
        const graph = graph3DCore.getGraph();
        if (!graph) return;
        
        const camera = graph.camera();
        const distance = camera.position.length();
        const newDistance = distance * factor;
        
        camera.position.x *= newDistance / distance;
        camera.position.y *= newDistance / distance;
        camera.position.z *= newDistance / distance;
        camera.updateProjectionMatrix();
    }

    rotate(angle) {
        const graph = graph3DCore.getGraph();
        if (!graph) return;
        
        const camera = graph.camera();
        const x = camera.position.x;
        const z = camera.position.z;
        
        camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
        camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    }
}

// Create and export singleton instance
export const graph3D = new Graph3DCoordinator();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        graph3D.setupGlobalHandlers();
        await graph3D.init();
    });
} else {
    graph3D.setupGlobalHandlers();
    graph3D.init();
}
