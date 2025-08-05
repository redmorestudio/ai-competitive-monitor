const { SchemaProtector } = require('./schema-protector');

async function verifySchemaChecksum() {
    const protector = new SchemaProtector();
    
    try {
        await protector.initialize();
        
        // Get current schema hash
        const currentHash = await protector.getCurrentSchemaHash();
        
        // Get stored version
        const storedVersion = await protector.getSchemaVersion();
        
        console.log('Schema Checksum Verification:');
        console.log('='.repeat(50));
        console.log(`Stored checksum:  ${storedVersion.checksum}`);
        console.log(`Current checksum: ${currentHash}`);
        console.log(`Match: ${currentHash === storedVersion.checksum ? '✅ YES' : '❌ NO'}`);
        console.log(`\nStored version: ${storedVersion.version}`);
        console.log(`Last modified: ${storedVersion.lastModified}`);
        console.log(`Modified by: ${storedVersion.modifiedBy}`);
        
        if (currentHash !== storedVersion.checksum) {
            console.log('\n⚠️  WARNING: Schema has changed since last recorded version!');
            console.log('This could mean:');
            console.log('1. Schema changes were made without updating the version');
            console.log('2. The migration needs to be completed');
            console.log('3. Manual schema changes need to be documented');
        }
        
    } catch (error) {
        console.error('Error verifying checksum:', error.message);
    } finally {
        await protector.end();
    }
}

verifySchemaChecksum();
