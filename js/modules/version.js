/**
 * @module version
 * @description Version information for the AI Competitive Monitor
 * @since 1.0.0
 */

/**
 * Version Module
 * Provides version information and display utilities
 */

// Version information
export const VERSION = {
    number: '2.1.4',
    name: 'Modal & Changes Fix',
    buildNumber: '177',
    releaseDate: '2025-08-27',
    deployTime: new Date().toISOString(),
    features: [
        'Fixed modal reopening issue after first close',
        'Fixed changes view to show all recent data',
        'Added KWIC integration to change detail modals',
        'Clickable entity tags in modals',
        'Extended changes timeframe to 90 days',
        'Removed artificial limits on changes display'
    ]
};

/**
 * Display version information in a DOM element
 * @param {string} elementId - ID of the element to display version in
 * @returns {void}
 */
export function displayVersion(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const deployTime = new Date(VERSION.deployTime);
        const timeString = deployTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = deployTime.toLocaleDateString();
        
        element.innerHTML = `
            <span class="version-number">v${VERSION.number}</span>
            <span class="version-name">${VERSION.name}</span>
            <span class="version-date" style="opacity: 0.7; margin-left: 8px;">
                (${dateString} ${timeString})
            </span>
        `;
        element.title = `Build ${VERSION.buildNumber} - Deployed ${VERSION.deployTime}`;
    }
}

/**
 * Get version string
 * @returns {string} Formatted version string
 */
export function getVersionString() {
    return `AI Monitor v${VERSION.number} - ${VERSION.name}`;
}

/**
 * Check if version is compatible
 * @param {string} requiredVersion - Required version string
 * @returns {boolean} True if compatible
 */
export function isVersionCompatible(requiredVersion) {
    const current = VERSION.number.split('.').map(Number);
    const required = requiredVersion.split('.').map(Number);
    
    for (let i = 0; i < required.length; i++) {
        if (current[i] > required[i]) return true;
        if (current[i] < required[i]) return false;
    }
    
    return true;
}

// Export for debugging
export default VERSION;
