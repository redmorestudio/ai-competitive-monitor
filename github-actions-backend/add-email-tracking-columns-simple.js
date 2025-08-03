#!/usr/bin/env node

/**
 * Simple version: Add email tracking columns to change_detection table
 * Uses proper connection handling and checks
 */

const { Client } = require('pg');

async function addEmailColumns() {
  // Ensure we have a database connection string
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING;
  
  if (!connectionString) {
    console.error('❌ No database connection string found!');
    console.error('Please set DATABASE_URL environment variable in GitHub Secrets');
    process.exit(1);
  }
  
  console.log('📧 Adding email tracking columns to change_detection table...');
  console.log('🔗 Database URL starts with:', connectionString.substring(0, 25) + '...');
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Required for Heroku/cloud PostgreSQL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

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
    
    if (existingColumns.length > 0) {
      console.log('📊 Found existing columns:', existingColumns.join(', '));
    }
    
    // Add email_sent column if it doesn't exist
    if (!existingColumns.includes('email_sent')) {
      console.log('Adding email_sent column...');
      await client.query(`
        ALTER TABLE processed_content.change_detection 
        ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false
      `);
      console.log('✅ Added email_sent column');
    } else {
      console.log('✅ email_sent column already exists');
    }
    
    // Add email_sent_at column if it doesn't exist
    if (!existingColumns.includes('email_sent_at')) {
      console.log('Adding email_sent_at column...');
      await client.query(`
        ALTER TABLE processed_content.change_detection 
        ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP
      `);
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
    
    console.log('\n✅ Email tracking columns successfully added!');
    console.log('The email notification system is now ready to use.');
    
  } catch (error) {
    console.error('❌ Error adding email columns:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Connection refused - please check:');
      console.error('1. DATABASE_URL is set correctly in GitHub Secrets');
      console.error('2. The database server is accessible');
      console.error('3. SSL settings are correct for your database');
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

// Run if called directly
if (require.main === module) {
  addEmailColumns();
}

module.exports = addEmailColumns;
