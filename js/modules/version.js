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
    number: '2.1.5',
    name: 'KWIC & Modal Fixes',
    buildNumber: '178',
    releaseDate: '2025-08-27',
    deployTime: new Date().toISOString(),
    features: [
        'Fixed KWIC modal initialization and display',
        'Fixed modal reopening after closing',
        'Added debugging for KWIC data loading',
        'Fixed entity type parameters in click handlers',
        'Better error messages with HTTP status',
        'All recent changes now display properly'
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
