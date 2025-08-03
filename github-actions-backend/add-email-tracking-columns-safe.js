#!/usr/bin/env node

/**
 * SAFE VERSION: Add email tracking columns to change_detection table
 * This migration uses the schema-protector.js to safely add columns
 */

const { spawn } = require('child_process');
const path = require('path');

async function runSchemaProtectedCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔒 Running protected: ${description}`);
    
    const schemaProtector = spawn('node', [
      path.join(__dirname, 'schema-protector.js'),
      'execute',
      command
    ], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    schemaProtector.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - completed successfully`);
        resolve();
      } else {
        reject(new Error(`Schema-protected command failed with code ${code}`));
      }
    });

    schemaProtector.on('error', (err) => {
      reject(err);
    });
  });
}

async function addEmailColumnsSafely() {
  console.log('📧 Adding email tracking columns using schema protection...\n');
  
  try {
    // First check the current schema status
    console.log('🔍 Checking current schema status...');
    await runSchemaProtectedCommand(
      'status',
      'Schema status check'
    );

    // Add email_sent column
    await runSchemaProtectedCommand(
      `ALTER TABLE processed_content.change_detection ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false`,
      'Add email_sent column'
    );

    // Add email_sent_at column
    await runSchemaProtectedCommand(
      `ALTER TABLE processed_content.change_detection ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP`,
      'Add email_sent_at column'
    );

    // Create index for efficient querying
    await runSchemaProtectedCommand(
      `CREATE INDEX IF NOT EXISTS idx_change_detection_email ON processed_content.change_detection(email_sent, detected_at, interest_level) WHERE email_sent = false`,
      'Create email tracking index'
    );

    console.log('\n✅ Email tracking columns successfully added with schema protection!');
    console.log('📝 Schema version has been automatically updated');
    
  } catch (error) {
    console.error('\n❌ Error adding email columns:', error.message);
    console.error('🔧 Please check schema-protector.js logs for details');
    process.exit(1);
  }
}

// Alternative approach using the fix-postgres-schema-complete.js pattern
async function addEmailColumnsViaFixScript() {
  const { Client } = require('pg');
  const fs = require('fs').promises;
  const updateSchemaVersion = require('./update-schema-version');
  
  console.log('📧 Adding email tracking columns via fix-postgres-schema pattern...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Start transaction for safety
    await client.query('BEGIN');
    console.log('🔄 Started transaction');

    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'processed_content' 
        AND table_name = 'change_detection' 
        AND column_name IN ('email_sent', 'email_sent_at')
    `;
    
    const existing = await client.query(checkQuery);
    const existingColumns = existing.rows.map(row => row.column_name);
    console.log('📊 Existing columns:', existingColumns.length > 0 ? existingColumns.join(', ') : 'none');
    
    let columnsAdded = [];
    
    // Add email_sent column if it doesn't exist
    if (!existingColumns.includes('email_sent')) {
      console.log('Adding email_sent column...');
      await client.query(`
        ALTER TABLE processed_content.change_detection 
        ADD COLUMN email_sent BOOLEAN DEFAULT false
      `);
      columnsAdded.push('email_sent');
      console.log('✅ Added email_sent column');
    } else {
      console.log('✅ email_sent column already exists');
    }
    
    // Add email_sent_at column if it doesn't exist
    if (!existingColumns.includes('email_sent_at')) {
      console.log('Adding email_sent_at column...');
      await client.query(`
        ALTER TABLE processed_content.change_detection 
        ADD COLUMN email_sent_at TIMESTAMP
      `);
      columnsAdded.push('email_sent_at');
      console.log('✅ Added email_sent_at column');
    } else {
      console.log('✅ email_sent_at column already exists');
    }
    
    // Create index for efficient querying
    console.log('Creating index for email tracking...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_change_detection_email 
      ON processed_content.change_detection(email_sent, detected_at, interest_level)
      WHERE email_sent = false
    `);
    console.log('✅ Created email tracking index');

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    
    // Update schema version
    if (columnsAdded.length > 0) {
      console.log('\n📝 Updating schema version...');
      await updateSchemaVersion(
        `Added email tracking columns to change_detection: ${columnsAdded.join(', ')}`
      );
      console.log('✅ Schema version updated');
    }
    
    console.log('\n✅ Email tracking columns successfully added!');
    
  } catch (error) {
    // Rollback on error
    try {
      await client.query('ROLLBACK');
      console.log('⚠️ Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }
    
    console.error('❌ Error adding email columns:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

// Main execution - use the fix script pattern which is proven to work
if (require.main === module) {
  // Check which method to use based on environment or arguments
  const useSchemaProtector = process.argv.includes('--use-protector');
  
  if (useSchemaProtector) {
    console.log('Using schema-protector.js method...');
    addEmailColumnsSafely().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    console.log('Using fix-postgres-schema pattern with transactions...');
    addEmailColumnsViaFixScript().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
}

module.exports = { addEmailColumnsSafely, addEmailColumnsViaFixScript };
