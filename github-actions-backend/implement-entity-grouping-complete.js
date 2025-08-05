#!/usr/bin/env node

/**
 * Complete Entity Grouping Implementation
 * Master script to implement the entire entity grouping system
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scripts = [
    {
        name: 'Apply Entity Groupings',
        script: 'apply-entity-groupings.js',
        description: 'Creates entity groups from raw entities'
    },
    {
        name: 'Handle Company Entities',
        script: 'handle-company-entities.js',
        description: 'Marks companies with proper group_type'
    },
    {
        name: 'Update Entity Types',
        script: 'update-entity-group-types.js',
        description: 'Detects and assigns types to entity groups'
    },
    {
        name: 'Generate Grouped Entity Data',
        script: 'update-static-data-entity-groups.js',
        description: 'Creates entity-groups.json with filtering'
    },
    {
        name: 'Update Dashboard',
        script: 'update-dashboard-entity-groups.js',
        description: 'Updates index.html to use entity groups'
    },
    {
        name: 'Update 3D Graph',
        script: 'update-3d-graph-entity-groups.js',
        description: 'Updates 3D force graph with smart filtering'
    }
];

async function runImplementation() {
    console.log('🚀 Starting Complete Entity Grouping Implementation\n');
    console.log('This will:');
    console.log('1. Group 3,260 entities into ~800 canonical groups');
    console.log('2. Generate contexts only for grouped entities');
    console.log('3. Update dashboard with view toggle');
    console.log('4. Add smart filtering to 3D graph\n');
    
    const startTime = Date.now();
    const results = [];
    
    for (const { name, script, description } of scripts) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📌 ${name}`);
        console.log(`   ${description}`);
        console.log(`${'='.repeat(60)}\n`);
        
        try {
            const scriptPath = path.join(__dirname, script);
            
            if (!fs.existsSync(scriptPath)) {
                console.log(`⚠️  Script not found: ${script}`);
                results.push({ name, status: 'SKIPPED', reason: 'Script not found' });
                continue;
            }
            
            // Run the script
            execSync(`node ${script}`, {
                cwd: __dirname,
                stdio: 'inherit',
                env: process.env
            });
            
            results.push({ name, status: 'SUCCESS' });
            console.log(`\n✅ ${name} completed successfully`);
            
        } catch (error) {
            console.error(`\n❌ Error in ${name}:`, error.message);
            results.push({ name, status: 'FAILED', error: error.message });
            
            // Ask if should continue
            console.log('\nContinue with remaining scripts? (y/n)');
            // For automation, we'll continue
            console.log('Continuing...');
        }
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 IMPLEMENTATION SUMMARY');
    console.log(`${'='.repeat(60)}\n`);
    
    results.forEach(({ name, status, reason, error }) => {
        const icon = status === 'SUCCESS' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
        console.log(`${icon} ${name}: ${status}`);
        if (reason) console.log(`   Reason: ${reason}`);
        if (error) console.log(`   Error: ${error}`);
    });
    
    console.log(`\nTotal time: ${elapsed} seconds`);
    
    const successful = results.filter(r => r.status === 'SUCCESS').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    
    console.log(`\nResults: ${successful} successful, ${failed} failed`);
    
    if (successful === scripts.length) {
        console.log('\n🎉 Entity grouping implementation completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Verify entity-groups.json exists in api-data/');
        console.log('2. Check test-entity-groups.html in browser');
        console.log('3. Test dashboard toggle between Detail/Graph views');
        console.log('4. Test 3D graph smart filtering');
        console.log('5. Run in GitHub Actions to update production');
    } else {
        console.log('\n⚠️  Implementation completed with some failures.');
        console.log('Check the errors above and fix before deploying.');
    }
    
    // Create implementation report
    const report = {
        timestamp: new Date().toISOString(),
        duration_seconds: elapsed,
        results: results,
        summary: {
            total: scripts.length,
            successful: successful,
            failed: failed
        }
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'entity-grouping-implementation-report.json'),
        JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Implementation report saved to entity-grouping-implementation-report.json');
}

// Run if called directly
if (require.main === module) {
    runImplementation().catch(console.error);
}

module.exports = { runImplementation };
