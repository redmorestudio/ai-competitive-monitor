#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Generate Company Details JSON for PostgreSQL
 * Creates a company-details.json file with company statistics and URLs
 */

const fs = require('fs');
const path = require('path');
const { db, end } = require('./postgres-db');

const OUTPUT_DIR = path.join(__dirname, '..', 'api-data');

async function generateCompanyDetails() {
    console.log('Generating company-details.json from PostgreSQL...');
    
    try {
        // Get all companies
        const companies = await db.all(`
            SELECT DISTINCT c.id, c.name, c.category
            FROM intelligence.companies c
            ORDER BY c.name
        `);
        
        const companyDetails = {
            companies: {},
            lastUpdated: new Date().toISOString()
        };
        
        // Process each company
        for (const company of companies) {
            console.log(`Processing ${company.name}...`);
            
            // Get company URLs
            const urls = await db.all(`
                SELECT u.id, u.url, u.url_type as category
                FROM intelligence.urls u
                WHERE u.company_id = $1
                ORDER BY u.url
            `, [company.id]);
            
            // Get company statistics
            const stats = await db.get(`
                SELECT 
                    COUNT(DISTINCT ch.id) as total_changes,
                    COUNT(DISTINCT CASE WHEN ch.detected_at > NOW() - INTERVAL '7 days' THEN ch.id END) as changes_7d,
                    COUNT(DISTINCT CASE WHEN ch.detected_at > NOW() - INTERVAL '30 days' THEN ch.id END) as changes_30d,
                    AVG(ch.interest_level) as avg_interest_level,
                    MAX(ch.detected_at) as last_change
                FROM intelligence.changes ch
                WHERE ch.company = $1
            `, [company.name]);
            
            // Format URLs for compatibility
            const formattedUrls = urls.map(u => ({
                id: u.id,
                url: u.url,
                name: u.category || 'Homepage',
                category: u.category || 'main'
            }));
            
            companyDetails.companies[company.name] = {
                id: company.id,
                name: company.name,
                category: company.category,
                urls: formattedUrls,
                stats: {
                    total_changes: stats.total_changes || 0,
                    changes_7d: stats.changes_7d || 0,
                    changes_30d: stats.changes_30d || 0,
                    avg_interest_level: stats.avg_interest_level || 0,
                    last_change: stats.last_change
                }
            };
        }
        
        // Write the file
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'company-details.json'),
            JSON.stringify(companyDetails, null, 2)
        );
        
        console.log(`✅ Generated company-details.json with ${Object.keys(companyDetails.companies).length} companies`);
        
    } catch (error) {
        console.error('Error generating company details:', error);
        throw error;
    } finally {
        await end();
    }
}

// Run if called directly
if (require.main === module) {
    generateCompanyDetails();
}

module.exports = { generateCompanyDetails };
