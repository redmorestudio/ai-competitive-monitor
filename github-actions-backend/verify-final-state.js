const { SchemaProtector } = require('./schema-protector');

async function verifyFinalState() {
    const protector = new SchemaProtector();
    
    try {
        await protector.initialize();
        
        // Get current schema hash
        const currentHash = await protector.getCurrentSchemaHash();
        
        // Get stored version
        const storedVersion = await protector.getSchemaVersion();
        
        console.log('Final Schema State:');
        console.log('='.repeat(50));
        console.log(`Version: ${storedVersion.version}`);
        console.log(`Stored checksum:  ${storedVersion.checksum}`);
        console.log(`Current checksum: ${currentHash}`);
        console.log(`Match: ${currentHash === storedVersion.checksum ? '✅ YES - Schema is in sync!' : '❌ NO - Still mismatched'}`);
        console.log(`\nLast modified: ${storedVersion.lastModified}`);
        console.log(`Modified by: ${storedVersion.modifiedBy}`);
        
        // Check entity tables
        const result = await protector.pool.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.table_constraints 
                    WHERE table_schema = 'intelligence' 
                    AND table_name = t.table_name 
                    AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')) as constraint_count,
                   (SELECT COUNT(*) FROM pg_indexes 
                    WHERE schemaname = 'intelligence' 
                    AND tablename = t.table_name) as index_count
            FROM information_schema.tables t
            WHERE table_schema = 'intelligence' 
            AND table_name LIKE 'entity%'
            ORDER BY table_name;
        `);
        
        console.log('\nEntity Table Status:');
        result.rows.forEach(row => {
            console.log(`- ${row.table_name}: ${row.constraint_count} constraints, ${row.index_count} indexes`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (protector.pool) {
            await protector.pool.end();
        }
    }
}

verifyFinalState();
