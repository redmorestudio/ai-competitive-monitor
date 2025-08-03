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
    number: '2.1.0',
    name: 'KWIC Feature',
    buildNumber: '173',
    releaseDate: '2025-08-03',
    features: [
        'Keyword-in-Context (KWIC) feature for entity exploration',
        'Clickable intelligence pills showing contexts',
        'Modular architecture with 23 specialized modules',
        'Enhanced 3D visualization with 40+ controls',
        'Improved performance and maintainability',
        'Better error handling and recovery'
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
        element.innerHTML = `
            <span class="version-number">v${VERSION.number}</span>
            <span class="version-name">${VERSION.name}</span>
        `;
        element.title = `Build ${VERSION.buildNumber} - Released ${VERSION.releaseDate}`;
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
