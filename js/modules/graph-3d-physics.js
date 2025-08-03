/**
 * @module graph-3d-physics
 * @description Physics simulation controls for 3D force-directed graph
 * @since 1.0.0
 */

/**
 * 3D Graph Physics Module
 * Handles force simulation parameters and physics controls
 */

import { graph3DCore } from './graph-3d-core.js?v=20250803h';

export class Graph3DPhysics {
    constructor() {
        this.forceStrength = -300;
        this.linkDistance = 30;
        this.centerGravity = 0.3;
        this.collisionRadius = 10;
        this.alphaDecay = 0.0228;
        this.velocityDecay = 0.4;
        this.cooldownTicks = undefined;
        this.cooldownTime = 15000;
    }

    /**
     * Initialize physics settings on the graph
     * @param {Object} graph - The ForceGraph3D instance
     */
    init(graph) {
        if (!graph) return;

        // Set initial physics parameters
        graph
            .d3Force('charge', window.d3.forceManyBody().strength(this.forceStrength))
            .d3Force('link', window.d3.forceLink().distance(this.linkDistance))
            .d3Force('center', window.d3.forceCenter().strength(this.centerGravity))
            .d3Force('collision', window.d3.forceCollide().radius(this.collisionRadius))
            .d3AlphaDecay(this.alphaDecay)
            .d3VelocityDecay(this.velocityDecay)
            .cooldownTicks(this.cooldownTicks)
            .cooldownTime(this.cooldownTime);
            
        // Add a custom z-axis spread force to ensure 3D distribution
        graph.d3Force('zspread', () => {
            const nodes = graph.graphData().nodes;
            nodes.forEach(node => {
                // Add a small random force in z direction to prevent planar collapse
                if (node.vz !== undefined) {
                    node.vz += (Math.random() - 0.5) * 0.5;
                }
            });
        });
    }

    /**
     * Update force strength (node repulsion)
     * @param {number} value - Force strength value (negative for repulsion)
     */
    setForceStrength(value) {
        this.forceStrength = value;
        const graph = graph3DCore.getGraph();
        if (graph && graph.d3Force('charge')) {
            graph.d3Force('charge').strength(value);
            graph.d3ReheatSimulation();
        }
    }

    /**
     * Update link distance
     * @param {number} value - Link distance value
     */
    setLinkDistance(value) {
        this.linkDistance = value;
        const graph = graph3DCore.getGraph();
        if (graph && graph.d3Force('link')) {
            graph.d3Force('link').distance(value);
            graph.d3ReheatSimulation();
        }
    }

    /**
     * Update center gravity strength
     * @param {number} value - Center gravity value (0-1)
     */
    setCenterGravity(value) {
        this.centerGravity = value;
        const graph = graph3DCore.getGraph();
        if (graph && graph.d3Force('center')) {
            graph.d3Force('center').strength(value);
            graph.d3ReheatSimulation();
        }
    }

    /**
     * Update collision radius
     * @param {number} value - Collision radius value
     */
    setCollisionRadius(value) {
        this.collisionRadius = value;
        const graph = graph3DCore.getGraph();
        if (graph && graph.d3Force('collision')) {
            graph.d3Force('collision').radius(value);
            graph.d3ReheatSimulation();
        }
    }

    /**
     * Update alpha decay (simulation cooling rate)
     * @param {number} value - Alpha decay value
     */
    setAlphaDecay(value) {
        this.alphaDecay = value;
        const graph = graph3DCore.getGraph();
        if (graph) {
            graph.d3AlphaDecay(value);
        }
    }

    /**
     * Update velocity decay (node movement damping)
     * @param {number} value - Velocity decay value
     */
    setVelocityDecay(value) {
        this.velocityDecay = value;
        const graph = graph3DCore.getGraph();
        if (graph) {
            graph.d3VelocityDecay(value);
        }
    }

    /**
     * Set performance mode
     * @param {string} mode - 'performance' or 'quality'
     */
    setPerformanceMode(mode) {
        const graph = graph3DCore.getGraph();
        if (!graph) return;

        if (mode === 'performance') {
            // Optimize for performance
            this.cooldownTicks = 100;
            this.cooldownTime = 5000;
            graph.cooldownTicks(100);
            graph.cooldownTime(5000);
        } else {
            // Optimize for quality
            this.cooldownTicks = undefined;
            this.cooldownTime = 15000;
            graph.cooldownTicks(undefined);
            graph.cooldownTime(15000);
        }
    }

    /**
     * Apply fixed layout positions
     * @param {string} layoutType - Type of layout to apply
     * @param {Object} data - Graph data
     */
    applyLayout(layoutType, data) {
        const graph = graph3DCore.getGraph();
        if (!graph || !data) return;

        switch (layoutType) {
            case 'group':
                this.applyGroupLayout(data);
                break;
            case 'changes-24h':
            case 'changes-48h':
            case 'changes-week':
                this.applyChangesLayout(data, layoutType);
                break;
            default:
                // Normal force-directed layout
                this.resetLayout(data);
        }
    }

    /**
     * Apply group by type layout
     * @param {Object} data - Graph data
     */
    applyGroupLayout(data) {
        const types = {};
        let typeIndex = 0;

        // Group nodes by type
        data.nodes.forEach(node => {
            const type = node.nodeType || 'unknown';
            if (!types[type]) {
                types[type] = {
                    nodes: [],
                    index: typeIndex++
                };
            }
            types[type].nodes.push(node);
        });

        // Position nodes in spherical groups
        const radius = 200;
        Object.values(types).forEach((group, groupIndex) => {
            const angleStep = (2 * Math.PI) / Object.keys(types).length;
            const groupAngle = groupIndex * angleStep;
            
            group.nodes.forEach((node, nodeIndex) => {
                const nodeAngle = (nodeIndex / group.nodes.length) * 2 * Math.PI;
                const r = radius + (nodeIndex % 3) * 50;
                
                node.fx = r * Math.cos(groupAngle) * Math.cos(nodeAngle);
                node.fy = r * Math.sin(nodeAngle);
                node.fz = r * Math.sin(groupAngle) * Math.cos(nodeAngle);
            });
        });

        // Reduce forces for fixed layout
        this.setForceStrength(-50);
        graph3DCore.reheatSimulation();
    }

    /**
     * Apply changes-based layout
     * @param {Object} data - Graph data
     * @param {string} period - Time period for changes
     */
    applyChangesLayout(data, period) {
        // Center recent changes, push others outward
        const now = Date.now();
        const periodMs = {
            'changes-24h': 24 * 60 * 60 * 1000,
            'changes-48h': 48 * 60 * 60 * 1000,
            'changes-week': 7 * 24 * 60 * 60 * 1000
        }[period] || 24 * 60 * 60 * 1000;

        data.nodes.forEach((node, index) => {
            if (node.lastChanged && (now - node.lastChanged) < periodMs) {
                // Recent changes near center
                const angle = (index / data.nodes.length) * 2 * Math.PI;
                const r = 50 + Math.random() * 50;
                node.fx = r * Math.cos(angle);
                node.fy = r * Math.sin(angle);
                node.fz = r * Math.sin(angle * 2);
            } else {
                // Older nodes pushed outward
                const angle = (index / data.nodes.length) * 2 * Math.PI;
                const r = 300 + Math.random() * 100;
                node.fx = r * Math.cos(angle);
                node.fy = r * Math.sin(angle);
                node.fz = r * Math.sin(angle * 2);
            }
        });

        // Reduce forces for fixed layout
        this.setForceStrength(-50);
        graph3DCore.reheatSimulation();
    }

    /**
     * Reset to normal force-directed layout
     * @param {Object} data - Graph data
     */
    resetLayout(data) {
        // Remove fixed positions and give random 3D positions
        data.nodes.forEach(node => {
            delete node.fx;
            delete node.fy;
            delete node.fz;
            
            // Give nodes random initial 3D positions if they don't have them
            // This ensures true 3D distribution
            if (!node.x || !node.y || !node.z) {
                node.x = (Math.random() - 0.5) * 600;
                node.y = (Math.random() - 0.5) * 600;
                node.z = (Math.random() - 0.5) * 600;
            }
        });

        // Restore normal forces
        this.setForceStrength(this.forceStrength);
        graph3DCore.reheatSimulation();
    }

    /**
     * Get current physics settings
     * @returns {Object} Current physics parameters
     */
    getSettings() {
        return {
            forceStrength: this.forceStrength,
            linkDistance: this.linkDistance,
            centerGravity: this.centerGravity,
            collisionRadius: this.collisionRadius,
            alphaDecay: this.alphaDecay,
            velocityDecay: this.velocityDecay,
            cooldownTicks: this.cooldownTicks,
            cooldownTime: this.cooldownTime
        };
    }

    /**
     * Apply settings object
     * @param {Object} settings - Physics settings to apply
     */
    applySettings(settings) {
        if (settings.forceStrength !== undefined) this.setForceStrength(settings.forceStrength);
        if (settings.linkDistance !== undefined) this.setLinkDistance(settings.linkDistance);
        if (settings.centerGravity !== undefined) this.setCenterGravity(settings.centerGravity);
        if (settings.collisionRadius !== undefined) this.setCollisionRadius(settings.collisionRadius);
        if (settings.alphaDecay !== undefined) this.setAlphaDecay(settings.alphaDecay);
        if (settings.velocityDecay !== undefined) this.setVelocityDecay(settings.velocityDecay);
    }
}

// Create singleton instance
export const graph3DPhysics = new Graph3DPhysics();
