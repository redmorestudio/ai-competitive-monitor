const { SchemaProtector } = require('./schema-protector');
const entityGroupingSchema = require('./migrations/002-add-entity-grouping-schema');

async function applyEntityGroupingMigration() {
    const protector = new SchemaProtector();
    
    await protector.executeWithProtection(
        'entity-grouping-migration',
        'Documenting entity grouping tables and adding missing constraints',
        async (client) => {
            console.log('Applying entity grouping schema migration...');
            
            for (const query of entityGroupingSchema.changes) {
                try {
                    console.log(`Executing: ${query.substring(0, 50)}...`);
                    await client.query(query);
                } catch (error) {
                    // If table/constraint already exists, that's fine
                    if (error.code === '42P07' || error.code === '42710' || error.code === '42P09') {
                        console.log(`  Already exists, skipping...`);
                    } else {
                        console.error(`  Error: ${error.message}`);
                        throw error;
                    }
                }
            }
            
            // Update schema version
            await client.query(`
                UPDATE intelligence.schema_version 
                SET version = $1, 
                    last_modified = CURRENT_TIMESTAMP,
                    modified_by = $2
                WHERE id = 1
            `, [entityGroupingSchema.version, 'entity-grouping-migration']);
            
            console.log('✅ Entity grouping schema migration completed successfully');
        }
    );
}

// Run the migration
applyEntityGroupingMigration().catch(console.error);
