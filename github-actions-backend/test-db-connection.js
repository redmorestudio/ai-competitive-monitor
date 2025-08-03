#!/usr/bin/env node

/**
 * Test database connection and environment variables
 * This helps diagnose connection issues
 */

const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 DATABASE CONNECTION DIAGNOSTIC');
  console.log('=================================\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set (hidden)' : '❌ NOT SET');
  console.log('POSTGRES_CONNECTION_STRING:', process.env.POSTGRES_CONNECTION_STRING ? '✅ Set (hidden)' : '❌ NOT SET');
  
  // Try to get connection string from any source
  const connectionString = process.env.DATABASE_URL || 
                           process.env.POSTGRES_CONNECTION_STRING ||
                           process.env.POSTGRESQL_URL ||
                           process.env.PG_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('\n❌ FATAL: No database connection string found!');
    console.error('Please set one of these environment variables:');
    console.error('  - DATABASE_URL (preferred)');
    console.error('  - POSTGRES_CONNECTION_STRING');
    console.error('  - POSTGRESQL_URL');
    console.error('  - PG_CONNECTION_STRING');
    process.exit(1);
  }
  
  // Parse and display connection info (safely)
  console.log('\n📊 Connection Details:');
  try {
    const url = new URL(connectionString);
    console.log('Protocol:', url.protocol);
    console.log('Host:', url.hostname);
    console.log('Port:', url.port || '5432');
    console.log('Database:', url.pathname.slice(1));
    console.log('Username:', url.username ? '✅ Set' : '❌ Not set');
    console.log('Password:', url.password ? '✅ Set' : '❌ Not set');
  } catch (e) {
    console.log('Could not parse connection string as URL');
  }
  
  // Try to connect
  console.log('\n🔌 Attempting Connection...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test query
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('\n📍 Connected to:');
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    console.log('Version:', result.rows[0].version.split(',')[0]);
    
    // Check if our schema exists
    const schemaCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'processed_content'
    `);
    
    console.log('\n📂 Schema Check:');
    if (schemaCheck.rows.length > 0) {
      console.log('✅ processed_content schema exists');
      
      // Check if change_detection table exists
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'processed_content' 
        AND table_name = 'change_detection'
      `);
      
      if (tableCheck.rows.length > 0) {
        console.log('✅ change_detection table exists');
        
        // Check for email columns
        const columnCheck = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'processed_content' 
          AND table_name = 'change_detection'
          AND column_name IN ('email_sent', 'email_sent_at')
          ORDER BY column_name
        `);
        
        if (columnCheck.rows.length > 0) {
          console.log('\n📧 Email columns found:');
          columnCheck.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
          });
        } else {
          console.log('⚠️  Email columns not found - need to add them');
        }
      } else {
        console.log('❌ change_detection table does not exist');
      }
    } else {
      console.log('❌ processed_content schema does not exist');
    }
    
    console.log('\n✅ All connection tests passed!');
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nError details:');
    console.error('Code:', error.code);
    console.error('Detail:', error.detail);
    console.error('Hint:', error.hint);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Connection refused. Possible causes:');
      console.error('1. Database server is not running');
      console.error('2. Wrong host/port in connection string');
      console.error('3. Firewall blocking connection');
    } else if (error.code === '28P01') {
      console.error('\n⚠️  Authentication failed. Check username/password');
    } else if (error.code === '3D000') {
      console.error('\n⚠️  Database does not exist');
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  testConnection();
}

module.exports = testConnection;
