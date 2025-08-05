const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

/**
 * Entity Management Data Generator
 * 
 * This script runs in GitHub Actions to generate static JSON files
 * for the entity management UI. It reads from PostgreSQL and outputs
 * JSON files that can be served via GitHub Pages.
 */

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function generateEntityManagementData() {
  console.log('🔄 Generating entity management data...');
  
  try {
    // Create output directory
    const outputDir = path.join(__dirname, '../api-data/entity-management');
    await fs.mkdir(outputDir, { recursive: true });
    
    // 1. Generate entity statistics
    console.log('📊 Generating entity statistics...');
    const stats = await generateStats();
    await fs.writeFile(
      path.join(outputDir, 'stats.json'),
      JSON.stringify(stats, null, 2)
    );
    
    // 2. Generate entity groups list
    console.log('📦 Generating entity groups...');
    const groups = await generateGroups();
    await fs.writeFile(
      path.join(outputDir, 'groups.json'),
      JSON.stringify(groups, null, 2)
    );
    
    // 3. Generate ungrouped entities
    console.log('🔍 Generating ungrouped entities...');
    const ungrouped = await generateUngroupedEntities();
    await fs.writeFile(
      path.join(outputDir, 'ungrouped.json'),
      JSON.stringify(ungrouped, null, 2)
    );
    
    // 4. Generate entity mappings (for operations)
    console.log('🗺️ Generating entity mappings...');
    const mappings = await generateEntityMappings();
    await fs.writeFile(
      path.join(outputDir, 'mappings.json'),
      JSON.stringify(mappings, null, 2)
    );
    
    // 5. Generate metadata
    console.log('📋 Generating metadata...');
    const metadata = {
      generated_at: new Date().toISOString(),
      version: '1.0.0',
      total_groups: groups.groups.length,
      total_entities: stats.total_entities,
      ungrouped_count: ungrouped.entities.length
    };
    await fs.writeFile(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log('✅ Entity management data generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating entity management data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function generateStats() {
  const result = await pool.query(`
    WITH entity_stats AS (
      SELECT 
        (SELECT COUNT(DISTINCT entity_name) FROM intelligence.baseline_analysis_entities) as total_entities,
        (SELECT COUNT(*) FROM intelligence.entity_groups) as total_groups,
        (SELECT COUNT(DISTINCT bae.entity_name) 
         FROM intelligence.baseline_analysis_entities bae
         LEFT JOIN intelligence.entity_group_members egm ON LOWER(bae.entity_name) = LOWER(egm.entity_name)
         WHERE egm.group_id IS NULL) as ungrouped_entities,
        (SELECT COUNT(DISTINCT egm.entity_name) 
         FROM intelligence.entity_group_members egm) as grouped_entities
    )
    SELECT * FROM entity_stats
  `);
  
  return result.rows[0];
}

async function generateGroups() {
  const result = await pool.query(`
    SELECT 
      eg.id,
      eg.canonical_name as name,
      eg.group_type as type,
      eg.is_monitored,
      eg.created_at,
      eg.updated_at,
      COUNT(DISTINCT egm.entity_name) as variation_count,
      COUNT(DISTINCT baer.analysis_id) as mention_count,
      array_agg(DISTINCT egm.entity_name ORDER BY egm.entity_name) FILTER (WHERE egm.entity_name IS NOT NULL) as variations,
      array_agg(DISTINCT c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL) as mentioned_by_companies
    FROM intelligence.entity_groups eg
    LEFT JOIN intelligence.entity_group_members egm ON eg.id = egm.group_id
    LEFT JOIN intelligence.baseline_analysis_entity_refs baer ON eg.id = baer.entity_group_id
    LEFT JOIN intelligence.baseline_analysis ba ON baer.analysis_id = ba.id
    LEFT JOIN intelligence.companies c ON ba.company_name = c.name
    GROUP BY eg.id
    ORDER BY eg.canonical_name
  `);
  
  return {
    groups: result.rows,
    total: result.rows.length
  };
}

async function generateUngroupedEntities() {
  const result = await pool.query(`
    SELECT DISTINCT 
      bae.entity_name as name,
      bae.entity_type as type,
      COUNT(DISTINCT bae.analysis_id) as mention_count,
      array_agg(DISTINCT c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL) as mentioned_by
    FROM intelligence.baseline_analysis_entities bae
    LEFT JOIN intelligence.entity_group_members egm ON LOWER(bae.entity_name) = LOWER(egm.entity_name)
    LEFT JOIN intelligence.baseline_analysis ba ON bae.analysis_id = ba.id
    LEFT JOIN intelligence.companies c ON ba.company_name = c.name
    WHERE egm.group_id IS NULL
    GROUP BY bae.entity_name, bae.entity_type
    ORDER BY COUNT(DISTINCT bae.analysis_id) DESC, bae.entity_name
    LIMIT 500
  `);
  
  return {
    entities: result.rows,
    total: result.rows.length,
    truncated: result.rows.length === 500
  };
}

async function generateEntityMappings() {
  // This creates a mapping of all entity names to their groups
  // Used for quick lookups in the UI
  const result = await pool.query(`
    SELECT 
      egm.entity_name,
      egm.group_id,
      eg.canonical_name as group_name,
      eg.group_type
    FROM intelligence.entity_group_members egm
    JOIN intelligence.entity_groups eg ON egm.group_id = eg.id
    ORDER BY egm.entity_name
  `);
  
  // Convert to a map for efficient lookups
  const mappings = {};
  result.rows.forEach(row => {
    mappings[row.entity_name.toLowerCase()] = {
      group_id: row.group_id,
      group_name: row.group_name,
      group_type: row.group_type
    };
  });
  
  return mappings;
}

// Run if called directly
if (require.main === module) {
  generateEntityManagementData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateEntityManagementData };
