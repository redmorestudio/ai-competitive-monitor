/**
 * @module graph-3d-visuals
 * @description Visual effects and rendering controls for 3D graph
 * @since 1.0.0
 */

/**
 * 3D Graph Visuals Module
 * Handles visual settings including colors, sizes, labels, and effects
 */

import { graph3DCore } from './graph-3d-core.js?v=20250802b';

export class Graph3DVisuals {
    constructor() {
        // Visual settings
        this.viewMode = 'entity-type';
        this.nodeSize = 'uniform';
        this.showNodes = true;
        this.showLinks = true;
        this.showLabels = true;
        this.showParticles = true;
        this.thinLines = false;
        this.monochrome = false;
        this.showChangeRings = false;
        this.autoRotate = false;
        this.labelFontSize = 12;
        
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
            'AI Consulting and Education': '#808080',  // Gray for consulting
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
        console.log('Applying view mode:', mode);
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
                case 'all':
                case 'technology':
                case 'concept':
                    // These modes don't change colors, just filter links
                    color = this.getEntityColor(node);
                    break;
                default:
                    color = this.getEntityColor(node);
            }

            if (this.monochrome) {
                color = '#00ffff';
            }

            colorMap.set(node.id, color);
        });

        console.log('Color map created with', colorMap.size, 'entries');
        graph3DCore.updateNodeColors(colorMap);
    }

    /**
     * Apply node sizing mode
     * @param {string} mode - Size mode name
     * @param {Object} data - Graph data
     */
    applyNodeSize(mode, data) {
        console.log('Applying node size mode:', mode);
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
        console.log('Applying link visuals, filter:', linkFilter);
        const colorMap = new Map();
        const widthMap = new Map();
        const linkWidthMultiplier = parseFloat(document.getElementById('link-width-multiplier')?.value || 12);
        const linkOpacity = parseFloat(document.getElementById('link-opacity')?.value || 0.5);

        data.links.forEach(link => {
            const linkId = `${link.source.id || link.source}-${link.target.id || link.target}`;
            let color = `rgba(150, 150, 150, ${linkOpacity})`;
            let width = 0.1;

            // Skip if links are hidden
            if (!this.showLinks) {
                width = 0;
            } else {
                // Apply link filter based on view mode
                let shouldShow = true;
                if (linkFilter === 'technology' || this.viewMode === 'technology') {
                    shouldShow = link.linkType !== 'concept';
                } else if (linkFilter === 'concept' || this.viewMode === 'concept') {
                    shouldShow = link.linkType === 'concept';
                }
                
                if (!shouldShow) {
                    width = 0;
                } else {
                    // Color based on link type
                    if (!this.monochrome) {
                        switch (link.linkType) {
                            case 'technology':
                                color = `rgba(0, 255, 136, ${linkOpacity})`;
                                break;
                            case 'concept':
                                color = `rgba(78, 205, 196, ${linkOpacity})`;
                                break;
                            case 'shared-technology':
                                color = `rgba(255, 215, 0, ${linkOpacity * 0.8})`; // Slightly more transparent
                                break;
                            default:
                                color = `rgba(150, 150, 150, ${linkOpacity})`;
                        }
                    } else {
                        color = `rgba(0, 255, 255, ${linkOpacity})`;
                    }

                    // Calculate link width based on connection strength
                    let strength = 0;
                    
                    // Concept links get full multiplier
                    if (link.linkType === 'concept') {
                        strength = linkWidthMultiplier;
                    }
                    // Technology links get scaled by connection count
                    else if (link.linkType === 'technology') {
                        const connectionCount = link.connectionCount || link.strength || 1;
                        strength = linkWidthMultiplier * Math.min(connectionCount / 10, 1);
                    }
                    // Shared technology links scale by number of shared techs
                    else if (link.linkType === 'shared-technology') {
                        const sharedCount = link.strength || 1;
                        strength = linkWidthMultiplier * Math.min(sharedCount / 5, 1);
                    }
                    
                    // Apply multiplier to base width
                    if (strength > 0) {
                        width = 0.1 + (strength * 0.1);
                    }
                    
                    // Apply thin lines setting after strength calculation
                    if (this.thinLines) {
                        // For thin lines, scale down but maintain relative differences
                        width = 0.05 + (width * 0.1); // Much thinner but still shows variation
                    } else {
                        // Cap at reasonable maximum for normal mode
                        width = Math.min(width, 5.0);
                    }
                }
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
        if (node.nodeType === 'company') {
            return this.entityColors[node.companyType] || '#ffffff'; // Default white for unknown types
        }
        return '#666666';
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
            case 'nodes':
                this.showNodes = value;
                graph3DCore.setNodeVisibility(value);
                break;
            case 'links':
                this.showLinks = value;
                // Force re-apply of link visuals
                if (graph3DCore && graph3DCore.getGraph()) {
                    const data = graph3DCore.getData();
                    if (data) {
                        this.applyLinkVisuals(data);
                    }
                }
                break;
            case 'labels':
                this.showLabels = value;
                graph3DCore.setNodeLabels(value, node => node.name);
                break;
            case 'particles':
                this.showParticles = value;
                graph3DCore.setLinkParticles(value);
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
     * Set label font size
     * @param {number} size - Font size
     */
    setLabelFontSize(size) {
        this.labelFontSize = size;
        if (this.showLabels) {
            graph3DCore.setNodeLabels(true, node => node.name);
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
