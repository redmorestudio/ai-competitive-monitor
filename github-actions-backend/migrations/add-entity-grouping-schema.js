#!/usr/bin/env node

/**
 * Migration: Add Entity Grouping Schema
 * Version: 2.1.0
 * 
 * This migration adds the entity grouping tables that were created
 * without schema protection. It checks for existence before creating.
 */

const migration = {
    version: '2.1.0',
    description: 'Add entity grouping tables with proper schema protection',
    
    changes: [
        // Create entity_groups table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS intelligence.entity_groups (
            id SERIAL PRIMARY KEY,
            canonical_name TEXT NOT NULL UNIQUE,
            group_type TEXT NOT NULL, -- 'synonym', 'hierarchical', 'technology', 'company', 'product', 'concept'
            parent_group_id INTEGER REFERENCES intelligence.entity_groups(id),
            is_monitored BOOLEAN DEFAULT FALSE, -- true for companies we actively monitor
            mention_count INTEGER DEFAULT 0, -- how many times mentioned across all sites
            mentioned_by_count INTEGER DEFAULT 0, -- how many different sites mention this
            first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Create entity_variations table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS intelligence.entity_variations (
            id SERIAL PRIMARY KEY,
            entity_group_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            variation_text TEXT NOT NULL,
            source_company_id INTEGER REFERENCES intelligence.companies(id),
            occurrence_count INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(variation_text, entity_group_id)
        )`,
        
        // Create entity_relationships table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS intelligence.entity_relationships (
            id SERIAL PRIMARY KEY,
            parent_entity_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            child_entity_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            relationship_type TEXT NOT NULL, -- 'parent-child', 'technology-stack', 'company-product'
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(parent_entity_id, child_entity_id, relationship_type)
        )`,
        
        // Create entity_mention_history table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS intelligence.entity_mention_history (
            id SERIAL PRIMARY KEY,
            entity_group_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id) ON DELETE CASCADE,
            company_id INTEGER NOT NULL REFERENCES intelligence.companies(id),
            mention_date DATE NOT NULL,
            mention_count INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(entity_group_id, company_id, mention_date)
        )`,
        
        // Create entity_daily_snapshots table if it doesn't exist
        `CREATE TABLE IF NOT EXISTS intelligence.entity_daily_snapshots (
            id SERIAL PRIMARY KEY,
            snapshot_date DATE NOT NULL,
            entity_group_id INTEGER NOT NULL REFERENCES intelligence.entity_groups(id),
            total_mentions INTEGER DEFAULT 0,
            mentioning_companies INTEGER DEFAULT 0,
            is_new BOOLEAN DEFAULT FALSE, -- was this entity first seen today?
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(snapshot_date, entity_group_id)
        )`,
        
        // Create indexes if they don't exist
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_canonical_name ON intelligence.entity_groups(canonical_name)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_group_type ON intelligence.entity_groups(group_type)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_is_monitored ON intelligence.entity_groups(is_monitored)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_mention_count ON intelligence.entity_groups(mention_count DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_groups_mentioned_by_count ON intelligence.entity_groups(mentioned_by_count DESC)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_variations_text ON intelligence.entity_variations(variation_text)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_variations_group_id ON intelligence.entity_variations(entity_group_id)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_relationships_parent ON intelligence.entity_relationships(parent_entity_id)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_relationships_child ON intelligence.entity_relationships(child_entity_id)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_date ON intelligence.entity_mention_history(mention_date DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_mention_history_entity ON intelligence.entity_mention_history(entity_group_id)`,
        
        `CREATE INDEX IF NOT EXISTS idx_entity_daily_snapshots_date ON intelligence.entity_daily_snapshots(snapshot_date DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_entity_daily_snapshots_new ON intelligence.entity_daily_snapshots(is_new)`,
        
        // Add trigger for updated_at if it doesn't exist
        `CREATE OR REPLACE FUNCTION intelligence.update_entity_groups_updated_at()
         RETURNS TRIGGER AS $$
         BEGIN
             NEW.updated_at = CURRENT_TIMESTAMP;
             RETURN NEW;
         END;
         $$ LANGUAGE plpgsql`,
         
        `DO $$
         BEGIN
             IF NOT EXISTS (
                 SELECT 1 FROM pg_trigger 
                 WHERE tgname = 'update_entity_groups_updated_at_trigger'
             ) THEN
                 CREATE TRIGGER update_entity_groups_updated_at_trigger
                 BEFORE UPDATE ON intelligence.entity_groups
                 FOR EACH ROW
                 EXECUTE FUNCTION intelligence.update_entity_groups_updated_at();
             END IF;
         END $$`
    ],
    
    rollback: [
        // Note: We don't actually drop tables in rollback to avoid data loss
        // This is just for documentation
        `-- To rollback, you would run:
         -- DROP TABLE IF EXISTS intelligence.entity_daily_snapshots CASCADE;
         -- DROP TABLE IF EXISTS intelligence.entity_mention_history CASCADE;
         -- DROP TABLE IF EXISTS intelligence.entity_relationships CASCADE;
         -- DROP TABLE IF EXISTS intelligence.entity_variations CASCADE;
         -- DROP TABLE IF EXISTS intelligence.entity_groups CASCADE;
         -- DROP FUNCTION IF EXISTS intelligence.update_entity_groups_updated_at() CASCADE;`
    ]
};

module.exports = migration;