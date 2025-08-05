const { Pool } = require('pg');
require('dotenv').config();

// For development, disable SSL verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function testMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Testing migration queries...\n');
        
        // Test a simple query first
        const testQuery = `SELECT COUNT(*) FROM intelligence.entity_groups`;
        const result = await client.query(testQuery);
        console.log(`Entity groups count: ${result.rows[0].count}`);
        
        // Test adding a constraint that might be missing
        const constraintQuery = `
            ALTER TABLE intelligence.entity_variations 
            ADD CONSTRAINT IF NOT EXISTS unique_variation 
            UNIQUE(variation)
        `;
        
        console.log('\nTesting constraint addition...');
        await client.query(constraintQuery);
        console.log('✅ Constraint added or already exists');
        
        // Check current constraints
        const checkConstraints = `
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                tc.table_name
            FROM information_schema.table_constraints tc
            WHERE tc.table_schema = 'intelligence' 
            AND tc.table_name IN ('entity_groups', 'entity_variations', 'entity_relationships')
            ORDER BY tc.table_name, tc.constraint_type;
        `;
        
        const constraints = await client.query(checkConstraints);
        console.log('\nExisting constraints:');
        constraints.rows.forEach(row => {
            console.log(`  ${row.table_name}.${row.constraint_name} (${row.constraint_type})`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

testMigration();
