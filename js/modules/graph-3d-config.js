/**
 * Graph 3D Configuration and Styling
 * Centralized configuration for all visual elements and default parameters
 */

window.graph3d = window.graph3d || {};

window.graph3d.config = {
    // Version Information
    version: 'Rev 1.0.3',  // Increment this with each change
    lastUpdated: '2025-08-04',
    
    // Core Colors
    colors: {
        // Background colors
        background: {
            main: '#000000',           // Pure black background for the graph
            body: '#000000',           // Pure black for the HTML body
            panels: 'rgba(20, 20, 30, 0.95)',  // Control panels
            tooltip: 'rgba(20, 20, 30, 0.95)', // Tooltips
            contextMenu: 'rgba(20, 20, 30, 0.95)' // Context menus
        },
        
        // Primary accent colors
        accent: {
            primary: '#00ff88',        // Bright green primary accent
            secondary: '#00ffff',      // Cyan secondary accent
            hover: 'rgba(0, 255, 136, 0.2)', // Hover states
            active: 'rgba(0, 255, 136, 0.3)'  // Active states
        },
        
        // Text colors
        text: {
            primary: '#eee',           // Main text
            secondary: '#aaa',         // Secondary text
            muted: '#888',            // Muted/disabled text
            highlight: '#00ff88'       // Highlighted text
        },
        
        // Node colors by type
        nodes: {
            'AI Coding': '#ffeb3b',
            'AI Hardware': '#4caf50',
            'AI Infrastructure': '#9c27b0',
            'AI Search': '#f44336',
            'AI Voice/Audio': '#ff9800',
            'Enterprise AI': '#d32f2f',
            'Image Generation': '#e91e63',
            'LLM Providers': '#ff5722',
            'Video AI': '#3f51b5',
            'AI Company': '#00ff88',
            'AI Tool': '#ff6f00',
            'AI Model Provider': '#ff00ff',
            'AI Concept': '#00ffff',
            'AI Assistant': '#ffff00',
            'AI Platform': '#ff69b4',
            'Technology': '#00ff88',
            'Company': '#6fbf6f',
            'default': '#888888'
        },
        
        // Link colors
        links: {
            default: 'rgba(150, 150, 150, 0.5)',
            technology: '#00ff88',     // Technology links
            concept: '#4ecdc4',        // Concept links
            monochrome: '#666666',     // When in monochrome mode
            particles: '#00ff88'       // Link particles
        },
        
        // Interest level gradient (1-10)
        interestGradient: {
            10: '#ff0000',
            9: '#ff3300',
            8: '#ff6600',
            7: '#ff9900',
            6: '#ffcc00',
            5: '#ffff00',
            4: '#ccff00',
            3: '#99ff00',
            2: '#66ff00',
            1: '#33ff00',
            0: '#00ff00'
        },
        
        // Activity colors
        activity: {
            high: '#ff0000',
            medium: '#ffff00',
            low: '#00ff00'
        },
        
        // UI element colors
        ui: {
            border: '#333',
            borderActive: '#00ff88',
            scrollbar: '#666',
            scrollbarThumb: '#999',
            inputBg: 'rgba(0, 0, 0, 0.5)',
            selectBg: 'rgba(0, 0, 0, 0.5)',
            checkboxBg: 'rgba(0, 0, 0, 0.3)'
        }
    },
    
    // Graph Physics Defaults
    physics: {
        forceStrength: -300,
        linkDistance: 30,
        linkOpacity: 0.5,
        centerGravity: 0.3,
        collisionRadius: 10,
        particleSpeed: 0.001,
        dimensions: 3  // Always 3D
    },
    
    // Visual Settings Defaults
    visual: {
        showLinks: true,
        showLabels: true,
        showParticles: true,
        floatingTooltip: true,
        monochrome: false,
        showChangeRings: false,
        autoRotate: false,
        labelFontSize: 8,
        linkWidthMultiplier: 12,
        fontWeight: 200,
        fontWeightBold: 700
    },
    
    // Node Size Defaults
    nodeSize: {
        mode: 'activity', // 'uniform', 'activity', 'connections', 'interest'
        minSize: 1,
        maxSize: 10,
        defaultSize: 2
    },
    
    // Filter Defaults
    filters: {
        entityLimit: 200,
        linkThreshold: 0,
        searchDepth: 1,
        showTechNodes: true,
        showConceptNodes: true,
        showCompanyNodes: true
    },
    
    // UI Configuration
    ui: {
        mobileBreakpoint: 768,
        panelWidth: 280,
        maxPanelHeight: '90vh',
        mobileMaxHeight: '60vh',
        animationDuration: 300,
        tooltipDelay: 300
    },
    
    // Performance Settings
    performance: {
        maxNodes: 500,
        updateInterval: 100,
        reheatInterval: 500,
        verificationDelay: 3000
    },
    
    // Apply theme function
    applyTheme: function() {
        // Apply to body
        if (document.body) {
            document.body.style.background = this.colors.background.body;
        }
        
        // Apply to existing graph
        if (window.Graph) {
            window.Graph.backgroundColor(this.colors.background.main);
        }
        
        // Update CSS variables if we want to use them
        const root = document.documentElement;
        root.style.setProperty('--bg-main', this.colors.background.main);
        root.style.setProperty('--bg-body', this.colors.background.body);
        root.style.setProperty('--bg-panels', this.colors.background.panels);
        root.style.setProperty('--accent-primary', this.colors.accent.primary);
        root.style.setProperty('--accent-secondary', this.colors.accent.secondary);
        root.style.setProperty('--text-primary', this.colors.text.primary);
        root.style.setProperty('--text-secondary', this.colors.text.secondary);
        
        console.log('Theme applied with background:', this.colors.background.main);
    },
    
    // Get color for node by type
    getNodeColor: function(nodeType) {
        return this.colors.nodes[nodeType] || this.colors.nodes.default;
    },
    
    // Get interest color
    getInterestColor: function(level) {
        return this.colors.interestGradient[Math.round(level)] || this.colors.interestGradient[5];
    },
    
    // Get activity color
    getActivityColor: function(level) {
        if (level > 7) return this.colors.activity.high;
        if (level > 3) return this.colors.activity.medium;
        return this.colors.activity.low;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.graph3d.config;
}
