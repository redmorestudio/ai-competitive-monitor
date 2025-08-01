/**
 * 3D Graph Mobile UI Module
 * Handles mobile-specific UI adaptations and touch interactions
 */

export class Graph3DMobile {
    constructor() {
        this.isMobile = false;
        this.controlsVisible = false;
        this.toggleButton = null;
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
    }

    /**
     * Initialize mobile UI
     */
    init() {
        this.checkMobile();
        this.createToggleButton();
        this.attachEventListeners();
        this.applyMobileStyles();
    }

    /**
     * Check if device is mobile
     */
    checkMobile() {
        this.isMobile = window.innerWidth <= 768 || 
                       ('ontouchstart' in window) || 
                       (navigator.maxTouchPoints > 0);
    }

    /**
     * Create mobile toggle button
     */
    createToggleButton() {
        this.toggleButton = document.createElement('div');
        this.toggleButton.id = 'toggle-controls';
        this.toggleButton.innerHTML = '⚙️ Config';
        this.toggleButton.style.display = this.isMobile ? 'block' : 'none';
        
        this.toggleButton.addEventListener('click', () => {
            this.toggleControls();
        });
        
        document.body.appendChild(this.toggleButton);
    }

    /**
     * Apply mobile-specific styles
     */
    applyMobileStyles() {
        if (!this.isMobile) return;

        const style = document.createElement('style');
        style.id = 'mobile-styles';
        style.textContent = `
            @media (max-width: 768px) {
                #controls {
                    position: fixed !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                    border-radius: 20px 20px 0 0 !important;
                    max-height: 60vh !important;
                    width: auto !important;
                    margin: 0 !important;
                    overflow-y: auto !important;
                    padding-bottom: 20px !important;
                }
                
                #controls.visible {
                    transform: translateY(0);
                }
                
                #info {
                    top: 10px !important;
                    left: 10px !important;
                    right: auto !important;
                    max-width: calc(100vw - 100px) !important;
                    font-size: 12px !important;
                }
                
                .control-group {
                    margin-bottom: 15px !important;
                }
                
                .control-group label {
                    font-size: 14px !important;
                    margin-bottom: 8px !important;
                    display: block !important;
                }
                
                input[type="range"] {
                    width: 100% !important;
                    margin: 10px 0 !important;
                }
                
                select, input[type="text"] {
                    width: 100% !important;
                    padding: 8px !important;
                    font-size: 14px !important;
                    margin: 5px 0 !important;
                }
                
                button {
                    padding: 10px 15px !important;
                    font-size: 14px !important;
                    margin: 5px !important;
                }
                
                .checkbox-group {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 10px !important;
                }
                
                .checkbox-group label {
                    display: flex !important;
                    align-items: center !important;
                    font-size: 14px !important;
                }
                
                .checkbox-group input[type="checkbox"] {
                    width: 20px !important;
                    height: 20px !important;
                    margin-right: 10px !important;
                }
                
                #floating-tooltip {
                    font-size: 11px !important;
                    max-width: 250px !important;
                }
                
                #context-menu {
                    font-size: 14px !important;
                    min-width: 180px !important;
                }
                
                .collapse-btn {
                    display: none !important;
                }
                
                /* Hide advanced groups on mobile by default */
                .advanced-group {
                    display: none !important;
                }
                
                /* Swipe indicator */
                #controls::before {
                    content: '';
                    position: absolute;
                    top: 10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 40px;
                    height: 4px;
                    background: #666;
                    border-radius: 2px;
                }
                
                /* Mobile-optimized scrollbar */
                #controls::-webkit-scrollbar {
                    width: 6px;
                }
                
                #controls::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                #controls::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 3px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.checkMobile();
            
            if (wasMobile !== this.isMobile) {
                this.handleOrientationChange();
            }
        });

        // Orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });

        // Touch events for swipe gestures
        const controls = document.getElementById('controls');
        if (controls) {
            this.addSwipeGestures(controls);
        }

        // Prevent zoom on double tap
        document.addEventListener('touchstart', (e) => {
            const now = Date.now();
            if (now - this.touchStartTime < 300) {
                e.preventDefault();
            }
            this.touchStartTime = now;
        }, { passive: false });

        // Handle touch events for graph interaction
        this.setupTouchInteraction();
    }

    /**
     * Toggle controls visibility
     */
    toggleControls() {
        const controls = document.getElementById('controls');
        if (!controls) return;

        this.controlsVisible = !this.controlsVisible;
        
        if (this.controlsVisible) {
            controls.classList.add('visible');
            this.toggleButton.innerHTML = '✕ Close';
            document.body.style.overflow = 'hidden'; // Prevent body scroll
        } else {
            controls.classList.remove('visible');
            this.toggleButton.innerHTML = '⚙️ Config';
            document.body.style.overflow = '';
        }
    }

    /**
     * Add swipe gestures to element
     * @param {HTMLElement} element - Element to add gestures to
     */
    addSwipeGestures(element) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        element.addEventListener('touchstart', (e) => {
            if (e.target.closest('input, select, button')) return;
            
            startY = e.touches[0].clientY;
            currentY = startY;
            isDragging = true;
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // Only allow swipe down when at top of scroll
            if (deltaY > 0 && element.scrollTop === 0) {
                const transform = Math.min(deltaY, 200);
                element.style.transform = `translateY(${transform}px)`;
            }
        }, { passive: true });

        element.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            const deltaY = currentY - startY;
            
            // If swiped down more than 100px, close
            if (deltaY > 100 && element.scrollTop === 0) {
                this.toggleControls();
            } else {
                element.style.transform = '';
            }
            
            isDragging = false;
        });
    }

    /**
     * Setup touch interaction for 3D graph
     */
    setupTouchInteraction() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // Track touch points for pinch zoom
        let touches = [];
        let lastDistance = 0;

        canvas.addEventListener('touchstart', (e) => {
            touches = Array.from(e.touches);
            
            if (touches.length === 2) {
                // Calculate initial pinch distance
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                lastDistance = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            touches = Array.from(e.touches);
            
            if (touches.length === 2) {
                // Calculate new pinch distance
                const dx = touches[0].clientX - touches[1].clientX;
                const dy = touches[0].clientY - touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Calculate zoom factor
                const delta = distance - lastDistance;
                const zoomFactor = delta * 0.01;
                
                // Emit zoom event
                if (window.graph3DCallbacks && window.graph3DCallbacks.onPinchZoom) {
                    window.graph3DCallbacks.onPinchZoom(zoomFactor);
                }
                
                lastDistance = distance;
            }
        }, { passive: true });
    }

    /**
     * Handle orientation change
     */
    handleOrientationChange() {
        // Update mobile detection
        this.toggleButton.style.display = this.isMobile ? 'block' : 'none';
        
        // Reset controls visibility
        if (!this.isMobile && this.controlsVisible) {
            const controls = document.getElementById('controls');
            if (controls) {
                controls.classList.remove('visible');
            }
            this.controlsVisible = false;
            document.body.style.overflow = '';
        }
        
        // Update any callbacks
        if (window.graph3DCallbacks && window.graph3DCallbacks.onOrientationChange) {
            window.graph3DCallbacks.onOrientationChange(window.orientation);
        }
    }

    /**
     * Show mobile-specific message
     * @param {string} message - Message to show
     * @param {number} duration - Duration in ms
     */
    showMessage(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 30, 0.95);
            color: #00ff88;
            padding: 12px 20px;
            border-radius: 20px;
            border: 1px solid #00ff88;
            font-size: 14px;
            z-index: 1002;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }

    /**
     * Get mobile status
     * @returns {boolean} Whether device is mobile
     */
    getIsMobile() {
        return this.isMobile;
    }

    /**
     * Destroy mobile UI
     */
    destroy() {
        if (this.toggleButton && this.toggleButton.parentNode) {
            this.toggleButton.parentNode.removeChild(this.toggleButton);
        }
        
        const mobileStyles = document.getElementById('mobile-styles');
        if (mobileStyles) {
            mobileStyles.parentNode.removeChild(mobileStyles);
        }
        
        this.toggleButton = null;
        this.controlsVisible = false;
    }
}

// Create singleton instance
export const graph3DMobile = new Graph3DMobile();
