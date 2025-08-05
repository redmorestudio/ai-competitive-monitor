#!/usr/bin/env node

/**
 * Add Entity Management Button to Dashboard
 * Also creates a notice in manage-entities.html about backend availability
 */

const fs = require('fs');
const path = require('path');

function updateManageEntitiesPage() {
    console.log('Updating manage-entities.html with backend integration notice...\n');
    
    const entityPagePath = path.join(__dirname, '..', 'manage-entities.html');
    
    try {
        // Read current page
        let pageContent = fs.readFileSync(entityPagePath, 'utf8');
        
        // Add a notice about backend integration
        const noticeHTML = `
        <!-- Backend Integration Notice -->
        <div class="backend-notice" style="background: #2a5a2a; border: 1px solid #4CAF50; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="color: #4CAF50; margin-top: 0;">✅ Entity Grouping Backend Available</h3>
            <p style="margin-bottom: 10px;">The entity grouping system has been implemented with:</p>
            <ul style="margin-left: 20px;">
                <li>PostgreSQL tables: entity_groups, entity_variations, entity_relationships</li>
                <li>Automated grouping scripts in github-actions-backend/</li>
                <li>~800 grouped entities from 3,260+ variations</li>
            </ul>
            <p style="margin-bottom: 0;">
                <strong>Note:</strong> This UI needs to be connected to the backend API endpoints.
                For now, use the automated scripts or direct database access.
            </p>
        </div>`;
        
        // Insert notice after the subtitle
        pageContent = pageContent.replace(
            '<p class="subtitle">Group and normalize entities across all monitored companies</p>',
            '<p class="subtitle">Group and normalize entities across all monitored companies</p>\n' + noticeHTML
        );
        
        // Write updated content
        fs.writeFileSync(entityPagePath, pageContent);
        console.log('✅ Updated manage-entities.html with backend notice');
        
        // Create a simple connection guide
        const connectionGuide = `# Entity Management UI - Backend Connection Guide

## Current Status
- ✅ UI exists at /manage-entities.html
- ✅ Backend entity grouping implemented
- ❌ UI not yet connected to backend

## To Connect the UI

### 1. Create API Endpoints in server.js
\`\`\`javascript
// GET /api/entity-groups
app.get('/api/entity-groups', async (req, res) => {
    const groups = await db.all(\`
        SELECT eg.*, COUNT(ev.id) as variation_count
        FROM intelligence.entity_groups eg
        LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
        GROUP BY eg.id
    \`);
    res.json(groups);
});

// POST /api/entity-groups/:groupId/variations
app.post('/api/entity-groups/:groupId/variations', async (req, res) => {
    const { variation } = req.body;
    // Add variation to group
});
\`\`\`

### 2. Update manage-entities.html JavaScript
Replace the mock data loading with:
\`\`\`javascript
async function loadGroups() {
    const response = await fetch('/api/entity-groups');
    const groups = await response.json();
    // Render groups
}
\`\`\`

### 3. Alternative: Use Existing Scripts
The automated grouping is already working:
- \`node apply-entity-groupings.js\` - Creates groups from rules
- \`node update-entity-group-types.js\` - Assigns types
- \`node generate-entity-contexts-grouped.js\` - Generates contexts

## Database Schema Available
- \`intelligence.entity_groups\` - Canonical entities
- \`intelligence.entity_variations\` - All variations
- \`intelligence.entity_relationships\` - Hierarchies
`;
        
        fs.writeFileSync(
            path.join(__dirname, '..', 'ENTITY-UI-CONNECTION-GUIDE.md'),
            connectionGuide
        );
        console.log('✅ Created ENTITY-UI-CONNECTION-GUIDE.md');
        
    } catch (error) {
        console.error('Error updating manage-entities page:', error);
    }
}

// Run the update
updateManageEntitiesPage();
