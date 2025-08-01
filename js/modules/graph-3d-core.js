/**
 * @module graph-3d-core
 * @description Core 3D graph engine using three.js and force-graph library
 * @since 1.0.0
 */

/**
 * Core 3D Force Graph Module
 * Handles graph initialization, rendering, and basic interactions
 */

export class Graph3DCore {
    constructor() {
        this.graph = null;
        this.container = null;
        this.graphData = { nodes: [], links: [] };
        this.nodeColorMap = new Map();
        this.nodeSizeMap = new Map();
        this.linkColorMap = new Map();
        this.linkWidthMap = new Map();
    }

    /**
     * Initialize the 3D force graph
     * @param {HTMLElement} container - DOM element to render the graph
     * @param {Object} config - Configuration options
     */
    init(container, config = {}) {
        this.container = container;
        
        // Import ForceGraph3D from global scope (loaded via script tag)
        const ForceGraph3D = window.ForceGraph3D;
        
        this.graph = ForceGraph3D()(container)
            .backgroundColor('#0a0a0f')
            .nodeLabel(node => this.getNodeLabel(node))
            .nodeColor(node => this.nodeColorMap.get(node.id) || '#666')
            .nodeVal(node => this.nodeSizeMap.get(node.id) || 1)
            .nodeOpacity(0.9)
            .nodeResolution(16)
            .linkColor(link => this.linkColorMap.get(`${link.source.id}-${link.target.id}`) || 'rgba(150, 150, 150, 0.5)')
            .linkWidth(link => this.linkWidthMap.get(`${link.source.id}-${link.target.id}`) || 0.1)
            .linkOpacity(0.6)
            .linkDirectionalParticles(0)
            .linkDirectionalParticleSpeed(0.005)
            .linkDirectionalParticleWidth(2)
            .onNodeClick(this.handleNodeClick.bind(this))
            .onNodeRightClick(this.handleNodeRightClick.bind(this))
            .onNodeHover(this.handleNodeHover.bind(this));

        // Set initial camera position
        this.graph.cameraPosition({ x: 0, y: 0, z: 500 });

        // Enable pointer events
        this.graph.enablePointerInteraction(true);
        
        return this.graph;
    }

    /**
     * Update graph data
     * @param {Object} data - Graph data with nodes and links
     */
    updateData(data) {
        this.graphData = data;
        if (this.graph) {
            this.graph.graphData(data);
        }
    }

    /**
     * Get the graph instance
     * @returns {Object} The ForceGraph3D instance
     */
    getGraph() {
        return this.graph;
    }

    /**
     * Get current graph data
     * @returns {Object} Current graph data
     */
    getData() {
        return this.graphData;
    }

    /**
     * Update node colors
     * @param {Map} colorMap - Map of node ID to color
     */
    updateNodeColors(colorMap) {
        this.nodeColorMap = colorMap;
        if (this.graph) {
            this.graph.nodeColor(this.graph.nodeColor()); // Force update
        }
    }

    /**
     * Update node sizes
     * @param {Map} sizeMap - Map of node ID to size
     */
    updateNodeSizes(sizeMap) {
        this.nodeSizeMap = sizeMap;
        if (this.graph) {
            this.graph.nodeVal(this.graph.nodeVal()); // Force update
        }
    }

    /**
     * Update link colors
     * @param {Map} colorMap - Map of link ID to color
     */
    updateLinkColors(colorMap) {
        this.linkColorMap = colorMap;
        if (this.graph) {
            this.graph.linkColor(this.graph.linkColor()); // Force update
        }
    }

    /**
     * Update link widths
     * @param {Map} widthMap - Map of link ID to width
     */
    updateLinkWidths(widthMap) {
        this.linkWidthMap = widthMap;
        if (this.graph) {
            this.graph.linkWidth(this.graph.linkWidth()); // Force update
        }
    }

    /**
     * Center camera on a node
     * @param {Object} node - Node to center on
     * @param {number} distance - Distance from node
     */
    centerOnNode(node, distance = 300) {
        if (!this.graph || !node) return;
        
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        this.graph.cameraPosition(
            { 
                x: node.x * distRatio, 
                y: node.y * distRatio, 
                z: node.z * distRatio 
            },
            node,
            3000
        );
    }

    /**
     * Fit all nodes in view
     */
    fitToView() {
        if (!this.graph) return;
        
        const nodes = this.graphData.nodes;
        if (nodes.length === 0) return;

        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        nodes.forEach(node => {
            if (node.x !== undefined) {
                minX = Math.min(minX, node.x);
                maxX = Math.max(maxX, node.x);
                minY = Math.min(minY, node.y);
                maxY = Math.max(maxY, node.y);
                minZ = Math.min(minZ, node.z);
                maxZ = Math.max(maxZ, node.z);
            }
        });

        // Calculate center and distance
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        const maxDist = Math.max(
            maxX - minX,
            maxY - minY,
            maxZ - minZ
        );

        // Position camera to see all nodes
        const distance = maxDist * 1.5;
        this.graph.cameraPosition(
            { x: centerX, y: centerY, z: centerZ + distance },
            { x: centerX, y: centerY, z: centerZ },
            3000
        );
    }

    /**
     * Get node label for display
     * @param {Object} node - Node object
     * @returns {string} Label text
     */
    getNodeLabel(node) {
        return node.name || node.id || '';
    }

    /**
     * Handle node click
     * @param {Object} node - Clicked node
     * @param {Event} event - Click event
     */
    handleNodeClick(node, event) {
        // Will be overridden by event handlers
        }

    /**
     * Handle node right-click
     * @param {Object} node - Right-clicked node
     * @param {Event} event - Click event
     */
    handleNodeRightClick(node, event) {
        // Will be overridden by event handlers
        }

    /**
     * Handle node hover
     * @param {Object} node - Hovered node
     * @param {Object} prevNode - Previously hovered node
     */
    handleNodeHover(node, prevNode) {
        // Will be overridden by event handlers
        }

    /**
     * Set camera position
     * @param {Object} position - Camera position {x, y, z}
     * @param {Object} lookAt - Look at position {x, y, z}
     * @param {number} duration - Animation duration in ms
     */
    setCameraPosition(position, lookAt = {x: 0, y: 0, z: 0}, duration = 1000) {
        if (this.graph) {
            this.graph.cameraPosition(position, lookAt, duration);
        }
    }

    /**
     * Enable/disable node labels
     * @param {boolean} enabled - Whether to show labels
     * @param {number} fontSize - Font size for labels
     */
    setLabelsEnabled(enabled, fontSize = 8) {
        if (!this.graph) return;
        
        if (enabled) {
            this.graph
                .nodeLabel(node => this.getNodeLabel(node))
                .nodeThreeObject(node => {
                    const sprite = new window.SpriteText(node.name || node.id || '');
                    sprite.material.depthWrite = false;
                    sprite.color = node.color || '#ffffff';
                    sprite.textHeight = fontSize;
                    return sprite;
                });
        } else {
            this.graph
                .nodeLabel('')
                .nodeThreeObject(null);
        }
    }

    /**
     * Enable/disable link particles
     * @param {boolean} enabled - Whether to show particles
     * @param {number} count - Number of particles per link
     */
    setParticlesEnabled(enabled, count = 2) {
        if (this.graph) {
            this.graph.linkDirectionalParticles(enabled ? count : 0);
        }
    }

    /**
     * Pause/resume force simulation
     * @param {boolean} paused - Whether to pause
     */
    setPaused(paused) {
        if (this.graph) {
            if (paused) {
                this.graph.pauseAnimation();
            } else {
                this.graph.resumeAnimation();
            }
        }
    }

    /**
     * Reheat the simulation (restart forces)
     */
    reheatSimulation() {
        if (this.graph) {
            this.graph.d3ReheatSimulation();
        }
    }

    /**
     * Destroy the graph instance
     */
    destroy() {
        if (this.graph) {
            this.graph._destructor();
            this.graph = null;
        }
        this.graphData = { nodes: [], links: [] };
        this.nodeColorMap.clear();
        this.nodeSizeMap.clear();
        this.linkColorMap.clear();
        this.linkWidthMap.clear();
    }
}

// Create singleton instance
export const graph3DCore = new Graph3DCore();
