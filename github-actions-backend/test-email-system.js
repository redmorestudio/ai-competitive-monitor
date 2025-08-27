#!/usr/bin/env node

/**
 * Test the email system locally
 */

const { db, end } = require('./postgres-db');

async function testEmailSystem() {
  console.log('🧪 Testing Email System Components\n');
  console.log('=' .repeat(50));
  
  try {
    // 1. Test database connection
    console.log('\n1️⃣ Testing Database Connection...');
    const dbTest = await db.get(`SELECT NOW() as time, COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'intelligence'`);
    console.log(`   ✅ Database connected`);
    console.log(`   - Time: ${dbTest.time}`);
    console.log(`   - Intelligence tables: ${dbTest.table_count}`);
    
    // 2. Check for recent high-interest changes
    console.log('\n2️⃣ Checking for High-Interest Changes...');
    const highInterest = await db.all(`
      SELECT 
        id,
        company,
        interest_level,
        detected_at,
        email_sent
      FROM intelligence.changes
      WHERE interest_level >= 8
      ORDER BY detected_at DESC
      LIMIT 5
    `);
    
    console.log(`   Found ${highInterest.length} high-interest changes:`);
    highInterest.forEach(change => {
      console.log(`   - ${change.company}: Level ${change.interest_level} (${new Date(change.detected_at).toLocaleDateString()}) ${change.email_sent ? '[EMAILED]' : '[NOT EMAILED]'}`);
    });
    
    // 3. Check email configuration
    console.log('\n3️⃣ Checking Email Configuration...');
    const emailConfig = {
      SMTP_HOST: process.env.SMTP_HOST ? '✅ Set' : '❌ Not set',
      SMTP_USER: process.env.SMTP_USER ? '✅ Set' : '❌ Not set', 
      SMTP_PASS: process.env.SMTP_PASS ? '✅ Set' : '❌ Not set',
      NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER || 'seth@redmore.studio'
    };
    
    console.log('   Email configuration:');
    Object.entries(emailConfig).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
    
    const isConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    
    // 4. Get daily digest stats
    console.log('\n4️⃣ Daily Digest Statistics...');
    const dailyStats = await db.get(`
      SELECT 
        COUNT(*) as changes_24h,
        COUNT(DISTINCT company) as companies_24h,
        COUNT(CASE WHEN interest_level >= 8 THEN 1 END) as high_priority,
        COUNT(CASE WHEN interest_level >= 5 AND interest_level < 8 THEN 1 END) as medium_priority
      FROM intelligence.changes
      WHERE detected_at > NOW() - INTERVAL '24 hours'
    `);
    
    console.log(`   Changes in last 24 hours: ${dailyStats.changes_24h}`);
    console.log(`   - High priority (8+): ${dailyStats.high_priority}`);
    console.log(`   - Medium priority (5-7): ${dailyStats.medium_priority}`);
    console.log(`   - Companies affected: ${dailyStats.companies_24h}`);
    
    // 5. Interest level distribution
    console.log('\n5️⃣ Interest Level Distribution...');
    const distribution = await db.all(`
      SELECT 
        interest_level,
        COUNT(*) as count
      FROM intelligence.changes
      WHERE detected_at > NOW() - INTERVAL '7 days'
      GROUP BY interest_level
      ORDER BY interest_level DESC
    `);
    
    console.log('   Last 7 days:');
    distribution.forEach(level => {
      const bar = '█'.repeat(Math.min(50, level.count));
      console.log(`   Level ${String(level.interest_level).padStart(2)}: ${bar} (${level.count})`);
    });
    
    // 6. Test email sending (dry run)
    console.log('\n6️⃣ Testing Email Service...');
    if (isConfigured) {
      console.log('   ✅ Email service is configured');
      console.log('   Run these commands to test:');
      console.log('     node email-notifications-postgres-fixed.js test      # Send test email');
      console.log('     node email-notifications-postgres-fixed.js immediate # Check for alerts');
      console.log('     node email-notifications-postgres-fixed.js daily     # Send daily digest');
      console.log('     node email-notifications-postgres-fixed.js health    # Send health check');
    } else {
      console.log('   ❌ Email service NOT configured');
      console.log('   To enable emails, set these environment variables:');
      console.log('     export SMTP_HOST=smtp.gmail.com');
      console.log('     export SMTP_PORT=587');
      console.log('     export SMTP_USER=your-email@gmail.com');
      console.log('     export SMTP_PASS=your-app-password');
      console.log('     export NOTIFICATION_EMAIL=recipient@example.com');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 SUMMARY\n');
    
    const issues = [];
    if (!isConfigured) issues.push('Email not configured');
    if (highInterest.filter(c => !c.email_sent).length > 0) issues.push('Unemailed high-interest changes found');
    if (dailyStats.changes_24h === 0) issues.push('No changes in last 24 hours');
    
    if (issues.length === 0) {
      console.log('✅ All systems operational!');
    } else {
      console.log('⚠️  Issues detected:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS FOR INTEREST LEVEL TUNING\n');
    
    const avgInterest = await db.get(`
      SELECT AVG(interest_level) as avg_level
      FROM intelligence.changes
      WHERE detected_at > NOW() - INTERVAL '7 days'
    `);
    
    if (avgInterest.avg_level > 6) {
      console.log('   ⚠️  Average interest level is HIGH (${avgInterest.avg_level.toFixed(1)})');
      console.log('   Consider making the scoring more selective to reduce alert fatigue');
    } else if (avgInterest.avg_level < 4) {
      console.log('   ⚠️  Average interest level is LOW (${avgInterest.avg_level.toFixed(1)})');
      console.log('   Consider adjusting scoring to better identify important changes');
    } else {
      console.log('   ✅ Interest levels appear well-balanced (avg: ${avgInterest.avg_level.toFixed(1)})');
    }
    
    console.log('\n   Current thresholds:');
    console.log('   - Immediate alerts: Interest ≥ 8');
    console.log('   - Daily digest: All changes');
    console.log('   - Health check: Daily system status');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await end();
  }
}

// Run test
testEmailSystem();