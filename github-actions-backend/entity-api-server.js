const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

// Load environment variables
if (!process.env.GITHUB_ACTIONS && !process.env.DATABASE_URL) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  } catch (e) {
    console.log('No .env file found, using environment variables');
  }
}

const app = express();
const PORT = process.env.PORT || 3001; // Different port from SQLite server

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to PostgreSQL database');
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as database');
    res.json({ 
      status: 'healthy', 
      version: '1.0.0',
      database: 'postgresql',
      connection: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// ==================== Entity Group Management ====================

// Get entity statistics
app.get('/api/entities/stats', async (req, res) => {
  try {
    const stats = await pool.query(`
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
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching entity stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all entity groups with their members
app.get('/api/entity-groups', async (req, res) => {
  const { search, type } = req.query;
  
  try {
    let query = `
      SELECT 
        eg.id,
        eg.canonical_name as name,
        eg.group_type as type,
        eg.is_monitored,
        eg.created_at,
        eg.updated_at,
        COUNT(DISTINCT egm.entity_name) as variation_count,
        COUNT(DISTINCT baer.analysis_id) as mention_count,
        array_agg(DISTINCT egm.entity_name ORDER BY egm.entity_name) FILTER (WHERE egm.entity_name IS NOT NULL) as variations
      FROM intelligence.entity_groups eg
      LEFT JOIN intelligence.entity_group_members egm ON eg.id = egm.group_id
      LEFT JOIN intelligence.baseline_analysis_entity_refs baer ON eg.id = baer.entity_group_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      query += ` AND (LOWER(eg.canonical_name) LIKE LOWER($${paramCount}) OR 
                      EXISTS (SELECT 1 FROM intelligence.entity_group_members egm2 
                              WHERE egm2.group_id = eg.id 
                              AND LOWER(egm2.entity_name) LIKE LOWER($${paramCount})))`;
      params.push(`%${search}%`);
    }
    
    if (type) {
      paramCount++;
      query += ` AND eg.group_type = $${paramCount}`;
      params.push(type);
    }
    
    query += ` GROUP BY eg.id ORDER BY eg.canonical_name`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entity groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ungrouped entities
app.get('/api/entities/ungrouped', async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  
  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        bae.entity_name as name,
        bae.entity_type as type,
        COUNT(DISTINCT bae.analysis_id) as mention_count,
        array_agg(DISTINCT c.name) as mentioned_by
      FROM intelligence.baseline_analysis_entities bae
      LEFT JOIN intelligence.entity_group_members egm ON LOWER(bae.entity_name) = LOWER(egm.entity_name)
      LEFT JOIN intelligence.baseline_analysis ba ON bae.analysis_id = ba.id
      LEFT JOIN intelligence.companies c ON ba.company_name = c.name
      WHERE egm.group_id IS NULL
      GROUP BY bae.entity_name, bae.entity_type
      ORDER BY COUNT(DISTINCT bae.analysis_id) DESC, bae.entity_name
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ungrouped entities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific entity group with full details
app.get('/api/entity-groups/:id', async (req, res) => {
  try {
    const groupResult = await pool.query(`
      SELECT 
        eg.*,
        array_agg(DISTINCT egm.entity_name ORDER BY egm.entity_name) as variations
      FROM intelligence.entity_groups eg
      LEFT JOIN intelligence.entity_group_members egm ON eg.id = egm.group_id
      WHERE eg.id = $1
      GROUP BY eg.id
    `, [req.params.id]);
    
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entity group not found' });
    }
    
    const group = groupResult.rows[0];
    
    // Get companies that mention this entity group
    const mentionsResult = await pool.query(`
      SELECT DISTINCT 
        c.name as company,
        COUNT(DISTINCT baer.analysis_id) as mention_count
      FROM intelligence.baseline_analysis_entity_refs baer
      JOIN intelligence.baseline_analysis ba ON baer.analysis_id = ba.id
      JOIN intelligence.companies c ON ba.company_name = c.name
      WHERE baer.entity_group_id = $1
      GROUP BY c.name
      ORDER BY mention_count DESC
    `, [req.params.id]);
    
    group.mentioned_by = mentionsResult.rows;
    res.json(group);
  } catch (error) {
    console.error('Error fetching entity group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new entity group
app.post('/api/entity-groups', async (req, res) => {
  const { name, type, variations = [], is_monitored = false } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Canonical name is required' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create the group
    const groupResult = await client.query(`
      INSERT INTO intelligence.entity_groups (canonical_name, group_type, is_monitored)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, type || 'unknown', is_monitored]);
    
    const group = groupResult.rows[0];
    
    // Add variations (including the canonical name)
    const allVariations = [name, ...variations];
    for (const variation of allVariations) {
      await client.query(`
        INSERT INTO intelligence.entity_group_members (group_id, entity_name)
        VALUES ($1, $2)
        ON CONFLICT (LOWER(entity_name)) DO NOTHING
      `, [group.id, variation]);
    }
    
    // Update entity references
    await client.query(`
      UPDATE intelligence.baseline_analysis_entity_refs baer
      SET entity_group_id = $1
      WHERE LOWER(baer.entity_name) IN (
        SELECT LOWER(entity_name) FROM intelligence.entity_group_members WHERE group_id = $1
      )
    `, [group.id]);
    
    await client.query('COMMIT');
    
    // Return the created group with variations
    const fullGroup = await pool.query(`
      SELECT 
        eg.*,
        array_agg(DISTINCT egm.entity_name) as variations
      FROM intelligence.entity_groups eg
      LEFT JOIN intelligence.entity_group_members egm ON eg.id = egm.group_id
      WHERE eg.id = $1
      GROUP BY eg.id
    `, [group.id]);
    
    res.status(201).json(fullGroup.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating entity group:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Entity group already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  } finally {
    client.release();
  }
});

// Update an entity group
app.put('/api/entity-groups/:id', async (req, res) => {
  const { name, type, is_monitored } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 0;
    
    if (name !== undefined) {
      paramCount++;
      updates.push(`canonical_name = $${paramCount}`);
      values.push(name);
    }
    if (type !== undefined) {
      paramCount++;
      updates.push(`group_type = $${paramCount}`);
      values.push(type);
    }
    if (is_monitored !== undefined) {
      paramCount++;
      updates.push(`is_monitored = $${paramCount}`);
      values.push(is_monitored);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    paramCount++;
    updates.push('updated_at = NOW()');
    values.push(req.params.id);
    
    const result = await pool.query(`
      UPDATE intelligence.entity_groups 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entity group not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating entity group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add an entity to a group
app.post('/api/entity-groups/:id/members', async (req, res) => {
  const { entity_name } = req.body;
  
  if (!entity_name) {
    return res.status(400).json({ error: 'entity_name is required' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add to group members
    await client.query(`
      INSERT INTO intelligence.entity_group_members (group_id, entity_name)
      VALUES ($1, $2)
      ON CONFLICT (LOWER(entity_name)) DO UPDATE SET group_id = $1
    `, [req.params.id, entity_name]);
    
    // Update entity references
    await client.query(`
      UPDATE intelligence.baseline_analysis_entity_refs
      SET entity_group_id = $1
      WHERE LOWER(entity_name) = LOWER($2)
    `, [req.params.id, entity_name]);
    
    await client.query('COMMIT');
    
    res.status(201).json({ message: 'Entity added to group successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding entity to group:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Remove an entity from a group
app.delete('/api/entity-groups/:id/members/:entity', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Remove from group members
    const result = await client.query(`
      DELETE FROM intelligence.entity_group_members
      WHERE group_id = $1 AND LOWER(entity_name) = LOWER($2)
    `, [req.params.id, decodeURIComponent(req.params.entity)]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Entity not found in this group' });
    }
    
    // Remove group reference from entity refs
    await client.query(`
      UPDATE intelligence.baseline_analysis_entity_refs
      SET entity_group_id = NULL
      WHERE entity_group_id = $1 AND LOWER(entity_name) = LOWER($2)
    `, [req.params.id, decodeURIComponent(req.params.entity)]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Entity removed from group successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing entity from group:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Delete an entity group
app.delete('/api/entity-groups/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Remove group references from entity refs
    await client.query(`
      UPDATE intelligence.baseline_analysis_entity_refs
      SET entity_group_id = NULL
      WHERE entity_group_id = $1
    `, [req.params.id]);
    
    // Delete group members
    await client.query(`
      DELETE FROM intelligence.entity_group_members
      WHERE group_id = $1
    `, [req.params.id]);
    
    // Delete the group
    const result = await client.query(`
      DELETE FROM intelligence.entity_groups
      WHERE id = $1
    `, [req.params.id]);
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Entity group not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({ message: 'Entity group deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting entity group:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Auto-group similar entities
app.post('/api/entities/auto-group', async (req, res) => {
  const { threshold = 0.8 } = req.body;
  
  try {
    // This is a simplified version - in production you'd use more sophisticated
    // similarity algorithms (Levenshtein distance, embeddings, etc.)
    const result = await pool.query(`
      WITH ungrouped AS (
        SELECT DISTINCT entity_name, entity_type
        FROM intelligence.baseline_analysis_entities bae
        LEFT JOIN intelligence.entity_group_members egm ON LOWER(bae.entity_name) = LOWER(egm.entity_name)
        WHERE egm.group_id IS NULL
      ),
      potential_groups AS (
        SELECT 
          u1.entity_name as entity1,
          u2.entity_name as entity2,
          similarity(LOWER(u1.entity_name), LOWER(u2.entity_name)) as sim_score
        FROM ungrouped u1
        CROSS JOIN ungrouped u2
        WHERE u1.entity_name < u2.entity_name
          AND similarity(LOWER(u1.entity_name), LOWER(u2.entity_name)) >= $1
      )
      SELECT * FROM potential_groups
      ORDER BY sim_score DESC
      LIMIT 20
    `, [threshold]);
    
    res.json({
      suggestions: result.rows,
      message: `Found ${result.rows.length} potential groupings with similarity >= ${threshold}`
    });
  } catch (error) {
    console.error('Error auto-grouping entities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export entity groups
app.get('/api/entity-groups/export', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        eg.id,
        eg.canonical_name,
        eg.group_type,
        eg.is_monitored,
        eg.created_at,
        eg.updated_at,
        array_agg(DISTINCT egm.entity_name ORDER BY egm.entity_name) as variations
      FROM intelligence.entity_groups eg
      LEFT JOIN intelligence.entity_group_members egm ON eg.id = egm.group_id
      GROUP BY eg.id
      ORDER BY eg.canonical_name
    `);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="entity-groups.json"');
    res.json({
      exported_at: new Date().toISOString(),
      total_groups: result.rows.length,
      groups: result.rows
    });
  } catch (error) {
    console.error('Error exporting entity groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Entity Management API server running on port ${PORT}`);
  console.log(`📊 Using PostgreSQL database`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  pool.end(() => {
    console.log('PostgreSQL pool closed');
    process.exit(0);
  });
});

module.exports = app;
