/**
 * 3D Graph Visuals Module
 * Handles visual settings including colors, sizes, labels, and effects
 */

import { graph3DCore } from './graph-3d-core.js';

export class Graph3DVisuals {
    constructor() {
        // Visual settings
        this.viewMode = 'entity-type';
        this.nodeSize = 'uniform';
        this.showLinks = true;
        this.showLabels = true;
        this.showParticles = true;
        this.thinLines = false;
        this.monochrome = false;
        this.showChangeRings = false;
        this.autoRotate = false;
        
        // Color schemes
        this.entityColors = {
            'AI Coding': '#ffeb3b',
            'AI Hardware': '#4caf50',
            'AI Infrastructure': '#9c27b0',
            'AI Search': '#f44336',
            'AI Voice/Audio': '#ff9800',
            'Enterprise AI': '#d32f2f',
            'Image Generation': '#e91e63',
            'LLM Providers': '#ff5722',
            'Video AI': '#3f51b5',
            'technology': '#00ff88',
            'concept': '#00ffff'
        };

        // Size multipliers
        this.sizeMultipliers = {
            uniform: 1,
            urlCount: 0.5,
            connections: 0.3,
            interestLevel: 2
        };
    }

    /**
     * Apply view mode (coloring scheme)
     * @param {string} mode - View mode name
     * @param {Object} data - Graph data
     */
    applyViewMode(mode, data) {
        this.viewMode = mode;
        const colorMap = new Map();

        data.nodes.forEach(node => {
            let color = '#666666';
            
            switch (mode) {
                case 'entity-type':
                    color = this.getEntityColor(node);
                    break;
                case 'interest-level':
                    color = this.getInterestLevelColor(node);
                    break;
                case 'connections':
                    color = this.getConnectionsColor(node, data);
                    break;
                case 'recent-activity':
                    color = this.getActivityColor(node);
                    break;
                case 'high-interest':
                    color = node.interestLevel >= 7 ? '#ff0000' : '#333333';
                    break;
                default:
                    color = this.getEntityColor(node);
            }

            if (this.monochrome) {
                color = '#00ffff';
            }

            colorMap.set(node.id, color);
        });

        graph3DCore.updateNodeColors(colorMap);
    }

    /**
     * Apply node sizing mode
     * @param {string} mode - Size mode name
     * @param {Object} data - Graph data
     */
    applyNodeSize(mode, data) {
        this.nodeSize = mode;
        const sizeMap = new Map();

        data.nodes.forEach(node => {
            let size = 4;
            
            switch (mode) {
                case 'uniform':
                    size = 4;
                    break;
                case 'url-count':
                    size = Math.max(2, Math.min(20, (node.urlCount || 1) * this.sizeMultipliers.urlCount));
                    break;
                case 'connections':
                    const connectionCount = this.getConnectionCount(node, data);
                    size = Math.max(2, Math.min(30, connectionCount * this.sizeMultipliers.connections));
                    break;
                case 'interest-level':
                    size = Math.max(2, (node.interestLevel || 1) * this.sizeMultipliers.interestLevel);
                    break;
            }

            sizeMap.set(node.id, size);
        });

        graph3DCore.updateNodeSizes(sizeMap);
    }

    /**
     * Apply link visual settings
     * @param {Object} data - Graph data
     * @param {string} linkFilter - Link filter mode
     */
    applyLinkVisuals(data, linkFilter = 'all') {
        const colorMap = new Map();
        const widthMap = new Map();

        data.links.forEach(link => {
            const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
            let color = 'rgba(150, 150, 150, 0.5)';
            let width = 0.1;

            // Skip if links are hidden
            if (!this.showLinks) {
                width = 0;
            } else {
                // Apply link filter
                if (linkFilter === 'technology' && link.linkType !== 'technology') return;
                if (linkFilter === 'concept' && link.linkType !== 'concept') return;

                // Color based on link type
                if (!this.monochrome) {
                    switch (link.linkType) {
                        case 'technology':
                            color = 'rgba(0, 255, 136, 0.6)';
                            break;
                        case 'concept':
                            color = 'rgba(78, 205, 196, 0.6)';
                            break;
                        default:
                            color = 'rgba(150, 150, 150, 0.5)';
                    }
                } else {
                    color = 'rgba(0, 255, 255, 0.6)';
                }

                // Width based on strength
                width = this.thinLines ? 0.05 : (0.1 + (link.strength || 0) * 0.5);
            }

            colorMap.set(linkId, color);
            widthMap.set(linkId, width);
        });

        graph3DCore.updateLinkColors(colorMap);
        graph3DCore.updateLinkWidths(widthMap);
    }

    /**
     * Get entity color based on type
     * @param {Object} node - Node object
     * @returns {string} Color hex value
     */
    getEntityColor(node) {
        if (node.nodeType === 'technology') return this.entityColors.technology;
        if (node.nodeType === 'concept') return this.entityColors.concept;
        return this.entityColors[node.companyType] || '#666666';
    }

    /**
     * Get interest level gradient color
     * @param {Object} node - Node object
     * @returns {string} Color hex value
     */
    getInterestLevelColor(node) {
        const level = node.interestLevel || 0;
        const ratio = level / 10;
        
        // Gradient from green (low) to red (high)
        const r = Math.floor(255 * ratio);
        const g = Math.floor(255 * (1 - ratio));
        return `rgb(${r}, ${g}, 0)`;
    }

    /**
     * Get connections-based color
     * @param {Object} node - Node object
     * @param {Object} data - Graph data
     * @returns {string} Color hex value
     */
    getConnectionsColor(node, data) {
        const count = this.getConnectionCount(node, data);
        const maxConnections = 50;
        const ratio = Math.min(count / maxConnections, 1);
        
        // Gradient from blue (few) to red (many)
        const r = Math.floor(255 * ratio);
        const b = Math.floor(255 * (1 - ratio));
        return `rgb(${r}, 0, ${b})`;
    }

    /**
     * Get activity-based color
     * @param {Object} node - Node object
     * @returns {string} Color hex value
     */
    getActivityColor(node) {
        if (!node.lastChanged) return '#333333';
        
        const now = Date.now();
        const hoursSince = (now - node.lastChanged) / (1000 * 60 * 60);
        
        if (hoursSince < 24) return '#ff0000';
        if (hoursSince < 48) return '#ff8800';
        if (hoursSince < 168) return '#ffff00';
        return '#333333';
    }

    /**
     * Get connection count for a node
     * @param {Object} node - Node object
     * @param {Object} data - Graph data
     * @returns {number} Connection count
     */
    getConnectionCount(node, data) {
        return data.links.filter(link => 
            link.source === node.id || link.target === node.id ||
            link.source.id === node.id || link.target.id === node.id
        ).length;
    }

    /**
     * Toggle visual setting
     * @param {string} setting - Setting name
     * @param {boolean} value - New value
     */
    toggleSetting(setting, value) {
        switch (setting) {
            case 'links':
                this.showLinks = value;
                break;
            case 'labels':
                this.showLabels = value;
                graph3DCore.setLabelsEnabled(value);
                break;
            case 'particles':
                this.showParticles = value;
                graph3DCore.setParticlesEnabled(value, 2);
                break;
            case 'thinLines':
                this.thinLines = value;
                break;
            case 'monochrome':
                this.monochrome = value;
                break;
            case 'changeRings':
                this.showChangeRings = value;
                break;
            case 'autoRotate':
                this.autoRotate = value;
                this.setAutoRotate(value);
                break;
        }
    }

    /**
     * Set auto-rotate
     * @param {boolean} enabled - Whether to auto-rotate
     */
    setAutoRotate(enabled) {
        const graph = graph3DCore.getGraph();
        if (!graph) return;

        if (enabled) {
            // Start auto-rotation
            const rotateCamera = () => {
                if (!this.autoRotate) return;
                
                const camera = graph.camera();
                const angle = Date.now() * 0.0001;
                const distance = 500;
                
                graph.cameraPosition({
                    x: distance * Math.sin(angle),
                    y: 0,
                    z: distance * Math.cos(angle)
                });
                
                requestAnimationFrame(rotateCamera);
            };
            rotateCamera();
        }
    }

    /**
     * Get legend data
     * @param {Object} data - Graph data
     * @returns {Array} Legend items
     */
    getLegendData(data) {
        const typeCounts = {};
        
        data.nodes.forEach(node => {
            const type = node.nodeType === 'company' ? node.companyType : node.nodeType;
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        return Object.entries(typeCounts).map(([type, count]) => ({
            type,
            count,
            color: this.monochrome ? '#00ffff' : (this.entityColors[type] || '#666666')
        }));
    }

    /**
     * Get current visual settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return {
            viewMode: this.viewMode,
            nodeSize: this.nodeSize,
            showLinks: this.showLinks,
            showLabels: this.showLabels,
            showParticles: this.showParticles,
            thinLines: this.thinLines,
            monochrome: this.monochrome,
            showChangeRings: this.showChangeRings,
            autoRotate: this.autoRotate
        };
    }

    /**
     * Apply settings object
     * @param {Object} settings - Visual settings to apply
     */
    applySettings(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        });
    }
}

// Create singleton instance
export const graph3DVisuals = new Graph3DVisuals();
