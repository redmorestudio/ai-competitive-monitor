#!/usr/bin/env node

/**
 * Quick Entity Grouping Status Check
 * Verifies all components are ready for deployment
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
    const exists = fs.existsSync(filePath);
    const icon = exists ? '✅' : '❌';
    console.log(`${icon} ${description}`);
    if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`   Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
    }
    return exists;
}

console.log('🔍 Entity Grouping Implementation Status Check\n');

console.log('📁 Core Scripts:');
const scripts = [
    ['apply-entity-groupings.js', 'Entity grouping creator'],
    ['handle-company-entities.js', 'Company entity handler'],
    ['entity-grouping-rules.js', 'Grouping rules definition'],
    ['update-entity-group-types.js', 'Type detector'],
    ['generate-entity-contexts-grouped.js', 'Context generator'],
    ['update-static-data-entity-groups.js', 'Static data updater'],
    ['update-dashboard-entity-groups.js', 'Dashboard updater'],
    ['update-3d-graph-entity-groups.js', '3D graph updater'],
    ['implement-entity-grouping-complete.js', 'Master implementation script']
];

let allScriptsExist = true;
scripts.forEach(([file, desc]) => {
    const exists = checkFile(path.join(__dirname, file), `${file} - ${desc}`);
    if (!exists) allScriptsExist = false;
});

console.log('\n📁 Output Files (if implementation was run):');
const outputs = [
    ['../api-data/entity-groups.json', 'Entity groups data'],
    ['../api-data/contexts/context-summary.json', 'Context summary'],
    ['../test-entity-groups.html', 'Test page'],
    ['../3D-GRAPH-FILTERING-GUIDE.md', '3D graph guide']
];

let anyOutputExists = false;
outputs.forEach(([file, desc]) => {
    const exists = checkFile(path.join(__dirname, file), `${file} - ${desc}`);
    if (exists) anyOutputExists = true;
});

console.log('\n📊 Summary:');
if (allScriptsExist) {
    console.log('✅ All implementation scripts are present');
} else {
    console.log('❌ Some scripts are missing');
}

if (anyOutputExists) {
    console.log('✅ Implementation has been run (output files exist)');
} else {
    console.log('⚠️  Implementation has not been run yet');
    console.log('   Run: node implement-entity-grouping-complete.js');
}

console.log('\n🚀 Ready for GitHub push:', allScriptsExist ? 'YES' : 'NO');
