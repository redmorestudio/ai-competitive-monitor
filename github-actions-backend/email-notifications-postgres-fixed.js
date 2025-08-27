#!/usr/bin/env node

/**
 * PostgreSQL-based Email Notification System - FIXED
 * Handles immediate alerts, daily digests, and health check emails
 * 
 * Usage:
 *   node email-notifications-postgres-fixed.js immediate  # Send high-priority alerts
 *   node email-notifications-postgres-fixed.js daily      # Send daily digest
 *   node email-notifications-postgres-fixed.js health     # Send health check
 *   node email-notifications-postgres-fixed.js test       # Test email configuration
 */

const nodemailer = require('nodemailer');
const { db, end } = require('./postgres-db');
const path = require('path');
const fs = require('fs');

// Load environment variables
if (!process.env.GITHUB_ACTIONS && !process.env.DATABASE_URL) {
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('Note: dotenv not available, using environment variables');
  }
}

class PostgresEmailNotificationService {
  constructor() {
    // Check if email is configured
    this.isConfigured = !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASS
    );
    
    // Email configuration
    this.recipient = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER || 'seth@redmore.studio';
    this.sender = process.env.SMTP_USER || 'ai-monitor@redmore.studio';
    
    // Test mode - save to file instead of sending
    this.testMode = process.env.EMAIL_TEST_MODE === 'true';
    
    if (this.isConfigured && !this.testMode) {
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  }

  /**
   * Send immediate alert for high-priority changes
   */
  async sendImmediateAlert() {
    console.log('🚨 Checking for high-priority changes to alert on...');
    
    try {
      // Get high-priority changes from the last 4 hours that haven't been emailed
      const query = `
        SELECT 
          c.id,
          c.company,
          c.url,
          c.change_type,
          c.interest_level,
          c.analysis,
          c.detected_at,
          comp.name as company_name,
          comp.category as company_category
        FROM intelligence.changes c
        LEFT JOIN intelligence.companies comp 
          ON c.company = comp.name
        WHERE c.detected_at > NOW() - INTERVAL '4 hours'
          AND c.interest_level >= 8
          AND (c.email_sent IS NULL OR c.email_sent = false)
        ORDER BY c.interest_level DESC, c.detected_at DESC
        LIMIT 10
      `;
      
      const result = await db.all(query);
      
      if (result.length === 0) {
        console.log('✅ No high-priority changes found. No alert needed.');
        return true;
      }
      
      console.log(`Found ${result.length} high-priority changes to alert on!`);
      
      // Build email content
      const changes = result;
      const subject = `🚨 ${changes.length} Important AI Industry Change${changes.length > 1 ? 's' : ''} Detected`;
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }
            .change-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 15px 0; background: #f9f9f9; }
            .high-priority { border-left: 5px solid #ff4444; }
            .interest-badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-weight: bold; }
            .interest-10 { background: #ff4444; color: white; }
            .interest-9 { background: #ff6644; color: white; }
            .interest-8 { background: #ff8844; color: white; }
            .company-name { color: #667eea; font-weight: bold; font-size: 1.2em; }
            .summary { background: white; padding: 10px; border-radius: 5px; margin: 10px 0; }
            .footer { margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚨 Important AI Industry Changes Detected</h1>
            <p>The following high-priority changes require your immediate attention:</p>
          </div>
      `;
      
      for (const change of changes) {
        let analysis = {};
        try {
          if (typeof change.analysis === 'string') {
            analysis = JSON.parse(change.analysis);
          } else if (change.analysis) {
            analysis = change.analysis;
          }
        } catch (e) {
          console.log('Could not parse analysis:', e.message);
        }
        
        const summary = analysis.change_summary?.what_changed || 
                       analysis.summary || 
                       'Significant change detected';
        
        const techScore = analysis.interest_assessment?.technical_innovation_score || 'N/A';
        const bizScore = analysis.interest_assessment?.business_impact_score || 'N/A';
        const interestDrivers = analysis.interest_assessment?.interest_drivers || [];
        
        html += `
          <div class="change-card high-priority">
            <div>
              <span class="company-name">${change.company_name || change.company}</span>
              <span class="interest-badge interest-${change.interest_level}">Interest: ${change.interest_level}/10</span>
            </div>
            
            <div class="summary">
              <p><strong>What Changed:</strong> ${summary}</p>
            </div>
            
            <div style="margin: 10px 0;">
              <strong>Type:</strong> ${change.change_type || 'content_change'}<br>
              <strong>URL:</strong> <a href="${change.url}">${change.url}</a><br>
              <strong>Detected:</strong> ${new Date(change.detected_at).toLocaleString()}<br>
            </div>
            
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px;">
              <strong>Scoring:</strong><br>
              Technical Innovation: ${techScore}/10<br>
              Business Impact: ${bizScore}/10<br>
              ${interestDrivers.length > 0 ? `<br><strong>Key Drivers:</strong> ${interestDrivers.join(', ')}` : ''}
            </div>
          </div>
        `;
      }
      
      html += `
          <div class="footer">
            <p>View the full dashboard at your GitHub Pages site</p>
            <p style="font-size: 0.9em; color: #666;">
              This is an automated alert from AI Competitive Monitor.<br>
              High-priority threshold: Interest Level ≥ 8
            </p>
          </div>
        </body>
        </html>
      `;
      
      // Send or save email
      if (await this.sendEmail(subject, html)) {
        // Mark changes as emailed
        const changeIds = changes.map(c => c.id);
        await this.markAsEmailed(changeIds);
        console.log(`✅ Alert sent for ${changes.length} high-priority changes`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error sending immediate alert:', error);
      return false;
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest() {
    console.log('📊 Generating daily digest email...');
    
    try {
      const today = new Date().toLocaleDateString();
      
      // Get 24-hour statistics
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_changes,
          COUNT(DISTINCT company) as companies_with_changes,
          COUNT(CASE WHEN interest_level >= 8 THEN 1 END) as high_priority_count,
          COUNT(CASE WHEN interest_level >= 5 AND interest_level < 8 THEN 1 END) as medium_priority_count,
          COUNT(CASE WHEN interest_level < 5 THEN 1 END) as low_priority_count
        FROM intelligence.changes
        WHERE detected_at > NOW() - INTERVAL '24 hours'
      `);
      
      // Get monitoring health
      const health = await db.get(`
        SELECT 
          COUNT(DISTINCT c.id) as companies_monitored,
          COUNT(DISTINCT u.id) as urls_checked,
          COUNT(sp.id) as total_checks,
          COUNT(CASE WHEN sp.http_status BETWEEN 200 AND 299 THEN 1 END) as successful_checks,
          COUNT(CASE WHEN sp.is_blocked_by_captcha = true THEN 1 END) as blocked_checks,
          MAX(sp.scraped_at) as last_check_time
        FROM intelligence.companies c
        JOIN intelligence.urls u ON c.id = u.company_id
        LEFT JOIN intelligence.scraped_pages sp ON u.url = sp.url
          AND sp.scraped_at > NOW() - INTERVAL '24 hours'
      `);
      
      // Get all changes from the last 24 hours
      const changes = await db.all(`
        SELECT 
          c.company,
          c.url,
          c.interest_level,
          c.analysis,
          c.detected_at
        FROM intelligence.changes c
        WHERE c.detected_at > NOW() - INTERVAL '24 hours'
        ORDER BY c.interest_level DESC, c.detected_at DESC
      `);
      
      const subject = `📊 AI Monitor Daily Report - ${today}`;
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .stat-card { background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-number { font-size: 2em; font-weight: bold; color: #667eea; }
            .change-section { margin: 20px 0; }
            .change-item { border-left: 3px solid #ddd; padding-left: 15px; margin: 15px 0; }
            .high-priority { border-left-color: #ff4444; }
            .medium-priority { border-left-color: #ffaa44; }
            .low-priority { border-left-color: #44aa44; }
            .footer { margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 10px; }
            .health-good { color: #4CAF50; }
            .health-warning { color: #FF9800; }
            .health-bad { color: #F44336; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 AI Competitive Monitor - Daily Report</h1>
            <p>${today}</p>
          </div>
          
          <h2>📈 24-Hour Summary</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${stats.total_changes || 0}</div>
              <div>Total Changes</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.companies_with_changes || 0}</div>
              <div>Companies Updated</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.high_priority_count || 0}</div>
              <div>High Priority</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${Math.round((health.successful_checks / (health.total_checks || 1)) * 100)}%</div>
              <div>Success Rate</div>
            </div>
          </div>
          
          <h2>🔍 System Health</h2>
          <ul>
            <li><strong>Companies Monitored:</strong> ${health.companies_monitored}</li>
            <li><strong>URLs Checked:</strong> ${health.urls_checked}</li>
            <li><strong>Successful Checks:</strong> <span class="${health.successful_checks > health.total_checks * 0.9 ? 'health-good' : health.successful_checks > health.total_checks * 0.7 ? 'health-warning' : 'health-bad'}">${health.successful_checks}/${health.total_checks}</span></li>
            <li><strong>Blocked by Captcha:</strong> ${health.blocked_checks || 0}</li>
            <li><strong>Last Check:</strong> ${health.last_check_time ? new Date(health.last_check_time).toLocaleString() : 'N/A'}</li>
          </ul>
      `;
      
      if (changes.length > 0) {
        // Group changes by priority
        const highPriority = changes.filter(c => c.interest_level >= 8);
        const mediumPriority = changes.filter(c => c.interest_level >= 5 && c.interest_level < 8);
        const lowPriority = changes.filter(c => c.interest_level < 5);
        
        if (highPriority.length > 0) {
          html += `
            <div class="change-section">
              <h2>🚨 High Priority Changes (${highPriority.length})</h2>
          `;
          
          for (const change of highPriority.slice(0, 5)) {
            let summary = 'Change detected';
            try {
              const analysis = typeof change.analysis === 'string' ? JSON.parse(change.analysis) : change.analysis;
              summary = analysis?.change_summary?.what_changed || analysis?.summary || summary;
            } catch (e) {}
            
            html += `
              <div class="change-item high-priority">
                <strong>${change.company}</strong> - Interest: ${change.interest_level}/10<br>
                ${summary}<br>
                <small><a href="${change.url}">View</a> | ${new Date(change.detected_at).toLocaleString()}</small>
              </div>
            `;
          }
          
          if (highPriority.length > 5) {
            html += `<p><em>...and ${highPriority.length - 5} more high-priority changes</em></p>`;
          }
          
          html += `</div>`;
        }
        
        if (mediumPriority.length > 0) {
          html += `
            <div class="change-section">
              <h2>⚡ Medium Priority Changes (${mediumPriority.length})</h2>
              <p><em>Summary: ${mediumPriority.length} changes with interest level 5-7</em></p>
            </div>
          `;
        }
        
        if (lowPriority.length > 0) {
          html += `
            <div class="change-section">
              <h2>📝 Routine Changes (${lowPriority.length})</h2>
              <p><em>Summary: ${lowPriority.length} routine changes detected</em></p>
            </div>
          `;
        }
      } else {
        html += `
          <div class="change-section">
            <p>No changes detected in the last 24 hours.</p>
          </div>
        `;
      }
      
      html += `
          <div class="footer">
            <h3>📋 Email Configuration</h3>
            <p>
              <strong>Alert Threshold:</strong> Interest Level ≥ 8 (immediate alerts)<br>
              <strong>Daily Digest:</strong> All changes from last 24 hours<br>
              <strong>Schedule:</strong> Daily at 2 PM UTC
            </p>
            <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
              This is your daily digest from AI Competitive Monitor.<br>
              To adjust settings, update your GitHub Actions secrets.
            </p>
          </div>
        </body>
        </html>
      `;
      
      // Send email
      if (await this.sendEmail(subject, html)) {
        console.log('✅ Daily digest sent successfully');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error sending daily digest:', error);
      return false;
    }
  }

  /**
   * Send health check email
   */
  async sendHealthCheck() {
    console.log('🏥 Sending health check email...');
    
    try {
      // Test database connection
      const dbTest = await db.get(`SELECT NOW() as time, version() as version`);
      
      // Test email configuration
      const emailConfigured = this.isConfigured;
      
      // Get system stats
      const stats = await db.get(`
        SELECT 
          (SELECT COUNT(*) FROM intelligence.companies) as companies,
          (SELECT COUNT(*) FROM intelligence.urls) as urls,
          (SELECT COUNT(*) FROM intelligence.changes) as total_changes,
          (SELECT COUNT(*) FROM intelligence.changes WHERE detected_at > NOW() - INTERVAL '7 days') as recent_changes
      `);
      
      const subject = '🏥 AI Monitor Health Check - All Systems Operational';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🏥 System Health Check</h2>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          
          <h3>✅ Database Status</h3>
          <ul>
            <li>Connection: ✅ Active</li>
            <li>Database Time: ${dbTest.time}</li>
            <li>Version: ${dbTest.version}</li>
          </ul>
          
          <h3>📊 System Statistics</h3>
          <ul>
            <li>Companies Monitored: ${stats.companies}</li>
            <li>URLs Tracked: ${stats.urls}</li>
            <li>Total Changes: ${stats.total_changes}</li>
            <li>Recent Changes (7 days): ${stats.recent_changes}</li>
          </ul>
          
          <h3>📧 Email Configuration</h3>
          <ul>
            <li>SMTP Configured: ${emailConfigured ? '✅' : '❌'}</li>
            <li>Recipient: ${this.recipient}</li>
            <li>Test Mode: ${this.testMode ? 'Yes' : 'No'}</li>
          </ul>
          
          <p style="margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 10px;">
            All systems are operational. This health check confirms that database connections, 
            email configuration, and monitoring systems are functioning correctly.
          </p>
        </body>
        </html>
      `;
      
      if (await this.sendEmail(subject, html)) {
        console.log('✅ Health check email sent');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error in health check:', error);
      
      // Try to send error notification
      const errorEmail = `
        <html><body>
          <h2>❌ Health Check Failed</h2>
          <p>Error: ${error.message}</p>
          <p>Time: ${new Date().toISOString()}</p>
        </body></html>
      `;
      
      await this.sendEmail('❌ AI Monitor Health Check - FAILURE', errorEmail);
      return false;
    }
  }

  /**
   * Send email or save to file in test mode
   */
  async sendEmail(subject, html) {
    if (this.testMode) {
      // Save to file in test mode
      const filename = `test-email-${Date.now()}.html`;
      const dir = path.join(__dirname, 'test-emails');
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(dir, filename), html);
      console.log(`📧 Test mode: Email saved to ${filename}`);
      return true;
    }
    
    if (!this.isConfigured) {
      console.log('📧 Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
      return false;
    }
    
    try {
      const info = await this.transporter.sendMail({
        from: this.sender,
        to: this.recipient,
        subject: subject,
        html: html
      });
      
      console.log(`📧 Email sent: ${info.messageId}`);
      return true;
      
    } catch (error) {
      console.error('📧 Error sending email:', error);
      return false;
    }
  }

  /**
   * Mark changes as emailed
   */
  async markAsEmailed(changeIds) {
    if (!changeIds || changeIds.length === 0) return;
    
    try {
      await db.run(`
        UPDATE intelligence.changes 
        SET email_sent = true 
        WHERE id = ANY($1)
      `, [changeIds]);
      
      console.log(`Marked ${changeIds.length} changes as emailed`);
    } catch (error) {
      console.error('Error marking changes as emailed:', error);
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || 'test';
  const service = new PostgresEmailNotificationService();
  
  console.log(`\n🚀 Email Notification Service (PostgreSQL)`);
  console.log(`Command: ${command}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  let success = false;
  
  switch (command) {
    case 'immediate':
      success = await service.sendImmediateAlert();
      break;
      
    case 'daily':
      success = await service.sendDailyDigest();
      break;
      
    case 'health':
      success = await service.sendHealthCheck();
      break;
      
    case 'test':
      console.log('📧 Email Configuration Test');
      console.log(`SMTP Host: ${process.env.SMTP_HOST || 'Not set'}`);
      console.log(`SMTP User: ${process.env.SMTP_USER || 'Not set'}`);
      console.log(`Recipient: ${service.recipient}`);
      console.log(`Configured: ${service.isConfigured ? 'Yes' : 'No'}`);
      
      if (service.isConfigured) {
        // Send test email
        const testHtml = `
          <html><body>
            <h2>🧪 Test Email</h2>
            <p>This is a test email from AI Competitive Monitor.</p>
            <p>Time: ${new Date().toISOString()}</p>
            <p>If you receive this, email notifications are working correctly!</p>
          </body></html>
        `;
        success = await service.sendEmail('🧪 AI Monitor Test Email', testHtml);
      }
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Available commands: immediate, daily, health, test');
      process.exit(1);
  }
  
  // Cleanup
  await end();
  
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PostgresEmailNotificationService;