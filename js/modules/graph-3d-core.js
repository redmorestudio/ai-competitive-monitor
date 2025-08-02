/**
 * @module graph-3d-core
 * @description Core 3D graph rendering engine using 3d-force-graph
 * @since 1.0.0
 */

import ForceGraph3D from 'https://unpkg.com/3d-force-graph@1.73/dist/3d-force-graph.esm.js';

export class Graph3DCore {
    constructor() {
        this.container = null;
        this.graph = null;
        this.graphData = { nodes: [], links: [] };
        this.nodeColorMap = new Map();
        this.nodeSizeMap = new Map();
        this.linkColorMap = new Map();
        this.linkWidthMap = new Map();
    }

    /**
     * Initialize the 3D graph
     * @param {HTMLElement} container - Container element
     * @param {Object} config - Configuration options
     */
    initialize(container, config = {}) {
        console.log('Initializing 3D graph...');
        this.container = container;

        // Create graph instance
        this.graph = ForceGraph3D()(container)
            .backgroundColor('#000033')
            .nodeAutoColorBy('entityType')
            .nodeThreeObject(node => this.createNodeObject(node))
            .nodeThreeObjectExtend(true)
            .linkWidth(link => this.linkWidthMap.get(`${link.source.id || link.source}-${link.target.id || link.target}`) || 1)
            .linkColor(link => this.linkColorMap.get(`${link.source.id || link.source}-${link.target.id || link.target}`) || '#ffffff')
            .linkOpacity(0.6)
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(2)
            .onNodeClick(config.onNodeClick || (() => {}))
            .onNodeHover(config.onNodeHover || (() => {}))
            .onLinkClick(config.onLinkClick || (() => {}))
            .onLinkHover(config.onLinkHover || (() => {}));

        // Set up camera
        if (config.cameraDistance) {
            this.graph.cameraPosition({ z: config.cameraDistance });
        }

        // Configure forces
        this.graph
            .d3Force('link', d => d.distance(100))
            .d3Force('charge', d => d.strength(-120))
            .d3Force('center', d => d.strength(0.05));

        console.log('3D graph initialized');
    }

    /**
     * Create custom node object
     * @param {Object} node - Node data
     * @returns {THREE.Object3D} Three.js object
     */
    createNodeObject(node) {
        const color = this.nodeColorMap.get(node.id) || node.color || '#666666';
        const size = this.nodeSizeMap.get(node.id) || node.size || 4;

        // Create sphere
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.3,
            shininess: 100
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        
        // Add glow effect for high interest nodes
        if (node.interestLevel >= 7) {
            const glowGeometry = new THREE.SphereGeometry(size * 1.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            sphere.add(glow);
        }

        return sphere;
    }

    /**
     * Update graph data
     * @param {Object} data - Graph data with nodes and links
     */
    updateData(data) {
        console.log('Updating graph data:', data.nodes.length, 'nodes,', data.links.length, 'links');
        this.graphData = data;
        if (this.graph) {
            this.graph.graphData(data);
        }
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
        console.log('Updating node colors for', colorMap.size, 'nodes');
        this.nodeColorMap = colorMap;
        
        if (!this.graph) {
            console.warn('Graph not initialized');
            return;
        }
        
        // Update the nodeThreeObject to use new colors
        this.graph.nodeThreeObject(node => this.createNodeObject(node));
        
        // Force update by triggering a data refresh
        const currentData = this.graph.graphData();
        this.graph.graphData({
            nodes: [...currentData.nodes],
            links: [...currentData.links]
        });
    }

    /**
     * Update node sizes
     * @param {Map} sizeMap - Map of node ID to size
     */
    updateNodeSizes(sizeMap) {
        console.log('Updating node sizes for', sizeMap.size, 'nodes');
        this.nodeSizeMap = sizeMap;
        
        if (!this.graph) {
            console.warn('Graph not initialized');
            return;
        }
        
        // Update the nodeThreeObject to use new sizes
        this.graph.nodeThreeObject(node => this.createNodeObject(node));
        
        // Force update by triggering a data refresh
        const currentData = this.graph.graphData();
        this.graph.graphData({
            nodes: [...currentData.nodes],
            links: [...currentData.links]
        });
    }

    /**
     * Update link colors
     * @param {Map} colorMap - Map of link key to color
     */
    updateLinkColors(colorMap) {
        this.linkColorMap = colorMap;
        if (this.graph) {
            this.graph.linkColor(link => 
                this.linkColorMap.get(`${link.source.id || link.source}-${link.target.id || link.target}`) || '#ffffff'
            );
        }
    }

    /**
     * Update link widths
     * @param {Map} widthMap - Map of link key to width
     */
    updateLinkWidths(widthMap) {
        this.linkWidthMap = widthMap;
        if (this.graph) {
            this.graph.linkWidth(link => 
                this.linkWidthMap.get(`${link.source.id || link.source}-${link.target.id || link.target}`) || 1
            );
        }
    }

    /**
     * Update camera position
     * @param {Object} position - Camera position {x, y, z}
     * @param {Object} lookAt - Look at position {x, y, z}
     * @param {number} duration - Animation duration in ms
     */
    updateCamera(position, lookAt, duration = 1000) {
        if (this.graph) {
            this.graph.cameraPosition(position, lookAt, duration);
        }
    }

    /**
     * Zoom to fit all nodes
     * @param {number} duration - Animation duration in ms
     * @param {number} padding - Padding around nodes
     */
    zoomToFit(duration = 1000, padding = 20) {
        if (this.graph) {
            this.graph.zoomToFit(duration, padding);
        }
    }

    /**
     * Focus on a specific node
     * @param {string} nodeId - Node ID to focus on
     * @param {number} distance - Distance from node
     */
    focusOnNode(nodeId, distance = 100) {
        const node = this.graphData.nodes.find(n => n.id === nodeId);
        if (node && this.graph) {
            const distRatio = 1 + distance / Math.hypot(node.x || 0, node.y || 0, node.z || 0);
            this.graph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                1000
            );
        }
    }

    /**
     * Enable/disable node dragging
     * @param {boolean} enabled - Whether to enable dragging
     */
    setNodeDragging(enabled) {
        if (this.graph) {
            this.graph.enableNodeDrag(enabled);
        }
    }

    /**
     * Enable/disable navigation controls
     * @param {boolean} enabled - Whether to enable controls
     */
    setNavigationControls(enabled) {
        if (this.graph) {
            this.graph.enableNavigationControls(enabled);
        }
    }

    /**
     * Set link particles visibility
     * @param {boolean} visible - Whether to show particles
     */
    setLinkParticles(visible) {
        if (this.graph) {
            this.graph.linkDirectionalParticles(visible ? 2 : 0);
        }
    }

    /**
     * Set node labels
     * @param {boolean} visible - Whether to show labels
     * @param {function} accessor - Label accessor function
     */
    setNodeLabels(visible, accessor = null) {
        if (this.graph) {
            if (visible && accessor) {
                this.graph
                    .nodeLabel(accessor)
                    .nodeAutoColorBy(null);
            } else {
                this.graph.nodeLabel('');
            }
        }
    }

    /**
     * Set background color
     * @param {string} color - Background color
     */
    setBackgroundColor(color) {
        if (this.graph) {
            this.graph.backgroundColor(color);
        }
    }

    /**
     * Get graph instance
     * @returns {Object} Force graph instance
     */
    getGraphInstance() {
        return this.graph;
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
     * Force a complete refresh of the graph
     */
    refresh() {
        if (this.graph) {
            this.graph.refresh();
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
