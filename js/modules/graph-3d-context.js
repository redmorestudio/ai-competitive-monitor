/**
 * 3D Graph Context Menu Module
 * Handles right-click context menu and keyboard shortcuts
 */

export class Graph3DContext {
    constructor() {
        this.contextMenu = null;
        this.contextNode = null;
        this.callbacks = {};
        this.keyboardEnabled = true;
    }

    /**
     * Initialize context menu system
     * @param {Object} callbacks - Callback functions
     */
    init(callbacks = {}) {
        this.callbacks = callbacks;
        this.createContextMenu();
        this.attachEventListeners();
    }

    /**
     * Create context menu element
     */
    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'context-menu';
        this.contextMenu.style.cssText = `
            position: absolute;
            background: rgba(20, 20, 30, 0.95);
            border: 1px solid #00ff88;
            border-radius: 8px;
            padding: 0;
            font-size: 14px;
            color: #eee;
            display: none;
            z-index: 1001;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            min-width: 200px;
        `;
        
        this.contextMenu.innerHTML = `
            <div class="context-menu-item" onclick="focusOnContextNode()">Show Only This & Connected</div>
            <div class="context-menu-item" onclick="showAllNodes()">Show All</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" onclick="centerOnContextNode()">Center Camera Here</div>
            <div class="context-menu-item" onclick="fitToWindow()">Fit to Window</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" onclick="hideContextMenu()">Cancel</div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .context-menu-item {
                padding: 10px 15px;
                cursor: pointer;
                transition: background 0.2s ease;
            }
            .context-menu-item:hover {
                background: rgba(0, 255, 136, 0.2);
                color: #00ff88;
            }
            .context-menu-item:first-child {
                border-radius: 8px 8px 0 0;
            }
            .context-menu-item:last-child {
                border-radius: 0 0 8px 8px;
            }
            .context-menu-divider {
                height: 1px;
                background: #333;
                margin: 0;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.contextMenu);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Hide context menu on click elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu')) {
                this.hide();
            }
        });

        // Prevent default right-click menu on canvas
        document.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.keyboardEnabled) return;
            this.handleKeyboardShortcut(e);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.hide();
        });
    }

    /**
     * Show context menu for a node
     * @param {Object} node - Node that was right-clicked
     * @param {Event} event - Mouse event
     */
    show(node, event) {
        this.contextNode = node;
        
        // Position menu at click location
        let x = event.clientX;
        let y = event.clientY;

        // Prevent menu from going off-screen
        const menuRect = {
            width: 200,
            height: 250
        };

        if (x + menuRect.width > window.innerWidth) {
            x = window.innerWidth - menuRect.width - 10;
        }

        if (y + menuRect.height > window.innerHeight) {
            y = window.innerHeight - menuRect.height - 10;
        }

        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        this.contextMenu.style.display = 'block';

        // Store node globally for menu actions
        window.contextMenuNode = node;
    }

    /**
     * Hide context menu
     */
    hide() {
        this.contextMenu.style.display = 'none';
        this.contextNode = null;
        window.contextMenuNode = null;
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardShortcut(event) {
        // Don't handle if user is typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key.toLowerCase()) {
            case 'r':
                // Reset view
                if (this.callbacks.onReset) {
                    this.callbacks.onReset();
                }
                break;
                
            case 'f':
                // Fit to window
                if (this.callbacks.onFitToWindow) {
                    this.callbacks.onFitToWindow();
                }
                break;
                
            case 'p':
                // Toggle particles
                if (this.callbacks.onToggleParticles) {
                    this.callbacks.onToggleParticles();
                }
                break;
                
            case 'l':
                // Toggle labels
                if (this.callbacks.onToggleLabels) {
                    this.callbacks.onToggleLabels();
                }
                break;
                
            case 'a':
                // Show all nodes
                if (this.callbacks.onShowAll) {
                    this.callbacks.onShowAll();
                }
                break;
                
            case ' ':
                // Pause/resume simulation
                event.preventDefault();
                if (this.callbacks.onTogglePause) {
                    this.callbacks.onTogglePause();
                }
                break;
                
            case 'arrowup':
                // Zoom in
                event.preventDefault();
                if (this.callbacks.onZoomIn) {
                    this.callbacks.onZoomIn();
                }
                break;
                
            case 'arrowdown':
                // Zoom out
                event.preventDefault();
                if (this.callbacks.onZoomOut) {
                    this.callbacks.onZoomOut();
                }
                break;
                
            case 'arrowleft':
                // Rotate left
                event.preventDefault();
                if (this.callbacks.onRotateLeft) {
                    this.callbacks.onRotateLeft();
                }
                break;
                
            case 'arrowright':
                // Rotate right
                event.preventDefault();
                if (this.callbacks.onRotateRight) {
                    this.callbacks.onRotateRight();
                }
                break;
                
            case 'escape':
                // Clear filters/selection
                if (this.callbacks.onEscape) {
                    this.callbacks.onEscape();
                }
                break;
                
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                // Quick view mode switches
                if (this.callbacks.onQuickViewMode) {
                    const modes = ['entity-type', 'interest-level', 'connections', 'recent-activity', 'high-interest'];
                    const index = parseInt(event.key) - 1;
                    if (modes[index]) {
                        this.callbacks.onQuickViewMode(modes[index]);
                    }
                }
                break;
        }
    }

    /**
     * Get current context node
     * @returns {Object|null} Current context node
     */
    getContextNode() {
        return this.contextNode;
    }

    /**
     * Enable/disable keyboard shortcuts
     * @param {boolean} enabled - Whether to enable shortcuts
     */
    setKeyboardEnabled(enabled) {
        this.keyboardEnabled = enabled;
    }

    /**
     * Update context menu items
     * @param {Array} items - Array of menu items
     */
    updateMenuItems(items) {
        if (!this.contextMenu) return;
        
        this.contextMenu.innerHTML = items.map(item => {
            if (item.divider) {
                return '<div class="context-menu-divider"></div>';
            }
            return `<div class="context-menu-item" onclick="${item.onclick}">${item.label}</div>`;
        }).join('');
    }

    /**
     * Add custom menu item
     * @param {Object} item - Menu item configuration
     */
    addMenuItem(item) {
        if (!this.contextMenu) return;
        
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.onclick = item.onclick;
        
        // Insert before last item (Cancel)
        const lastItem = this.contextMenu.lastElementChild;
        this.contextMenu.insertBefore(menuItem, lastItem);
    }

    /**
     * Show keyboard shortcuts help
     * @returns {string} Help text
     */
    getKeyboardHelp() {
        return `
            <strong>Keyboard Shortcuts:</strong><br/>
            <span style="color: #00ff88;">R</span> - Reset view<br/>
            <span style="color: #00ff88;">F</span> - Fit to window<br/>
            <span style="color: #00ff88;">P</span> - Toggle particles<br/>
            <span style="color: #00ff88;">L</span> - Toggle labels<br/>
            <span style="color: #00ff88;">A</span> - Show all nodes<br/>
            <span style="color: #00ff88;">Space</span> - Pause/resume<br/>
            <span style="color: #00ff88;">↑↓</span> - Zoom in/out<br/>
            <span style="color: #00ff88;">←→</span> - Rotate view<br/>
            <span style="color: #00ff88;">1-5</span> - Quick view modes<br/>
            <span style="color: #00ff88;">Esc</span> - Clear filters
        `;
    }

    /**
     * Destroy context menu
     */
    destroy() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
        }
        this.contextMenu = null;
        this.contextNode = null;
        this.callbacks = {};
    }
}

// Create singleton instance
export const graph3DContext = new Graph3DContext();
