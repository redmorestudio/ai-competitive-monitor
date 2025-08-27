#!/usr/bin/env node

/**
 * PostgreSQL Email Notification Wrapper
 * Routes email commands to the PostgreSQL-based email notification system
 * Ensures compatibility with GitHub Actions workflow
 */

const { spawn } = require('child_process');
const path = require('path');

async function main() {
  const command = process.argv[2] || 'check';
  
  console.log(`📧 PostgreSQL Email Notification Wrapper - Command: ${command}`);
  console.log('=========================================');
  
  // Map 'check' command to appropriate PostgreSQL command
  let postgresCommand = command;
  if (command === 'check') {
    // 'check' means check for high-priority changes and send if found
    postgresCommand = 'immediate';
  }
  
  // Use the PostgreSQL version
  const scriptPath = path.join(__dirname, 'email-notifications-postgres.js');
  
  // Pass through the mapped command
  const args = [scriptPath, postgresCommand, ...process.argv.slice(3)];
  
  // Ensure PostgreSQL connection string is available
  if (!process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL) {
    console.error('❌ Error: PostgreSQL connection string not found');
    console.error('   Please set POSTGRES_CONNECTION_STRING or DATABASE_URL environment variable');
    process.exit(1);
  }
  
  // If running in GitHub Actions, ensure we're not in test mode unless explicitly set
  if (process.env.GITHUB_ACTIONS && !process.env.EMAIL_TEST_MODE) {
    console.log('Running in GitHub Actions - Live email mode');
    console.log(`Using PostgreSQL database for email notifications`);
  }
  
  const child = spawn('node', args, {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('error', (error) => {
    console.error('Failed to start PostgreSQL email process:', error);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(`⚠️  Email process exited with code ${code}`);
    }
    process.exit(code || 0);
  });
}

main().catch(error => {
  console.error('PostgreSQL email wrapper error:', error);
  process.exit(1);
});