#!/usr/bin/env node

/**
 * Update GitHub Actions Workflow for Entity Grouping
 * This script updates the sync-deploy-postgres.yml workflow to include entity grouping
 */

const fs = require('fs');
const path = require('path');

function updateWorkflow() {
    console.log('Updating GitHub Actions workflow for entity grouping...\n');
    
    const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'sync-deploy-postgres.yml');
    const backupPath = `${workflowPath}.backup-${Date.now()}`;
    
    try {
        // Create backup
        if (fs.existsSync(workflowPath)) {
            fs.copyFileSync(workflowPath, backupPath);
            console.log(`✅ Created backup: ${backupPath}`);
        }
        
        // Read current workflow
        let workflowContent = fs.readFileSync(workflowPath, 'utf8');
        
        // Find the static data generation step
        const staticDataStepRegex = /- name: Generate static data files \(PostgreSQL\)[\s\S]*?(?=- name:)/;
        
        // Create the entity grouping step
        const entityGroupingStep = `      - name: Apply entity groupings (PostgreSQL)
        run: |
          cd github-actions-backend
          
          echo "🔄 Applying entity groupings to reduce entity count..."
          
          # Check if entity grouping is already applied
          ENTITY_COUNT=$(node -e "
            require('dotenv').config();
            const { db } = require('./postgres-db');
            db.get('SELECT COUNT(*) as count FROM intelligence.entity_groups')
              .then(r => { console.log(r.count); process.exit(0); })
              .catch(() => { console.log('0'); process.exit(0); });
          " 2>/dev/null || echo "0")
          
          if [ "$ENTITY_COUNT" -eq "0" ]; then
            echo "📊 No entity groups found, applying groupings..."
            
            # Run entity grouping scripts
            if [ -f "apply-entity-groupings.js" ]; then
              echo "Step 1: Creating entity groups..."
              node apply-entity-groupings.js || echo "⚠️  Entity grouping failed, continuing..."
            fi
            
            if [ -f "handle-company-entities.js" ]; then
              echo "Step 2: Handling company entities..."
              node handle-company-entities.js || echo "⚠️  Company handling failed, continuing..."
            fi
            
            if [ -f "update-entity-group-types.js" ]; then
              echo "Step 3: Updating entity types..."
              node update-entity-group-types.js || echo "⚠️  Type update failed, continuing..."
            fi
          else
            echo "✅ Found $ENTITY_COUNT entity groups already configured"
          fi
          
          # Generate entity group data
          if [ -f "update-static-data-entity-groups.js" ]; then
            echo "📊 Generating entity group data for dashboard..."
            node update-static-data-entity-groups.js || echo "⚠️  Entity data generation failed"
          fi
        env:
          POSTGRES_CONNECTION_STRING: \${{ secrets.POSTGRES_CONNECTION_STRING }}
      
      `;
        
        // Insert entity grouping step before static data generation
        workflowContent = workflowContent.replace(
            '- name: Generate static data files (PostgreSQL)',
            entityGroupingStep + '- name: Generate static data files (PostgreSQL)'
        );
        
        // Update the static data generation step to use grouped contexts
        const updatedStaticDataStep = workflowContent.replace(
            /if \[ -f "generate-static-data-three-db-postgres-with-contexts\.js" \]; then[\s\S]*?echo "Using CONTEXT-ENABLED static data generator with source navigation\.\.\."/,
            `if [ -f "generate-static-data-three-db-postgres-with-contexts.js" ]; then
            echo "Using CONTEXT-ENABLED static data generator with source navigation..."
            
            # Generate grouped entity contexts first
            if [ -f "generate-entity-contexts-grouped.js" ]; then
              echo "📊 Generating contexts for grouped entities..."
              node generate-entity-contexts-grouped.js || echo "⚠️  Grouped context generation failed"
            fi`
        );
        
        // Write updated workflow
        fs.writeFileSync(workflowPath, updatedStaticDataStep);
        console.log('✅ Workflow updated successfully!');
        
        // Create a summary of changes
        const summary = `# GitHub Actions Workflow Update Summary

## File Updated
- .github/workflows/sync-deploy-postgres.yml

## Changes Made
1. Added "Apply entity groupings" step before static data generation
2. Step checks if entity groups already exist (avoids re-running)
3. Runs three entity grouping scripts in sequence:
   - apply-entity-groupings.js
   - handle-company-entities.js
   - update-entity-group-types.js
4. Generates entity-groups.json for dashboard
5. Updated static data generation to use grouped contexts

## Benefits
- Reduces entity processing from 3,260 to ~800
- Faster context generation
- Better dashboard and 3D graph performance
- Smart filtering for visualizations

## Next Steps
1. Commit and push workflow changes
2. Run workflow manually to test
3. Monitor for any issues
4. Verify entity-groups.json is created in api-data/
`;
        
        fs.writeFileSync(path.join(__dirname, '..', 'WORKFLOW-UPDATE-SUMMARY.md'), summary);
        console.log('✅ Created WORKFLOW-UPDATE-SUMMARY.md');
        
    } catch (error) {
        console.error('Error updating workflow:', error);
        
        // Restore backup if error
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, workflowPath);
            console.log('❌ Error occurred, restored backup');
        }
        
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    updateWorkflow();
}

module.exports = { updateWorkflow };
