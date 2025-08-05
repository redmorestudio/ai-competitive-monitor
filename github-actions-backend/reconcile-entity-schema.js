const { SchemaProtector } = require('./schema-protector');

async function reconcileSchema() {
    const protector = new SchemaProtector();
    
    await protector.executeWithProtection(
        'reconcile-entity-grouping-schema',
        'Reconciling entity grouping schema with proper documentation and constraints',
        async (client) => {
            console.log('Starting schema reconciliation...\n');
            
            // 1. Add any missing constraints
            const constraints = [
                {
                    name: 'Add unique constraint on entity_groups.canonical_name',
                    query: `ALTER TABLE intelligence.entity_groups 
                           ADD CONSTRAINT IF NOT EXISTS entity_groups_canonical_name_unique 
                           UNIQUE(canonical_name)`
                },
                {
                    name: 'Add unique constraint on entity_variations.variation',
                    query: `ALTER TABLE intelligence.entity_variations 
                           ADD CONSTRAINT IF NOT EXISTS entity_variations_variation_unique 
                           UNIQUE(variation)`
                },
                {
                    name: 'Add foreign key for entity_variations.group_id',
                    query: `ALTER TABLE intelligence.entity_variations 
                           ADD CONSTRAINT IF NOT EXISTS fk_entity_variations_group 
                           FOREIGN KEY (group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`
                },
                {
                    name: 'Add foreign keys for entity_relationships',
                    query: `ALTER TABLE intelligence.entity_relationships 
                           ADD CONSTRAINT IF NOT EXISTS fk_entity_relationships_source 
                           FOREIGN KEY (source_group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`
                },
                {
                    name: 'Add foreign keys for entity_relationships target',
                    query: `ALTER TABLE intelligence.entity_relationships 
                           ADD CONSTRAINT IF NOT EXISTS fk_entity_relationships_target 
                           FOREIGN KEY (target_group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`
                },
                {
                    name: 'Add unique constraint on entity_relationships',
                    query: `ALTER TABLE intelligence.entity_relationships 
                           ADD CONSTRAINT IF NOT EXISTS entity_relationships_unique 
                           UNIQUE(source_group_id, target_group_id, relationship_type)`
                },
                {
                    name: 'Add foreign keys for entity_mention_history',
                    query: `ALTER TABLE intelligence.entity_mention_history 
                           ADD CONSTRAINT IF NOT EXISTS fk_entity_mention_history_entity 
                           FOREIGN KEY (entity_group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`
                },
                {
                    name: 'Add foreign key for entity_mention_history.company_id',
                    query: `ALTER TABLE intelligence.entity_mention_history 
                           ADD CONSTRAINT IF NOT EXISTS fk_entity_mention_history_company 
                           FOREIGN KEY (company_id) REFERENCES intelligence.companies(id) ON DELETE CASCADE`
                },
                {
                    name: 'Add unique constraint on entity_mention_history',
                    query: `ALTER TABLE intelligence.entity_mention_history 
                           ADD CONSTRAINT IF NOT EXISTS entity_mention_history_unique 
                           UNIQUE(entity_group_id, company_id, mention_date)`
                },
                {
                    name: 'Add foreign key for entity_daily_snapshots',
                    query: `ALTER TABLE intelligence.entity_daily_snapshots 
                           ADD CONSTRAINT IF NOT EXISTS fk_entity_daily_snapshots_entity 
                           FOREIGN KEY (entity_group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`
                },
                {
                    name: 'Add unique constraint on entity_daily_snapshots',
                    query: `ALTER TABLE intelligence.entity_daily_snapshots 
                           ADD CONSTRAINT IF NOT EXISTS entity_daily_snapshots_unique 
                           UNIQUE(snapshot_date, entity_group_id)`
                }
            ];
            
            // 2. Add indexes for performance
            const indexes = [
                {
                    name: 'Create index on entity_groups.canonical_name',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_groups_canonical_name 
                           ON intelligence.entity_groups(canonical_name)`
                },
                {
                    name: 'Create index on entity_groups.group_type',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_groups_group_type 
                           ON intelligence.entity_groups(group_type)`
                },
                {
                    name: 'Create index on entity_groups.is_monitored',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_groups_is_monitored 
                           ON intelligence.entity_groups(is_monitored)`
                },
                {
                    name: 'Create index on entity_groups.significance_score',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_groups_significance 
                           ON intelligence.entity_groups(significance_score DESC)`
                },
                {
                    name: 'Create index on entity_variations.group_id',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_variations_group_id 
                           ON intelligence.entity_variations(group_id)`
                },
                {
                    name: 'Create index on entity_variations.variation',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_variations_variation 
                           ON intelligence.entity_variations(variation)`
                },
                {
                    name: 'Create index on entity_relationships.source_group_id',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_relationships_source 
                           ON intelligence.entity_relationships(source_group_id)`
                },
                {
                    name: 'Create index on entity_relationships.target_group_id',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_relationships_target 
                           ON intelligence.entity_relationships(target_group_id)`
                },
                {
                    name: 'Create index on entity_mention_history.entity_group_id',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_entity 
                           ON intelligence.entity_mention_history(entity_group_id)`
                },
                {
                    name: 'Create index on entity_mention_history.company_id',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_company 
                           ON intelligence.entity_mention_history(company_id)`
                },
                {
                    name: 'Create index on entity_mention_history.mention_date',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_date 
                           ON intelligence.entity_mention_history(mention_date DESC)`
                },
                {
                    name: 'Create index on entity_daily_snapshots.snapshot_date',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_daily_snapshots_date 
                           ON intelligence.entity_daily_snapshots(snapshot_date DESC)`
                },
                {
                    name: 'Create index on entity_daily_snapshots.entity_group_id',
                    query: `CREATE INDEX IF NOT EXISTS idx_entity_daily_snapshots_entity 
                           ON intelligence.entity_daily_snapshots(entity_group_id)`
                }
            ];
            
            // Execute constraints
            console.log('Adding constraints...');
            for (const constraint of constraints) {
                try {
                    console.log(`  ${constraint.name}...`);
                    await client.query(constraint.query);
                    console.log(`    ✅ Success`);
                } catch (error) {
                    if (error.code === '42P07' || error.code === '42710') {
                        console.log(`    ⏭️  Already exists`);
                    } else {
                        console.log(`    ❌ Error: ${error.message}`);
                        throw error;
                    }
                }
            }
            
            // Execute indexes
            console.log('\nAdding indexes...');
            for (const index of indexes) {
                try {
                    console.log(`  ${index.name}...`);
                    await client.query(index.query);
                    console.log(`    ✅ Success`);
                } catch (error) {
                    if (error.code === '42P07') {
                        console.log(`    ⏭️  Already exists`);
                    } else {
                        console.log(`    ❌ Error: ${error.message}`);
                        throw error;
                    }
                }
            }
            
            console.log('\n✅ Schema reconciliation completed successfully');
            console.log('The schema checksum will be automatically updated by the protector.');
        }
    );
}

// Run the reconciliation
reconcileSchema()
    .then(() => {
        console.log('\n✅ Reconciliation process completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Reconciliation failed:', error.message);
        process.exit(1);
    });
