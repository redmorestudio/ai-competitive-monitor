#!/usr/bin/env node

/**
 * PostgreSQL-based Email Notification System
 * Handles immediate alerts, daily digests, and health check emails
 * 
 * Usage:
 *   node email-notifications-postgres.js immediate  # Send high-priority alerts
 *   node email-notifications-postgres.js daily      # Send daily digest
 *   node email-notifications-postgres.js health     # Send health check
 *   node email-notifications-postgres.js test       # Test email configuration
 */

const nodemailer = require('nodemailer');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables in development
if (!process.env.GITHUB_ACTIONS && !process.env.DATABASE_URL) {
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('Note: dotenv not available, using environment variables');
  }
}

class PostgresEmailNotificationService {
  constructor() {
    // PostgreSQL connection
    this.dbConfig = {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
    
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

  async connectDB() {
    this.client = new Client(this.dbConfig);
    await this.client.connect();
  }

  async disconnectDB() {
    if (this.client) {
      await this.client.end();
    }
  }

  /**
   * Send immediate alert for high-priority changes
   */
  async sendImmediateAlert() {
    console.log('🚨 Checking for high-priority changes to alert on...');
    
    try {
      await this.connectDB();
      
      // Get high-priority changes from the last hour that haven't been emailed
      const query = `
        SELECT 
          cd.id,
          cd.company,
          cd.url,
          cd.url_name,
          cd.change_type,
          cd.interest_level,
          cd.ai_analysis as interest_data,
          cd.detected_at,
          ba.analysis_data,
          ba.entities_extracted
        FROM processed_content.change_detection cd
        LEFT JOIN intelligence.baseline_analysis ba 
          ON cd.company = ba.company AND cd.url = ba.url
        WHERE cd.detected_at > NOW() - INTERVAL '4 hours'
          AND cd.interest_level >= 8
          AND (cd.email_sent IS NULL OR cd.email_sent = false)
        ORDER BY cd.interest_level DESC, cd.detected_at DESC
        LIMIT 10
      `;
      
      const result = await this.client.query(query);
      
      if (result.rows.length === 0) {
        console.log('✅ No high-priority changes found. No alert needed.');
        return true;
      }
      
      console.log(`Found ${result.rows.length} high-priority changes to alert on!`);
      
      // Build email content
      const changes = result.rows;
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
        const interestData = typeof change.interest_data === 'string' ? 
          JSON.parse(change.interest_data || '{}') : (change.interest_data || {});
        const analysisData = change.analysis_data || {};
        
        html += `
          <div class="change-card high-priority">
            <div>
              <span class="company-name">${change.company}</span>
              <span class="interest-badge interest-${change.interest_level}">Interest: ${change.interest_level}/10</span>
            </div>
            
            <div class="summary">
              <strong>Page:</strong> ${change.url_name || 'Change detected'}
            </div>
            
            <div style="margin: 10px 0;">
              <strong>Type:</strong> ${change.change_type || 'content_change'}<br>
              <strong>URL:</strong> <a href="${change.url}">${change.url}</a><br>
              <strong>Detected:</strong> ${new Date(change.detected_at).toLocaleString()}<br>
            </div>
        `;
        
        // Add scoring details if available
        if (interestData.technical_innovation || interestData.business_impact) {
          html += `
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px;">
              <strong>Scoring:</strong><br>
              Technical Innovation: ${interestData.technical_innovation || 'N/A'}/10<br>
              Business Impact: ${interestData.business_impact || 'N/A'}/10<br>
              ${interestData.reason ? `<br><strong>Reason:</strong> ${interestData.reason}` : ''}
            </div>
          `;
        }
        
        // Add AI analysis if available
        if (analysisData.summary || analysisData.key_insights) {
          html += `
            <div style="margin: 10px 0; padding: 10px; background: #e8f4f8; border-radius: 5px;">
              <strong>AI Analysis:</strong><br>
              ${analysisData.summary || analysisData.key_insights || 'Analysis pending...'}
            </div>
          `;
        }
        
        html += `</div>`;
      }
      
      html += `
          <div class="footer">
            <p><strong>View Full Dashboard:</strong> <a href="https://redmorestudio.github.io/ai-competitive-monitor/">AI Competitive Monitor</a></p>
            <p style="color: #666; font-size: 0.9em;">
              This alert was triggered because these changes scored 8 or higher on our interest scale.<br>
              You're receiving this because you're subscribed to high-priority AI industry updates.
            </p>
          </div>
        </body>
        </html>
      `;
      
      // Send email
      const sent = await this.sendEmail(subject, html);
      
      if (sent) {
        // Mark changes as emailed
        const changeIds = changes.map(c => c.id);
        await this.client.query(
          `UPDATE processed_content.change_detection 
           SET email_sent = true, email_sent_at = NOW() 
           WHERE id = ANY($1)`,
          [changeIds]
        );
        console.log(`✅ Alert email sent for ${changes.length} high-priority changes`);
      }
      
      return sent;
      
    } catch (error) {
      console.error('❌ Error sending immediate alert:', error);
      return false;
    } finally {
      await this.disconnectDB();
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest() {
    console.log('📊 Generating daily digest email...');
    
    try {
      await this.connectDB();
      
      // Get all changes from the last 24 hours
      const changesQuery = `
        SELECT 
          cd.company,
          cd.url,
          cd.url_name,
          cd.change_type,
          cd.interest_level,
          cd.ai_analysis as interest_data,
          cd.detected_at,
          ba.analysis_data
        FROM processed_content.change_detection cd
        LEFT JOIN intelligence.baseline_analysis ba 
          ON cd.new_content_id = ba.content_id
        WHERE cd.detected_at > NOW() - INTERVAL '24 hours'
        ORDER BY cd.interest_level DESC, cd.detected_at DESC
      `;
      
      const changesResult = await this.client.query(changesQuery);
      
      // Get system statistics
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT company) as companies_with_changes,
          COUNT(*) as total_changes,
          AVG(interest_level) as avg_interest,
          MAX(interest_level) as max_interest,
          COUNT(CASE WHEN interest_level >= 8 THEN 1 END) as high_priority_count,
          COUNT(CASE WHEN interest_level >= 5 AND interest_level < 8 THEN 1 END) as medium_priority_count,
          COUNT(CASE WHEN interest_level < 5 THEN 1 END) as low_priority_count
        FROM processed_content.change_detection
        WHERE detected_at > NOW() - INTERVAL '24 hours'
      `;
      
      const statsResult = await this.client.query(statsQuery);
      const stats = statsResult.rows[0];
      
      // Get monitoring health stats
      const healthQuery = `
        SELECT 
          COUNT(DISTINCT company) as companies_monitored,
          COUNT(DISTINCT url) as urls_checked,
          COUNT(*) as total_checks,
          SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful_checks,
          SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as blocked_checks,
          MAX(scraped_at) as last_check_time
        FROM raw_content.scraped_pages
        WHERE scraped_at > NOW() - INTERVAL '24 hours'
      `;
      
      const healthResult = await this.client.query(healthQuery);
      const health = healthResult.rows[0];
      
      // Build email content
      const changes = changesResult.rows;
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const subject = `📊 AI Monitor Daily Report - ${changes.length} Changes Detected - ${today}`;
      
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
              <div class="stat-number">${Math.round((health.successful_checks / health.total_checks) * 100)}%</div>
              <div>Success Rate</div>
            </div>
          </div>
          
          <h2>🔍 Monitoring Health</h2>
          <ul>
            <li><strong>Companies Monitored:</strong> ${health.companies_monitored}</li>
            <li><strong>URLs Checked:</strong> ${health.urls_checked}</li>
            <li><strong>Successful Checks:</strong> ${health.successful_checks}/${health.total_checks}</li>
            <li><strong>Blocked by Captcha:</strong> ${health.blocked_checks || 0}</li>
            <li><strong>Last Check:</strong> ${new Date(health.last_check_time).toLocaleString()}</li>
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
            html += `
              <div class="change-item high-priority">
                <strong>${change.company_name}</strong> - Interest: ${change.interest_level}/10<br>
                ${change.summary || 'Change detected'}<br>
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
          `;
          
          for (const change of mediumPriority.slice(0, 3)) {
            html += `
              <div class="change-item medium-priority">
                <strong>${change.company_name}</strong> - Interest: ${change.interest_level}/10<br>
                ${change.summary || 'Change detected'}<br>
                <small><a href="${change.url}">View</a></small>
              </div>
            `;
          }
          
          if (mediumPriority.length > 3) {
            html += `<p><em>...and ${mediumPriority.length - 3} more medium-priority changes</em></p>`;
          }
          
          html += `</div>`;
        }
        
        if (lowPriority.length > 0) {
          html += `
            <div class="change-section">
              <h2>📝 Low Priority Changes (${lowPriority.length})</h2>
              <p>Minor updates detected on ${lowPriority.length} pages.</p>
            </div>
          `;
        }
      } else {
        html += `
          <div class="change-section">
            <h2>✅ No Changes Detected</h2>
            <p>No significant changes were detected in the last 24 hours. All monitored companies appear stable.</p>
          </div>
        `;
      }
      
      html += `
          <div class="footer">
            <p><strong>Full Dashboard:</strong> <a href="https://redmorestudio.github.io/ai-competitive-monitor/">View AI Competitive Monitor</a></p>
            <p style="color: #666; font-size: 0.9em;">
              This is your daily digest of AI industry changes.<br>
              High-priority alerts (8+ interest) are sent immediately when detected.
            </p>
          </div>
        </body>
        </html>
      `;
      
      // Send email
      const sent = await this.sendEmail(subject, html);
      
      if (sent) {
        console.log(`✅ Daily digest sent with ${changes.length} changes`);
      }
      
      return sent;
      
    } catch (error) {
      console.error('❌ Error sending daily digest:', error);
      return false;
    } finally {
      await this.disconnectDB();
    }
  }

  /**
   * Send health check email
   */
  async sendHealthCheck() {
    console.log('✅ Sending health check email...');
    
    try {
      await this.connectDB();
      
      // Get system health metrics
      const healthQuery = `
        WITH recent_activity AS (
          SELECT 
            COUNT(DISTINCT company) as companies_monitored,
            COUNT(DISTINCT url) as urls_checked,
            COUNT(*) as total_checks,
            SUM(CASE WHEN scrape_status = 'success' THEN 1 ELSE 0 END) as successful_checks,
            SUM(CASE WHEN scrape_status = 'blocked' THEN 1 ELSE 0 END) as blocked_checks,
            SUM(CASE WHEN scrape_status = 'error' THEN 1 ELSE 0 END) as error_checks,
            MAX(scraped_at) as last_check_time,
            MIN(scraped_at) as first_check_time
          FROM raw_content.scraped_pages
          WHERE scraped_at > NOW() - INTERVAL '24 hours'
        ),
        change_activity AS (
          SELECT 
            COUNT(*) as changes_detected,
            AVG(interest_level) as avg_interest
          FROM processed_content.change_detection
          WHERE detected_at > NOW() - INTERVAL '24 hours'
        ),
        analysis_activity AS (
          SELECT 
            COUNT(*) as analyses_completed
          FROM intelligence.baseline_analysis
          WHERE created_at > NOW() - INTERVAL '24 hours'
        )
        SELECT 
          r.*,
          c.changes_detected,
          c.avg_interest,
          a.analyses_completed
        FROM recent_activity r
        CROSS JOIN change_activity c
        CROSS JOIN analysis_activity a
      `;
      
      const result = await this.client.query(healthQuery);
      const health = result.rows[0];
      
      // Calculate success rate
      const successRate = health.total_checks > 0 
        ? Math.round((health.successful_checks / health.total_checks) * 100)
        : 0;
      
      // Determine health status
      let healthStatus = '✅ All Systems Operational';
      let statusColor = '#44aa44';
      
      if (successRate < 50) {
        healthStatus = '🔴 Critical Issues Detected';
        statusColor = '#ff4444';
      } else if (successRate < 80) {
        healthStatus = '🟡 Minor Issues Detected';
        statusColor = '#ffaa44';
      } else if (health.total_checks === 0) {
        healthStatus = '⚠️ No Activity Detected';
        statusColor = '#ff8844';
      }
      
      const subject = `${healthStatus.split(' ')[0]} AI Monitor Health Check - ${new Date().toLocaleDateString()}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 10px; }
            .metric { background: #f9f9f9; padding: 10px; margin: 10px 0; border-radius: 5px; }
            .metric-label { font-weight: bold; color: #666; }
            .metric-value { font-size: 1.2em; color: #333; }
            .footer { margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${healthStatus}</h1>
            <p>AI Competitive Monitor - System Health Report</p>
          </div>
          
          <h2>📊 24-Hour Activity Summary</h2>
          
          <div class="metric">
            <span class="metric-label">Monitoring Period:</span>
            <span class="metric-value">${new Date(health.first_check_time).toLocaleString()} - ${new Date(health.last_check_time).toLocaleString()}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">Companies Monitored:</span>
            <span class="metric-value">${health.companies_monitored}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">URLs Checked:</span>
            <span class="metric-value">${health.urls_checked}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">Total Checks Performed:</span>
            <span class="metric-value">${health.total_checks}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">Success Rate:</span>
            <span class="metric-value">${successRate}% (${health.successful_checks}/${health.total_checks})</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">Blocked by Captcha:</span>
            <span class="metric-value">${health.blocked_checks || 0}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">Errors:</span>
            <span class="metric-value">${health.error_checks || 0}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">Changes Detected:</span>
            <span class="metric-value">${health.changes_detected || 0}</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">AI Analyses Completed:</span>
            <span class="metric-value">${health.analyses_completed || 0}</span>
          </div>
          
          <div class="footer">
            <p><strong>Status:</strong> ${healthStatus}</p>
            <p>This is an automated health check from your AI Competitive Intelligence Monitor.</p>
            <p><a href="https://redmorestudio.github.io/ai-competitive-monitor/">View Dashboard</a></p>
          </div>
        </body>
        </html>
      `;
      
      // Send email
      const sent = await this.sendEmail(subject, html);
      
      if (sent) {
        console.log(`✅ Health check email sent - Status: ${healthStatus}`);
      }
      
      return sent;
      
    } catch (error) {
      console.error('❌ Error sending health check:', error);
      return false;
    } finally {
      await this.disconnectDB();
    }
  }

  /**
   * Test email configuration
   */
  async sendTestEmail() {
    console.log('🧪 Testing email configuration...');
    
    const subject = '🧪 AI Monitor - Test Email';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }
          .content { padding: 20px; }
          .success { color: #44aa44; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧪 Email Configuration Test</h1>
        </div>
        <div class="content">
          <p class="success">✅ Email configuration is working correctly!</p>
          <p>This test email confirms that your SMTP settings are properly configured.</p>
          <h3>Configuration Details:</h3>
          <ul>
            <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT || 587}</li>
            <li><strong>From:</strong> ${this.sender}</li>
            <li><strong>To:</strong> ${this.recipient}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>The AI Competitive Monitor email notification system is ready to send alerts.</p>
        </div>
      </body>
      </html>
    `;
    
    const sent = await this.sendEmail(subject, html);
    
    if (sent) {
      console.log('✅ Test email sent successfully!');
    }
    
    return sent;
  }

  /**
   * Send email helper
   */
  async sendEmail(subject, html) {
    if (!this.isConfigured && !this.testMode) {
      console.log('❌ Email not configured. Set SMTP_* environment variables.');
      console.log('Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
      console.log('Optional: SMTP_PORT, SMTP_SECURE, NOTIFICATION_EMAIL');
      return false;
    }
    
    try {
      const mailOptions = {
        from: `AI Monitor <${this.sender}>`,
        to: this.recipient,
        subject: subject,
        html: html
      };
      
      if (this.testMode) {
        // Save to file in test mode
        const testDir = path.join(__dirname, 'test-emails');
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        
        const filename = `email-${Date.now()}.html`;
        const filepath = path.join(testDir, filename);
        
        const testEmail = `
          Subject: ${subject}
          From: ${mailOptions.from}
          To: ${mailOptions.to}
          Date: ${new Date().toISOString()}
          
          ${html}
        `;
        
        fs.writeFileSync(filepath, testEmail);
        console.log(`📧 Test mode: Email saved to ${filepath}`);
        return true;
      }
      
      // Send actual email
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent: ${info.messageId}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }
}

// Main execution
async function main() {
  const service = new PostgresEmailNotificationService();
  const command = process.argv[2] || 'test';
  
  console.log(`\n🚀 AI Monitor Email Notification Service`);
  console.log(`Command: ${command}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  let success = false;
  
  switch (command.toLowerCase()) {
    case 'immediate':
    case 'alert':
      success = await service.sendImmediateAlert();
      break;
      
    case 'daily':
    case 'digest':
      success = await service.sendDailyDigest();
      break;
      
    case 'health':
    case 'check':
      success = await service.sendHealthCheck();
      break;
      
    case 'test':
      success = await service.sendTestEmail();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('\nUsage:');
      console.log('  node email-notifications-postgres.js immediate  # Send high-priority alerts');
      console.log('  node email-notifications-postgres.js daily      # Send daily digest');
      console.log('  node email-notifications-postgres.js health     # Send health check');
      console.log('  node email-notifications-postgres.js test       # Test email configuration');
      process.exit(1);
  }
  
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
