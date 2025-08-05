const { Pool } = require('pg');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function checkEntityTableSchemas() {
    try {
        const tables = [
            'entity_groups',
            'entity_variations', 
            'entity_relationships',
            'entity_mention_history',
            'entity_daily_snapshots'
        ];
        
        for (const tableName of tables) {
            console.log(`\n=== intelligence.${tableName} ===`);
            
            const query = `
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    column_default,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'intelligence' 
                AND table_name = $1
                ORDER BY ordinal_position;
            `;
            
            const result = await pool.query(query, [tableName]);
            
            result.rows.forEach(col => {
                let type = col.data_type;
                if (col.character_maximum_length) {
                    type += `(${col.character_maximum_length})`;
                }
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                console.log(`  ${col.column_name}: ${type} ${nullable}${defaultVal}`);
            });
        }
        
    } catch (error) {
        console.error('Error checking schemas:', error.message);
    } finally {
        await pool.end();
    }
}

checkEntityTableSchemas();
