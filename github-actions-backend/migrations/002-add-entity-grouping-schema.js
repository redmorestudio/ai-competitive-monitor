const entityGroupingSchema = {
    version: '2.2.0',
    description: 'Add entity grouping tables (retroactive documentation)',
    changes: [
        // Document existing tables - use CREATE TABLE IF NOT EXISTS to be safe
        `CREATE TABLE IF NOT EXISTS intelligence.entity_groups (
            id SERIAL PRIMARY KEY,
            canonical_name VARCHAR(255) NOT NULL UNIQUE,
            group_type VARCHAR(50),
            description TEXT,
            auto_created BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            created_by VARCHAR(100) DEFAULT 'system',
            is_monitored BOOLEAN DEFAULT FALSE,
            mention_count INTEGER DEFAULT 0,
            mentioned_by_count INTEGER DEFAULT 0,
            significance_score FLOAT DEFAULT 0,
            last_calculated TIMESTAMP DEFAULT NOW()
        )`,
        
        `CREATE TABLE IF NOT EXISTS intelligence.entity_variations (
            id SERIAL PRIMARY KEY,
            group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            variation VARCHAR(255) NOT NULL,
            is_primary BOOLEAN DEFAULT FALSE,
            confidence FLOAT DEFAULT 1.0,
            source VARCHAR(50) DEFAULT 'manual',
            added_by VARCHAR(100),
            added_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(variation)
        )`,
        
        `CREATE TABLE IF NOT EXISTS intelligence.entity_relationships (
            id SERIAL PRIMARY KEY,
            source_group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            target_group_id INTEGER REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            relationship_type VARCHAR(50),
            confidence FLOAT DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(source_group_id, target_group_id, relationship_type)
        )`,
        
        `CREATE TABLE IF NOT EXISTS intelligence.entity_mention_history (
            id SERIAL PRIMARY KEY,
            entity_group_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            company_id INTEGER NOT NULL REFERENCES intelligence.companies(id) ON DELETE CASCADE,
            mention_date DATE NOT NULL,
            mention_count INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(entity_group_id, company_id, mention_date)
        )`,
        
        `CREATE TABLE IF NOT EXISTS intelligence.entity_daily_snapshots (
            id SERIAL PRIMARY KEY,
            snapshot_date DATE NOT NULL,
            entity_group_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            total_mentions INTEGER DEFAULT 0,
            mentioning_companies INTEGER DEFAULT 0,
            is_new BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(snapshot_date, entity_group_id)
        )`,
        
        // Add indexes for performance
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_canonical_name ON intelligence.entity_groups(canonical_name)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_group_type ON intelligence.entity_groups(group_type)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_is_monitored ON intelligence.entity_groups(is_monitored)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_significance ON intelligence.entity_groups(significance_score DESC)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_variations_group_id ON intelligence.entity_variations(group_id)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_variations_variation ON intelligence.entity_variations(variation)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_relationships_source ON intelligence.entity_relationships(source_group_id)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_relationships_target ON intelligence.entity_relationships(target_group_id)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_entity ON intelligence.entity_mention_history(entity_group_id)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_company ON intelligence.entity_mention_history(company_id)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_date ON intelligence.entity_mention_history(mention_date DESC)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_daily_snapshots_date ON intelligence.entity_daily_snapshots(snapshot_date DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_daily_snapshots_entity ON intelligence.entity_daily_snapshots(entity_group_id)`,
        
        // Add missing constraints that should have been there
        `ALTER TABLE intelligence.entity_variations 
         ADD CONSTRAINT IF NOT EXISTS fk_entity_variations_group 
         FOREIGN KEY (group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`,
        
        `ALTER TABLE intelligence.entity_relationships 
         ADD CONSTRAINT IF NOT EXISTS fk_entity_relationships_source 
         FOREIGN KEY (source_group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`,
        
        `ALTER TABLE intelligence.entity_relationships 
         ADD CONSTRAINT IF NOT EXISTS fk_entity_relationships_target 
         FOREIGN KEY (target_group_id) REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE`,
        
        // Add update trigger for entity_groups
        `CREATE OR REPLACE FUNCTION update_entity_groups_updated_at()
         RETURNS TRIGGER AS $$
         BEGIN
             NEW.updated_at = NOW();
             RETURN NEW;
         END;
         $$ LANGUAGE plpgsql`,
        
        `DROP TRIGGER IF EXISTS trigger_update_entity_groups_updated_at ON intelligence.entity_groups`,
        
        `CREATE TRIGGER trigger_update_entity_groups_updated_at
         BEFORE UPDATE ON intelligence.entity_groups
         FOR EACH ROW
         EXECUTE FUNCTION update_entity_groups_updated_at()`
    ]
};

module.exports = entityGroupingSchema;
