#!/usr/bin/env node

/**
 * Manually update schema version to acknowledge entity grouping tables
 */

const fs = require('fs').promises;
const path = require('path');

async function updateSchemaVersion() {
    try {
        const versionPath = path.join(__dirname, 'schema-version.json');
        
        // Read current version
        const currentData = JSON.parse(await fs.readFile(versionPath, 'utf8'));
        
        // Update with entity grouping information
        const updatedData = {
            version: "2.1.0",
            lastModified: new Date().toISOString(),
            modifiedBy: "manual-update-entity-grouping",
            checksum: "806584703fd9165e3000912fcca1fe849c66f70becdafb1dfd16b2c4376d6a4d", // The actual current checksum
            changes: "Added entity grouping tables: entity_groups, entity_variations, entity_relationships, entity_mention_history, entity_daily_snapshots. These tables support synonym merging and hierarchical grouping of entities.",
            previousVersion: currentData.version,
            previousChecksum: currentData.checksum,
            details: {
                ...currentData.details,
                tablesPerSchema: {
                    ...currentData.details.tablesPerSchema,
                    intelligence: [
                        ...currentData.details.tablesPerSchema.intelligence,
                        "entity_daily_snapshots",
                        "entity_groups",
                        "entity_mention_history",
                        "entity_relationships",
                        "entity_variations"
                    ].sort()
                },
                entityGroupingTables: {
                    added: "2025-08-05",
                    tables: [
                        "entity_groups",
                        "entity_variations",
                        "entity_relationships",
                        "entity_mention_history",
                        "entity_daily_snapshots"
                    ],
                    purpose: "Support synonym merging and hierarchical grouping of entities for better visualization and analysis"
                },
                totalTables: 31 // Updated from 26
            }
        };
        
        // Write updated version
        await fs.writeFile(versionPath, JSON.stringify(updatedData, null, 2));
        
        console.log('✅ Schema version updated to 2.1.0');
        console.log('📊 Entity grouping tables acknowledged');
        console.log('🔧 Total tables: 31 (was 26)');
        console.log('\nEntity tables added:');
        console.log('  - entity_groups');
        console.log('  - entity_variations');
        console.log('  - entity_relationships');
        console.log('  - entity_mention_history');
        console.log('  - entity_daily_snapshots');
        
    } catch (error) {
        console.error('❌ Error updating schema version:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    updateSchemaVersion();
}

module.exports = { updateSchemaVersion };