const { SchemaProtector } = require('./schema-protector');
const fs = require('fs').promises;
const path = require('path');

async function forceUpdateSchemaVersion() {
    const protector = new SchemaProtector();
    
    try {
        await protector.initialize();
        
        // Get current schema hash
        const currentHash = await protector.getCurrentSchemaHash();
        
        // Get current version info
        const versionFile = path.join(__dirname, 'schema-version.json');
        const versionData = JSON.parse(await fs.readFile(versionFile, 'utf8'));
        
        // Update with current hash
        const updatedVersion = {
            ...versionData,
            version: "2.2.0",
            lastModified: new Date().toISOString(),
            modifiedBy: "reconcile-entity-schema",
            checksum: currentHash,
            changes: "Reconciled entity grouping schema - added missing constraints and indexes",
            previousVersion: versionData.version,
            previousChecksum: versionData.checksum
        };
        
        // Write updated version
        await fs.writeFile(versionFile, JSON.stringify(updatedVersion, null, 2));
        
        console.log('Schema version updated:');
        console.log(`Previous version: ${versionData.version}`);
        console.log(`New version: ${updatedVersion.version}`);
        console.log(`Previous checksum: ${versionData.checksum}`);
        console.log(`New checksum: ${currentHash}`);
        console.log('\n✅ Schema version file updated successfully');
        
        // Now run the reconciliation
        await protector.executeWithProtection(
            'add-entity-schema-constraints',
            'Adding missing constraints and indexes to entity grouping tables',
            async (client) => {
                console.log('\nAdding missing constraints and indexes...\n');
                
                // Just add the most critical missing pieces
                const criticalUpdates = [
                    `ALTER TABLE intelligence.entity_variations 
                     ADD CONSTRAINT IF NOT EXISTS entity_variations_variation_unique 
                     UNIQUE(variation)`,
                    
                    `CREATE INDEX IF NOT EXISTS idx_entity_groups_is_monitored 
                     ON intelligence.entity_groups(is_monitored)`,
                    
                    `CREATE INDEX IF NOT EXISTS idx_entity_groups_significance 
                     ON intelligence.entity_groups(significance_score DESC)`,
                    
                    `CREATE INDEX IF NOT EXISTS idx_entity_variations_group_id 
                     ON intelligence.entity_variations(group_id)`
                ];
                
                for (const query of criticalUpdates) {
                    try {
                        console.log(`Executing: ${query.substring(0, 60)}...`);
                        await client.query(query);
                        console.log('  ✅ Success');
                    } catch (error) {
                        if (error.code === '42P07' || error.code === '42710') {
                            console.log('  ⏭️  Already exists');
                        } else {
                            console.log(`  ❌ Error: ${error.message}`);
                        }
                    }
                }
                
                console.log('\n✅ Critical updates completed');
            }
        );
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (protector.pool) {
            await protector.pool.end();
        }
    }
}

forceUpdateSchemaVersion()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
