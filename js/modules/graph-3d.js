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
import { graph3DCore } from './graph-3d-core.js?v=20250802b';
import { graph3DPhysics } from './graph-3d-physics.js?v=20250802';
import { graph3DVisuals } from './graph-3d-visuals.js?v=20250802';
import { graph3DFilters } from './graph-3d-filters.js?v=20250802';
import { graph3DUI } from './graph-3d-ui.js?v=20250802';
import { graph3DData } from './graph-3d-data.js?v=20250802';
import { graph3DContext } from './graph-3d-context.js?v=20250802';
import { graph3DTooltip } from './graph-3d-tooltip.js?v=20250802';
import { graph3DMobile } from './graph-3d-mobile.js?v=20250802';

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
            console.log('Starting 3D graph initialization...');
            
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
            if (graph3DMobile && graph3DMobile.init) {
                graph3DMobile.init();
            }

            // Load data
            console.log('Loading data...');
            const loadedData = await graph3DData.loadData();
            console.log('Data loaded:', loadedData);
            
            // Process the data into graph format
            this.rawData = graph3DData.processIntoGraphData(loadedData);
            this.filteredData = this.rawData;
            console.log('Processed graph data:', this.rawData);

            // Initialize core graph
            console.log('Initializing core graph...');
            const graph = await graph3DCore.initialize(this.container, {
                backgroundColor: '#0a0a0f'
            });

            // Initialize physics
            if (graph3DPhysics && graph3DPhysics.init) {
                graph3DPhysics.init(graph);
            }

            // Initialize UI with callbacks
            if (this.controlsContainer && graph3DUI && graph3DUI.init) {
                graph3DUI.init(this.controlsContainer, this.createUICallbacks());
                this.populateFilters();
            }

            // Initialize tooltip
            if (graph3DTooltip && graph3DTooltip.init) {
                graph3DTooltip.init();
            }

            // Initialize context menu
            if (graph3DContext && graph3DContext.init) {
                graph3DContext.init(this.createContextCallbacks());
            }

            // Set up global handlers
            this.setupGlobalHandlers();

            // Set up graph event handlers
            this.setupGraphEvents();

            // Apply initial data to graph
            if (graph3DCore && this.rawData) {
                console.log('Setting initial graph data...');
                graph3DCore.updateData(this.rawData);
                
                // Apply initial visuals after data is set
                console.log('Applying initial visuals...');
                if (graph3DVisuals) {
                    graph3DVisuals.applyViewMode('entity-type', this.rawData);
                    graph3DVisuals.applyNodeSize('uniform', this.rawData);
                    graph3DVisuals.applyLinkVisuals(this.rawData);
                    
                    // Initialize labels if enabled
                    if (graph3DVisuals.showLabels) {
                        graph3DCore.setNodeLabels(true, node => node.name);
                    }
                }
            }

            // Update initial UI state
            this.updateUIState();

            // Hide loading message
            this.showLoading(false);

            // Show info panel
            if (this.infoContainer) {
                this.infoContainer.style.display = 'block';
            }

            // Show controls
            if (this.controlsContainer) {
                this.controlsContainer.style.display = 'block';
            }

            // Store globally for legacy compatibility
            window.Graph = graph;
            window.graphData = this.rawData;
            window.rawData = this.rawData;
            window.graph3D = this;

            this.initialized = true;
            console.log('3D graph initialization complete');
            
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
                if (graph3DPhysics && graph3DPhysics.applyLayout) {
                    graph3DPhysics.applyLayout(mode, this.filteredData);
                }
            },

            // View mode
            onViewModeChange: (mode) => {
                // Handle special view modes that affect filtering
                if (graph3DFilters) {
                    if (mode === 'high-interest') {
                        graph3DFilters.setViewModeFilter('high-interest');
                    } else if (mode === 'recent-activity') {
                        graph3DFilters.setViewModeFilter('recent-activity');
                    } else {
                        graph3DFilters.setViewModeFilter(null);
                    }
                }

                // Handle link-only modes
                let linkFilter = 'all';
                if (mode === 'technology') linkFilter = 'technology';
                else if (mode === 'concept') linkFilter = 'concept';

                // Apply visual mode
                if (graph3DVisuals) {
                    graph3DVisuals.applyViewMode(mode, this.filteredData);
                    graph3DVisuals.applyLinkVisuals(this.filteredData, linkFilter);
                }
                
                this.applyFiltersAndRender();
            },

            // Visual toggles
            onVisualToggle: (setting, value) => {
                if (graph3DVisuals && graph3DVisuals.toggleSetting) {
                    graph3DVisuals.toggleSetting(setting, value);
                    // Always re-render after visual changes
                    this.applyFiltersAndRender();
                }
            },

            // Flatten graph (2D/3D toggle)
            onFlattenGraphChange: (flatten) => {
                if (graph3DCore && graph3DCore.setFlattenMode) {
                    graph3DCore.setFlattenMode(flatten, () => {
                        // Refresh forces after dimension change to fix compression
                        if (graph3DPhysics && graph3DPhysics.setForceStrength) {
                            const currentStrength = graph3DPhysics.forceStrength;
                            graph3DPhysics.setForceStrength(currentStrength);
                        }
                    });
                }
            },

            // Label font size
            onLabelFontSizeChange: (size) => {
                if (graph3DVisuals && graph3DVisuals.setLabelFontSize) {
                    graph3DVisuals.setLabelFontSize(size);
                }
            },

            // Link width change
            onLinkWidthChange: (value) => {
                // Just trigger a re-render which will pick up the new value
                if (graph3DVisuals && graph3DVisuals.applyLinkVisuals) {
                    graph3DVisuals.applyLinkVisuals(this.filteredData);
                }
            },

            // Link opacity change
            onLinkOpacityChange: (value) => {
                // Just trigger a re-render which will pick up the new value
                if (graph3DVisuals && graph3DVisuals.applyLinkVisuals) {
                    graph3DVisuals.applyLinkVisuals(this.filteredData);
                }
            },

            // Node size
            onNodeSizeChange: (mode) => {
                if (graph3DVisuals && graph3DVisuals.applyNodeSize) {
                    graph3DVisuals.applyNodeSize(mode, this.filteredData);
                }
            },

            // Search
            onSearchChange: (query) => {
                if (graph3DFilters && graph3DFilters.setSearchQuery) {
                    graph3DFilters.setSearchQuery(query);
                    this.applyFiltersAndRender();
                }
            },

            onSearchDepthChange: (depth) => {
                if (graph3DFilters) {
                    graph3DFilters.setSearchDepth(depth);
                    if (graph3DFilters.searchQuery) {
                        this.applyFiltersAndRender();
                    }
                }
            },

            // Physics controls
            onForceStrengthChange: (value) => {
                if (graph3DPhysics && graph3DPhysics.setForceStrength) {
                    graph3DPhysics.setForceStrength(value);
                }
            },

            onLinkDistanceChange: (value) => {
                if (graph3DPhysics && graph3DPhysics.setLinkDistance) {
                    graph3DPhysics.setLinkDistance(value);
                }
            },

            onCenterGravityChange: (value) => {
                if (graph3DPhysics && graph3DPhysics.setCenterGravity) {
                    graph3DPhysics.setCenterGravity(value);
                }
            },

            // Filter controls
            onLinkThresholdChange: (value) => {
                if (graph3DFilters && graph3DFilters.setLinkThreshold) {
                    graph3DFilters.setLinkThreshold(value);
                    this.applyFiltersAndRender();
                }
            },

            onEntityLimitChange: (value) => {
                if (graph3DFilters && graph3DFilters.setEntityLimit) {
                    graph3DFilters.setEntityLimit(value);
                    this.applyFiltersAndRender();
                }
            },

            // Visual settings
            onShowLinksChange: (checked) => {
                if (graph3DVisuals) {
                    graph3DVisuals.toggleSetting('links', checked);
                    graph3DVisuals.applyLinkVisuals(this.filteredData);
                }
            },

            onShowLabelsChange: (checked) => {
                if (graph3DVisuals && graph3DVisuals.toggleSetting) {
                    graph3DVisuals.toggleSetting('labels', checked);
                }
            },

            onShowParticlesChange: (checked) => {
                if (graph3DVisuals && graph3DVisuals.toggleSetting) {
                    graph3DVisuals.toggleSetting('particles', checked);
                }
            },

            onThinLinesChange: (checked) => {
                if (graph3DVisuals) {
                    graph3DVisuals.toggleSetting('thinLines', checked);
                    graph3DVisuals.applyLinkVisuals(this.filteredData);
                }
            },

            onFloatingTooltipChange: (checked) => {
                if (graph3DTooltip && graph3DTooltip.setEnabled) {
                    graph3DTooltip.setEnabled(checked);
                }
            },

            onMonochromeModeChange: (checked) => {
                if (graph3DVisuals) {
                    graph3DVisuals.toggleSetting('monochrome', checked);
                    graph3DVisuals.applyViewMode(graph3DVisuals.viewMode, this.filteredData);
                    graph3DVisuals.applyLinkVisuals(this.filteredData);
                }
                this.updateUIState();
            },

            onShowChangeRingsChange: (checked) => {
                if (graph3DVisuals && graph3DVisuals.toggleSetting) {
                    graph3DVisuals.toggleSetting('changeRings', checked);
                }
            },

            onAutoRotateChange: (checked) => {
                if (graph3DVisuals && graph3DVisuals.toggleSetting) {
                    graph3DVisuals.toggleSetting('autoRotate', checked);
                }
            },

            // Node visibility
            onShowTechnologyNodesChange: (checked) => {
                if (graph3DFilters && graph3DFilters.setNodeTypeVisibility) {
                    graph3DFilters.setNodeTypeVisibility('technology', checked);
                    this.applyFiltersAndRender();
                }
            },

            onShowConceptNodesChange: (checked) => {
                if (graph3DFilters && graph3DFilters.setNodeTypeVisibility) {
                    graph3DFilters.setNodeTypeVisibility('concept', checked);
                    this.applyFiltersAndRender();
                }
            },

            onShowCompanyNodesChange: (checked) => {
                if (graph3DFilters && graph3DFilters.setNodeTypeVisibility) {
                    graph3DFilters.setNodeTypeVisibility('company', checked);
                    this.applyFiltersAndRender();
                }
            }
        };
    }

    /**
     * Create context menu callbacks
     */
    createContextCallbacks() {
        return {
            onReset: () => this.resetAll(),
            onFitToWindow: () => {
                if (graph3DCore && graph3DCore.fitToView) {
                    graph3DCore.fitToView();
                }
            },
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
        const graph = graph3DCore.getGraphInstance();
        if (!graph) {
            console.warn('Graph not yet initialized in setupGraphEvents');
            return;
        }

        // Set up node interaction handlers
        graph
            .onNodeClick(node => {
                if (graph3DCore && graph3DCore.centerOnNode) {
                    graph3DCore.centerOnNode(node);
                }
            })
            .onNodeRightClick((node, event) => {
                event.preventDefault();
                if (graph3DContext && graph3DContext.show) {
                    graph3DContext.show(node, event);
                }
            })
            .onNodeHover(node => {
                if (node) {
                    if (graph3DTooltip && graph3DTooltip.show) {
                        graph3DTooltip.show(node);
                    }
                    this.updateInfoPanel(node);
                } else {
                    if (graph3DTooltip && graph3DTooltip.hide) {
                        graph3DTooltip.hide();
                    }
                    this.updateInfoPanel(null);
                }
            });
    }

    /**
     * Apply filters and render
     */
    applyFiltersAndRender() {
        if (!this.rawData) return;
        
        // Apply filters
        if (graph3DFilters && graph3DFilters.applyFilters) {
            this.filteredData = graph3DFilters.applyFilters(this.rawData);
        } else {
            this.filteredData = this.rawData;
        }

        // Apply visuals
        if (graph3DVisuals) {
            if (graph3DVisuals.applyViewMode) {
                graph3DVisuals.applyViewMode(graph3DVisuals.viewMode, this.filteredData);
            }
            if (graph3DVisuals.applyNodeSize) {
                graph3DVisuals.applyNodeSize(graph3DVisuals.nodeSize, this.filteredData);
            }
            if (graph3DVisuals.applyLinkVisuals) {
                graph3DVisuals.applyLinkVisuals(this.filteredData);
            }
        }

        // Update graph
        if (graph3DCore && graph3DCore.updateData) {
            graph3DCore.updateData(this.filteredData);
        }

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
        
        if (graph3DUI && graph3DUI.updateEntityTypeFilters) {
            graph3DUI.updateEntityTypeFilters(entityTypes, graph3DFilters.entityTypeFilters || new Set());
        }

        // Technologies
        const technologies = this.rawData.nodes
            .filter(n => n.nodeType === 'technology')
            .map(n => ({ name: n.name, count: n.companyCount }))
            .sort((a, b) => b.count - a.count);
            
        if (graph3DUI && graph3DUI.updateTechnologyFilters) {
            graph3DUI.updateTechnologyFilters(technologies, graph3DFilters.technologyFilters || new Set());
        }

        // Concepts
        const concepts = this.rawData.nodes
            .filter(n => n.nodeType === 'concept')
            .map(n => ({ name: n.name, count: n.companyCount }))
            .sort((a, b) => b.count - a.count);
            
        if (graph3DUI && graph3DUI.updateConceptFilters) {
            graph3DUI.updateConceptFilters(concepts, graph3DFilters.conceptFilters || new Set());
        }
    }

    /**
     * Update UI state
     */
    updateUIState() {
        if (!this.filteredData) return;
        
        // Update stats
        const stats = {
            companies: this.filteredData.nodes.filter(n => n.nodeType === 'company').length,
            urls: this.filteredData.nodes
                .filter(n => n.nodeType === 'company')
                .reduce((sum, n) => sum + (n.urlCount || 0), 0),
            nodes: this.filteredData.nodes.length,
            links: this.filteredData.links.length
        };
        
        if (graph3DUI && graph3DUI.updateStats) {
            graph3DUI.updateStats(stats);
        }

        // Update legend
        if (graph3DVisuals && graph3DVisuals.getLegendData && graph3DUI && graph3DUI.updateLegend) {
            const legendData = graph3DVisuals.getLegendData(this.filteredData);
            graph3DUI.updateLegend(legendData);
        }
    }

    /**
     * Update info panel
     */
    updateInfoPanel(node) {
        const nodeInfo = document.getElementById('node-info');
        if (!nodeInfo) return;

        if (node) {
            if (graph3DTooltip && graph3DTooltip.generateContent) {
                nodeInfo.innerHTML = graph3DTooltip.generateContent(node);
            } else {
                nodeInfo.innerHTML = `<strong>${node.name}</strong>`;
            }
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
            loading.style.display = 'block';
        }
    }

    /**
     * Global function handlers (for onclick attributes)
     */
    setupGlobalHandlers() {
        // Make functions available globally
        window.graph3D = this;
        
        // Mode switching
        window.setConfigMode = (mode) => {
            if (graph3DUI && graph3DUI.setConfigMode) {
                graph3DUI.setConfigMode(mode);
            }
        };
        
        // Filter actions
        window.selectAllTypes = () => {
            const checkboxes = document.querySelectorAll('#type-filters input[type="checkbox"]');
            const types = new Set();
            checkboxes.forEach(cb => {
                cb.checked = true;
                types.add(cb.value);
            });
            if (graph3DFilters && graph3DFilters.setEntityTypeFilters) {
                graph3DFilters.setEntityTypeFilters(types);
            }
            this.applyFiltersAndRender();
        };

        window.selectNoneTypes = () => {
            const checkboxes = document.querySelectorAll('#type-filters input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            if (graph3DFilters && graph3DFilters.setEntityTypeFilters) {
                graph3DFilters.setEntityTypeFilters(new Set());
            }
            this.applyFiltersAndRender();
        };
        
        window.selectAllTechnologies = () => {
            document.querySelectorAll('#tech-filters input[type="checkbox"]')
                .forEach(cb => {
                    cb.checked = true;
                    if (window.handleTechnologyChange) window.handleTechnologyChange(cb);
                });
        };
        
        window.selectNoneTechnologies = () => {
            document.querySelectorAll('#tech-filters input[type="checkbox"]')
                .forEach(cb => {
                    cb.checked = false;
                    if (window.handleTechnologyChange) window.handleTechnologyChange(cb);
                });
        };
        
        window.selectAllConcepts = () => {
            document.querySelectorAll('#concept-filters input[type="checkbox"]')
                .forEach(cb => {
                    cb.checked = true;
                    if (window.handleConceptChange) window.handleConceptChange(cb);
                });
        };
        
        window.selectNoneConcepts = () => {
            document.querySelectorAll('#concept-filters input[type="checkbox"]')
                .forEach(cb => {
                    cb.checked = false;
                    if (window.handleConceptChange) window.handleConceptChange(cb);
                });
        };

        window.centerView = () => {
            if (graph3DCore && graph3DCore.fitToView) {
                graph3DCore.fitToView();
            }
        };

        window.toggleControlsCollapse = () => {
            const controls = document.getElementById('controls');
            const btn = controls?.querySelector('.collapse-btn');
            if (controls) {
                controls.classList.toggle('collapsed');
                if (btn) btn.textContent = controls.classList.contains('collapsed') ? '←' : '→';
            }
        };

        // Context menu actions
        window.hideContextMenu = () => {
            if (graph3DContext && graph3DContext.hide) {
                graph3DContext.hide();
            }
        };
        
        window.focusOnContextNode = () => {
            if (graph3DContext && graph3DContext.getContextNode && graph3DFilters) {
                const node = graph3DContext.getContextNode();
                if (node) {
                    graph3DFilters.setSearchQuery(node.name);
                    graph3DFilters.setSearchDepth(1);
                    this.applyFiltersAndRender();
                    graph3DContext.hide();
                }
            }
        };
        
        window.centerOnContextNode = () => {
            if (graph3DContext && graph3DContext.getContextNode && graph3DCore) {
                const node = graph3DContext.getContextNode();
                if (node) {
                    graph3DCore.centerOnNode(node);
                    graph3DContext.hide();
                }
            }
        };
        
        window.showAllNodes = () => this.showAllNodes();
        
        window.fitToWindow = () => {
            if (graph3DCore && graph3DCore.fitToView) {
                graph3DCore.fitToView();
            }
            if (graph3DContext && graph3DContext.hide) {
                graph3DContext.hide();
            }
        };

        // Tag filtering
        window.filterByTag = (tag) => {
            if (graph3DFilters && graph3DFilters.setCustomTagFilter && graph3DUI && graph3DUI.showCustomTagFilter) {
                graph3DFilters.setCustomTagFilter(tag);
                graph3DUI.showCustomTagFilter(tag);
                this.applyFiltersAndRender();
            }
        };

        window.clearTagFilter = () => {
            if (graph3DFilters && graph3DFilters.setCustomTagFilter && graph3DUI && graph3DUI.clearCustomTagFilter) {
                graph3DFilters.setCustomTagFilter(null);
                graph3DUI.clearCustomTagFilter();
                this.applyFiltersAndRender();
            }
        };

        // Filter handlers
        window.handleEntityTypeChange = (checkbox) => {
            const types = new Set();
            document.querySelectorAll('#type-filters input[type="checkbox"]:checked')
                .forEach(cb => types.add(cb.value));
            if (graph3DFilters && graph3DFilters.setEntityTypeFilters) {
                graph3DFilters.setEntityTypeFilters(types);
            }
            this.applyFiltersAndRender();
        };

        window.handleTechnologyChange = (checkbox) => {
            const techs = new Set();
            document.querySelectorAll('#tech-filters input[type="checkbox"]:checked')
                .forEach(cb => techs.add(cb.value));
            if (graph3DFilters && graph3DFilters.setTechnologyFilters) {
                graph3DFilters.setTechnologyFilters(techs);
            }
            this.applyFiltersAndRender();
        };

        window.handleConceptChange = (checkbox) => {
            const concepts = new Set();
            document.querySelectorAll('#concept-filters input[type="checkbox"]:checked')
                .forEach(cb => concepts.add(cb.value));
            if (graph3DFilters && graph3DFilters.setConceptFilters) {
                graph3DFilters.setConceptFilters(concepts);
            }
            this.applyFiltersAndRender();
        };

        // Mobile callbacks
        window.graph3DCallbacks = {
            onPinchZoom: (factor) => this.zoom(1 - factor),
            onOrientationChange: (orientation) => {
                setTimeout(() => {
                    if (graph3DCore && graph3DCore.fitToView) {
                        graph3DCore.fitToView();
                    }
                }, 500);
            }
        };
    }

    /**
     * Helper methods
     */
    resetAll() {
        if (graph3DFilters && graph3DFilters.clearAllFilters) {
            graph3DFilters.clearAllFilters();
        }
        if (graph3DCore && graph3DCore.fitToView) {
            graph3DCore.fitToView();
        }
        this.applyFiltersAndRender();
    }

    showAllNodes() {
        if (graph3DFilters && graph3DFilters.clearAllFilters) {
            graph3DFilters.clearAllFilters();
        }
        this.applyFiltersAndRender();
    }

    clearFilters() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        if (graph3DFilters) {
            if (graph3DFilters.setSearchQuery) {
                graph3DFilters.setSearchQuery('');
            }
            if (graph3DFilters.setCustomTagFilter) {
                graph3DFilters.setCustomTagFilter(null);
            }
        }
        if (graph3DUI && graph3DUI.clearCustomTagFilter) {
            graph3DUI.clearCustomTagFilter();
        }
        this.applyFiltersAndRender();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (graph3DCore && graph3DCore.setPaused) {
            graph3DCore.setPaused(this.isPaused);
        }
    }

    zoom(factor) {
        const graph = graph3DCore.getGraphInstance();
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
        const graph = graph3DCore.getGraphInstance();
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
        await graph3D.init();
    });
} else {
    graph3D.init();
}
