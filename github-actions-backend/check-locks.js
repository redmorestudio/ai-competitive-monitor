const { Pool } = require('pg');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

async function checkLocks() {
    try {
        const query = `
            SELECT 
                l.pid,
                l.mode,
                l.granted,
                a.usename,
                a.query,
                age(now(), a.query_start) AS duration,
                pg_blocking_pids(l.pid) AS blocked_by
            FROM pg_locks l
            JOIN pg_stat_activity a ON l.pid = a.pid
            WHERE l.relation IN (
                SELECT oid FROM pg_class 
                WHERE relname IN ('entity_groups', 'entity_variations', 'entity_relationships')
                AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'intelligence')
            )
            ORDER BY a.query_start;
        `;
        
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            console.log('No locks found on entity tables.');
        } else {
            console.log('Locks on entity tables:');
            result.rows.forEach(row => {
                console.log(`\nPID: ${row.pid}`);
                console.log(`Mode: ${row.mode}`);
                console.log(`Granted: ${row.granted}`);
                console.log(`User: ${row.usename}`);
                console.log(`Duration: ${row.duration}`);
                console.log(`Query: ${row.query.substring(0, 100)}...`);
                if (row.blocked_by.length > 0) {
                    console.log(`Blocked by PIDs: ${row.blocked_by.join(', ')}`);
                }
            });
        }
        
        // Also check for any long-running queries
        const longRunning = `
            SELECT 
                pid,
                usename,
                age(now(), query_start) AS duration,
                state,
                query
            FROM pg_stat_activity
            WHERE state != 'idle'
            AND query_start < now() - interval '1 minute'
            ORDER BY query_start;
        `;
        
        const longResult = await pool.query(longRunning);
        
        if (longResult.rows.length > 0) {
            console.log('\n\nLong-running queries (>1 minute):');
            longResult.rows.forEach(row => {
                console.log(`\nPID: ${row.pid}`);
                console.log(`User: ${row.usename}`);
                console.log(`Duration: ${row.duration}`);
                console.log(`State: ${row.state}`);
                console.log(`Query: ${row.query.substring(0, 100)}...`);
            });
        }
        
    } catch (error) {
        console.error('Error checking locks:', error.message);
    } finally {
        await pool.end();
    }
}

checkLocks();
