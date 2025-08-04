#!/usr/bin/env node

/**
 * Fix all static data generators to handle the new enhanced analyzer structure
 */

const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
    'generate-static-data-three-db-postgres-with-contexts.js',
    'generate-static-data-three-db-postgres-enhanced.js',
    'generate-static-data-three-db-postgres-fixed.js',
    'generate-static-data-three-db-postgres-with-fallback.js'
];

// The new function implementation
const newFunction = `// Helper function to get entities with fallback (UPDATED FOR ENHANCED ANALYZER)
async function getTopEntitiesWithFallback(companyName, category, entityType, limit = 5) {
    try {
        // First try to get from database
        const analyses = await db.all(\`
            SELECT ba.entities
            FROM intelligence.baseline_analysis ba
            WHERE ba.company = $1
            AND ba.entities IS NOT NULL
            ORDER BY ba.analysis_date DESC
            LIMIT 10
        \`, [companyName]);
        
        const allEntities = [];
        for (const analysis of analyses) {
            try {
                const data = analysis.entities;
                
                // Handle new enhanced analyzer structure
                if (data) {
                    // Map entity types to the new structure
                    let items = [];
                    
                    if (entityType === 'technologies') {
                        // Technologies are now in attributes.technologies
                        if (data.technologies && Array.isArray(data.technologies)) {
                            // Old structure compatibility
                            items = data.technologies;
                        } else if (data.attributes && data.attributes.technologies) {
                            // New structure
                            items = data.attributes.technologies;
                        } else {
                            // Check if technologies were merged into top level
                            items = data.technologies || [];
                        }
                    } else if (entityType === 'products') {
                        // Products are in entities.products
                        if (data.products && Array.isArray(data.products)) {
                            items = data.products;
                        } else if (data.entities && data.entities.products) {
                            items = data.entities.products;
                        }
                    } else if (entityType === 'ai_ml_concepts') {
                        // Concepts are now in attributes.concepts
                        if (data.ai_ml_concepts && Array.isArray(data.ai_ml_concepts)) {
                            // Old structure compatibility
                            items = data.ai_ml_concepts;
                        } else if (data.attributes && data.attributes.concepts) {
                            // New structure
                            items = data.attributes.concepts;
                        } else if (data.concepts) {
                            // Check if concepts were merged into top level
                            items = data.concepts;
                        }
                    }
                    
                    // Process items based on their structure
                    items.forEach(item => {
                        if (item) {
                            if (typeof item === 'string') {
                                allEntities.push(item);
                            } else if (item.name) {
                                allEntities.push(item.name);
                            }
                        }
                    });
                }
            } catch (e) {
                console.error(\`Error processing entities for \${companyName}:\`, e);
            }
        }
        
        // If we got data, use it
        if (allEntities.length > 0) {
            // Count occurrences and sort by frequency
            const entityCounts = {};
            allEntities.forEach(entity => {
                const key = (entity || '').toString().toLowerCase().trim();
                if (key) {
                    entityCounts[key] = (entityCounts[key] || 0) + 1;
                }
            });
            
            return Object.entries(entityCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([entity]) => entity);
        }
    } catch (e) {
        console.error(\`Error getting entities for \${companyName}:\`, e);
    }
    
    // Fallback to predefined data
    console.log(\`Using fallback entities for \${companyName} (\${entityType})\`);
    
    // Check company-specific data first
    if (COMPANY_SPECIFIC_ENTITIES[companyName] && COMPANY_SPECIFIC_ENTITIES[companyName][entityType]) {
        return COMPANY_SPECIFIC_ENTITIES[companyName][entityType].slice(0, limit);
    }
    
    // Then check category-based data
    const categoryData = FALLBACK_ENTITIES[category] || FALLBACK_ENTITIES['default'];
    return (categoryData[entityType] || []).slice(0, limit);
}`;

// Process each file
filesToFix.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${filename} not found, skipping...`);
        return;
    }
    
    console.log(`📝 Processing ${filename}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find the function and replace it
    const functionRegex = /\/\/ Helper function to get entities with fallback.*?\n}(?=\n\n\/\/|$)/s;
    
    if (content.match(functionRegex)) {
        const newContent = content.replace(functionRegex, newFunction);
        
        // Backup the original
        fs.writeFileSync(filePath + '.backup-' + Date.now(), content);
        
        // Write the updated version
        fs.writeFileSync(filePath, newContent);
        
        console.log(`✅ Updated ${filename}`);
    } else {
        console.log(`⚠️  Could not find function in ${filename}`);
    }
});

console.log('\n✅ All generator files updated to handle new enhanced analyzer structure');
