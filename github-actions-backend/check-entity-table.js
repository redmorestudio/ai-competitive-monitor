#!/usr/bin/env node

/**
 * Check Entity Groups Table Structure
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkTableStructure() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        // Check columns in entity_groups table
        const columnsQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'intelligence' 
            AND table_name = 'entity_groups'
            ORDER BY ordinal_position
        `;
        
        const columnsResult = await pool.query(columnsQuery);
        
        console.log('Entity Groups Table Columns:');
        console.log('============================');
        columnsResult.rows.forEach(col => {
            console.log(`${col.column_name} - ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });
        
        // Get a sample of data
        const sampleQuery = `
            SELECT * FROM intelligence.entity_groups
            LIMIT 5
        `;
        
        const sampleResult = await pool.query(sampleQuery);
        console.log('\nSample Data:');
        console.log(JSON.stringify(sampleResult.rows, null, 2));
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructure();
