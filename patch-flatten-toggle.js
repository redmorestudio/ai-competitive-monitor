// Enhanced Flatten Toggle Patch
// This replaces the existing flatten toggle with a more robust implementation

function patchFlattenToggle() {
    // Remove existing event listener by cloning the element
    const oldToggle = document.getElementById('toggle-flatten-graph');
    if (!oldToggle) {
        console.error('❌ Flatten toggle not found');
        return;
    }
    
    const newToggle = oldToggle.cloneNode(true);
    oldToggle.parentNode.replaceChild(newToggle, oldToggle);
    
    console.log('🔧 PATCHING FLATTEN TOGGLE with enhanced implementation');
    
    // Add enhanced event listener
    newToggle.addEventListener('change', (e) => {
        const flattenGraph = e.target.checked;
        console.log(`🎯 FLATTEN TOGGLE: ${flattenGraph ? 'ACTIVATING' : 'DEACTIVATING'} 2D mode`);
        
        if (!window.Graph) {
            console.error('❌ Graph not available');
            return;
        }
        
        if (flattenGraph) {
            console.log('📐 FLATTEN MODE: Starting aggressive 2D conversion');
            
            // Step 1: Switch to 2D dimensions
            window.Graph.numDimensions(2);
            console.log(`✅ Dimensions set to: ${window.Graph.numDimensions()}`);
            
            // Step 2: Get all nodes and flatten them immediately
            const nodes = window.Graph.graphData().nodes;
            let flattenedCount = 0;
            
            nodes.forEach(node => {
                if (node.z !== undefined && node.z !== 0) {
                    node.z = 0;
                    node.vz = 0;
                    node.fz = 0; // Clear z-force
                    flattenedCount++;
                }
            });
            
            console.log(`🎯 Flattened ${flattenedCount} nodes to z=0`);
            
            // Step 3: Add aggressive flattening force
            window.Graph.d3Force('flatten', d3.forceZ(0).strength(1.0));
            
            // Step 4: Enhance 2D forces for better spreading
            const originalCharge = window.Graph.d3Force('charge').strength();
            const originalDistance = window.Graph.d3Force('link').distance();
            
            window.Graph.d3Force('charge').strength(originalCharge * 1.5);
            window.Graph.d3Force('link').distance(originalDistance * 1.2);
            
            // Step 5: Force immediate update
            window.Graph.d3ReheatSimulation();
            
            // Step 6: Verify with a delay
            setTimeout(() => {
                const stillNotFlat = nodes.filter(n => n.z !== undefined && Math.abs(n.z) > 0.1);
                if (stillNotFlat.length > 0) {
                    console.warn(`⚠️ ${stillNotFlat.length} nodes still not flat, forcing again...`);
                    stillNotFlat.forEach(node => {
                        node.z = 0;
                        node.vz = 0;
                    });
                } else {
                    console.log('✅ All nodes successfully flattened');
                }
            }, 500);
            
        } else {
            console.log('🌍 UNFLATTEN MODE: Restoring 3D simulation');
            
            // Step 1: Switch back to 3D
            window.Graph.numDimensions(3);
            console.log(`✅ Dimensions restored to: ${window.Graph.numDimensions()}`);
            
            // Step 2: Remove flattening force
            window.Graph.d3Force('flatten', null);
            
            // Step 3: Restore original forces
            const CONFIG = {
                forceStrength: -300,
                linkDistance: 30
            };
            window.Graph.d3Force('charge').strength(CONFIG.forceStrength);
            window.Graph.d3Force('link').distance(CONFIG.linkDistance);
            
            // Step 4: Give nodes random Z velocities to spread into 3D
            const nodes = window.Graph.graphData().nodes;
            let spread3DCount = 0;
            
            nodes.forEach(node => {
                if (node.z !== undefined) {
                    node.vz = (Math.random() - 0.5) * 10; // Stronger Z push
                    spread3DCount++;
                }
            });
            
            console.log(`🌍 Applied 3D spreading to ${spread3DCount} nodes`);
            
            // Step 5: Reheat simulation
            window.Graph.d3ReheatSimulation();
        }
        
        console.log('🔥 Simulation reheated for mode change');
    });
    
    console.log('✅ Enhanced flatten toggle patch applied successfully');
}

// Apply the patch
patchFlattenToggle();
