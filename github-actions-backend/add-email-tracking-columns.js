#!/usr/bin/env node

/**
 * Add email tracking columns to change_detection table
 * This migration adds columns to track which changes have been emailed
 */

const { Client } = require('pg');

async function addEmailColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📧 Adding email tracking columns to change_detection table...');
    await client.connect();

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
    
  } catch (error) {
    console.error('❌ Error adding email columns:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  addEmailColumns();
}

module.exports = addEmailColumns;
