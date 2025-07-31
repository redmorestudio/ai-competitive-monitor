// Test flatten toggle functionality
// Add to browser console to test immediately

function testFlattenToggle() {
    const toggle = document.getElementById('toggle-flatten-graph');
    console.log('🧪 TESTING FLATTEN TOGGLE');
    console.log('Toggle element:', toggle);
    console.log('Toggle checked:', toggle?.checked);
    
    if (!window.Graph) {
        console.error('❌ Graph not initialized');
        return;
    }
    
    console.log('Current dimensions:', window.Graph.numDimensions());
    
    // Get current node positions
    const nodes = window.Graph.graphData().nodes;
    const sampleNodes = nodes.slice(0, 5);
    
    console.log('Sample node Z positions BEFORE:');
    sampleNodes.forEach((node, i) => {
        console.log(`Node ${i} (${node.name}): z=${node.z?.toFixed(2) || 'undefined'}`);
    });
    
    // Toggle the checkbox programmatically
    toggle.checked = !toggle.checked;
    toggle.dispatchEvent(new Event('change'));
    
    // Check positions after a short delay
    setTimeout(() => {
        console.log('Sample node Z positions AFTER:');
        sampleNodes.forEach((node, i) => {
            console.log(`Node ${i} (${node.name}): z=${node.z?.toFixed(2) || 'undefined'}`);
        });
        console.log('New dimensions:', window.Graph.numDimensions());
    }, 100);
}

// Run the test
testFlattenToggle();
