/**
 * 3D Graph Tooltip Module
 * Handles floating tooltip display and interaction
 */

export class Graph3DTooltip {
    constructor() {
        this.enabled = true;
        this.tooltip = null;
        this.currentNode = null;
        this.mousePosition = { x: 0, y: 0 };
    }

    /**
     * Initialize tooltip system
     */
    init() {
        this.createTooltip();
        this.attachEventListeners();
    }

    /**
     * Create tooltip element
     */
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'floating-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(20, 20, 30, 0.95);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 12px;
            font-size: 12px;
            color: #eee;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            max-width: 300px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 1000;
        `;
        document.body.appendChild(this.tooltip);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        document.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
            this.updatePosition();
        });
    }

    /**
     * Show tooltip for a node
     * @param {Object} node - Node to show tooltip for
     */
    show(node) {
        if (!this.enabled || !node) {
            this.hide();
            return;
        }

        this.currentNode = node;
        this.tooltip.innerHTML = this.generateContent(node);
        this.tooltip.style.opacity = '1';
        this.updatePosition();
    }

    /**
     * Hide tooltip
     */
    hide() {
        this.currentNode = null;
        this.tooltip.style.opacity = '0';
    }

    /**
     * Update tooltip position
     */
    updatePosition() {
        if (!this.currentNode || !this.enabled) return;

        const offset = 15;
        let x = this.mousePosition.x + offset;
        let y = this.mousePosition.y + offset;

        // Prevent tooltip from going off-screen
        const rect = this.tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (x + rect.width > viewportWidth) {
            x = this.mousePosition.x - rect.width - offset;
        }

        if (y + rect.height > viewportHeight) {
            y = this.mousePosition.y - rect.height - offset;
        }

        this.tooltip.style.left = `${x}px`;
        this.tooltip.style.top = `${y}px`;
    }

    /**
     * Generate tooltip content
     * @param {Object} node - Node data
     * @returns {string} HTML content
     */
    generateContent(node) {
        let content = `<strong style="color: #00ff88; font-size: 14px;">${node.name}</strong><br/>`;

        if (node.nodeType === 'company') {
            content += `
                <span style="color: #888;">Type:</span> ${node.companyType}<br/>
                <span style="color: #888;">Interest Level:</span> ${this.getInterestStars(node.interestLevel)}<br/>
                <span style="color: #888;">URLs:</span> ${node.urlCount || 0}<br/>
                <span style="color: #888;">Connections:</span> ${node.connectionCount || 0}<br/>
            `;

            // Add products if available
            if (node.products && node.products.length > 0) {
                content += `<br/><span style="color: #888;">Products:</span><br/>`;
                content += node.products.slice(0, 3).map(p => `• ${p}`).join('<br/>');
                if (node.products.length > 3) {
                    content += `<br/>• ... and ${node.products.length - 3} more`;
                }
            }

            // Add technologies with clickable tags
            if (node.technologies && node.technologies.length > 0) {
                content += `<br/><br/><span style="color: #888;">Technologies:</span><br/>`;
                content += '<div style="margin-top: 4px;">';
                content += node.technologies.slice(0, 5).map(tech => 
                    `<span class="tag tech-tag" onclick="window.filterByTag('${tech}')" style="cursor: pointer; background: rgba(0, 255, 136, 0.2); color: #00ff88; padding: 2px 6px; margin: 2px; border-radius: 3px; display: inline-block; font-size: 11px;">${tech}</span>`
                ).join(' ');
                if (node.technologies.length > 5) {
                    content += ` <span style="color: #666;">+${node.technologies.length - 5} more</span>`;
                }
                content += '</div>';
            }

            // Add AI concepts with clickable tags
            if (node.concepts && node.concepts.length > 0) {
                content += `<br/><span style="color: #888;">AI Concepts:</span><br/>`;
                content += '<div style="margin-top: 4px;">';
                content += node.concepts.slice(0, 5).map(concept => 
                    `<span class="tag concept-tag" onclick="window.filterByTag('${concept}')" style="cursor: pointer; background: rgba(0, 255, 255, 0.2); color: #00ffff; padding: 2px 6px; margin: 2px; border-radius: 3px; display: inline-block; font-size: 11px;">${concept}</span>`
                ).join(' ');
                if (node.concepts.length > 5) {
                    content += ` <span style="color: #666;">+${node.concepts.length - 5} more</span>`;
                }
                content += '</div>';
            }

            // Add recent changes if available
            if (node.recentChanges && node.recentChanges.length > 0) {
                const change = node.recentChanges[0];
                const timeAgo = this.getTimeAgo(new Date(change.detected_at));
                content += `<br/><br/><span style="color: #ff9800;">Recent Change:</span> ${timeAgo}<br/>`;
                content += `<span style="color: #888; font-size: 11px;">${change.change_type}: ${change.summary?.substring(0, 50)}...</span>`;
            }

        } else if (node.nodeType === 'technology') {
            content += `
                <span style="color: #00ff88;">Technology Node</span><br/>
                <span style="color: #888;">Used by:</span> ${node.companyCount || 0} companies
            `;
        } else if (node.nodeType === 'concept') {
            content += `
                <span style="color: #00ffff;">AI Concept Node</span><br/>
                <span style="color: #888;">Implemented by:</span> ${node.companyCount || 0} companies
            `;
        }

        return content;
    }

    /**
     * Get interest level as stars
     * @param {number} level - Interest level (1-10)
     * @returns {string} Star representation
     */
    getInterestStars(level) {
        const stars = '★'.repeat(level) + '☆'.repeat(10 - level);
        const color = level >= 7 ? '#ff0000' : level >= 4 ? '#ffaa00' : '#00ff00';
        return `<span style="color: ${color};">${stars}</span> (${level}/10)`;
    }

    /**
     * Get time ago string
     * @param {Date} date - Date to compare
     * @returns {string} Time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'just now';
    }

    /**
     * Enable/disable tooltip
     * @param {boolean} enabled - Whether to enable tooltip
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.hide();
        }
    }

    /**
     * Destroy tooltip
     */
    destroy() {
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
        this.tooltip = null;
        this.currentNode = null;
    }
}

// Create singleton instance
export const graph3DTooltip = new Graph3DTooltip();
