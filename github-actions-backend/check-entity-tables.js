const { Pool } = require('pg');
require('dotenv').config();

// For development, disable SSL verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function checkEntityTables() {
    try {
        const query = `
            SELECT 
                table_schema,
                table_name,
                (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'intelligence' 
            AND table_name LIKE 'entity%'
            ORDER BY table_name;
        `;
        
        const result = await pool.query(query);
        
        console.log('Entity tables found:');
        if (result.rows.length === 0) {
            console.log('No entity tables exist yet.');
        } else {
            result.rows.forEach(row => {
                console.log(`- ${row.table_schema}.${row.table_name} (${row.column_count} columns)`);
            });
        }
        
        // Check for specific tables mentioned in the paste
        const specificTables = [
            'entity_groups',
            'entity_variations', 
            'entity_relationships',
            'entity_mention_history',
            'entity_daily_snapshots'
        ];
        
        console.log('\nChecking specific tables:');
        for (const tableName of specificTables) {
            const exists = result.rows.some(row => row.table_name === tableName);
            console.log(`- intelligence.${tableName}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        }
        
        // Check data in existing tables
        if (result.rows.length > 0) {
            console.log('\nChecking row counts:');
            for (const row of result.rows) {
                const countQuery = `SELECT COUNT(*) FROM intelligence.${row.table_name}`;
                try {
                    const countResult = await pool.query(countQuery);
                    console.log(`- ${row.table_name}: ${countResult.rows[0].count} rows`);
                } catch (err) {
                    console.log(`- ${row.table_name}: Error counting rows`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error checking tables:', error.message);
    } finally {
        await pool.end();
    }
}

checkEntityTables();
