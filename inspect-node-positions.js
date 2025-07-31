// Visual Z-Coordinate Inspector
// Add this to browser console to see if nodes are actually flattening

function inspectNodePositions() {
    if (!window.Graph) {
        console.error('Graph not available');
        return;
    }
    
    const nodes = window.Graph.graphData().nodes;
    console.log(`🔍 INSPECTING ${nodes.length} NODE POSITIONS`);
    
    // Get Z statistics
    const zValues = nodes.map(n => n.z || 0);
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);
    const avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
    const nonZeroZ = zValues.filter(z => Math.abs(z) > 0.01).length;
    
    console.log(`📊 Z-Coordinate Statistics:`);
    console.log(`   Min Z: ${minZ.toFixed(3)}`);
    console.log(`   Max Z: ${maxZ.toFixed(3)}`);
    console.log(`   Avg Z: ${avgZ.toFixed(3)}`);
    console.log(`   Non-zero Z: ${nonZeroZ}/${nodes.length}`);
    console.log(`   Range: ${(maxZ - minZ).toFixed(3)}`);
    
    // Show sample positions
    console.log(`\n📍 Sample Node Positions (first 10):`);
    nodes.slice(0, 10).forEach((node, i) => {
        console.log(`   ${i}: ${node.name} -> x:${(node.x || 0).toFixed(1)}, y:${(node.y || 0).toFixed(1)}, z:${(node.z || 0).toFixed(3)}`);
    });
    
    // Check camera position
    const camera = window.Graph.camera();
    console.log(`\n📷 Camera Position:`);
    console.log(`   x:${camera.position.x.toFixed(1)}, y:${camera.position.y.toFixed(1)}, z:${camera.position.z.toFixed(1)}`);
    
    // Determine if nodes are flat
    const isFlat = (maxZ - minZ) < 1.0; // If all nodes within 1 unit of Z
    console.log(`\n🎯 RESULT: Nodes are ${isFlat ? '✅ FLAT' : '❌ NOT FLAT'}`);
    
    if (isFlat && nonZeroZ === 0) {
        console.log('💡 Nodes appear perfectly flat - issue might be visual/camera angle');
    } else if (!isFlat) {
        console.log('💡 Nodes are still in 3D space - flattening not working');
    }
    
    return {
        isFlat,
        minZ,
        maxZ,
        avgZ,
        nonZeroZ,
        totalNodes: nodes.length
    };
}

// Add continuous monitoring
let monitorInterval;

function startFlattenMonitoring() {
    console.log('🚀 Starting flatten monitoring...');
    monitorInterval = setInterval(() => {
        const stats = inspectNodePositions();
        console.log(`Monitor: ${stats.isFlat ? 'FLAT' : '3D'} (${stats.nonZeroZ} non-zero Z)`);
    }, 2000);
}

function stopFlattenMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        console.log('⏹️ Monitoring stopped');
    }
}

// Run initial inspection
inspectNodePositions();

console.log('\n🛠️ Available functions:');
console.log('  inspectNodePositions() - Check current node positions');
console.log('  startFlattenMonitoring() - Monitor positions every 2s');
console.log('  stopFlattenMonitoring() - Stop monitoring');
