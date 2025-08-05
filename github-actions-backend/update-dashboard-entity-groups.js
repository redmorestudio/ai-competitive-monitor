#!/usr/bin/env node

/**
 * Dashboard Entity Group Integration
 * Updates the dashboard to use entity groups instead of raw entities
 */

const fs = require('fs');
const path = require('path');

async function updateDashboardForEntityGroups() {
    console.log('Updating dashboard to use entity groups...\n');
    
    const dashboardPath = path.join(__dirname, '..', 'index.html');
    const backupPath = `${dashboardPath}.backup-${Date.now()}`;
    
    try {
        // Create backup
        if (fs.existsSync(dashboardPath)) {
            fs.copyFileSync(dashboardPath, backupPath);
            console.log(`✅ Created backup: ${backupPath}`);
        }
        
        // Read current dashboard
        let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        
        // Find the data loading section
        const dataLoadingRegex = /\/\/ Load all data files[\s\S]*?Promise\.all\(\[[\s\S]*?\]\)/;
        
        const newDataLoading = `// Load all data files
        const dataFiles = {
            summary: 'api-data/summary.json',
            companies: 'api-data/companies.json', 
            changes: 'api-data/latest-changes.json',
            entityGroups: 'api-data/entity-groups.json', // NEW: Entity groups
            entityContexts: 'api-data/contexts/context-summary.json' // NEW: Context summary
        };
        
        const [summaryData, companiesData, changesData, entityGroupsData, contextSummary] = await Promise.all([
            fetch(dataFiles.summary).then(r => r.json()),
            fetch(dataFiles.companies).then(r => r.json()),
            fetch(dataFiles.changes).then(r => r.json()),
            fetch(dataFiles.entityGroups).then(r => r.json()).catch(() => null), // Graceful fallback
            fetch(dataFiles.entityContexts).then(r => r.json()).catch(() => null)
        ])`;
        
        dashboardContent = dashboardContent.replace(dataLoadingRegex, newDataLoading);
        
        // Add entity view toggle UI
        const viewToggleHTML = `
        <!-- Entity View Toggle -->
        <div class="view-toggle mb-3">
            <div class="btn-group" role="group">
                <input type="radio" class="btn-check" name="entityView" id="detailView" value="detail" checked>
                <label class="btn btn-outline-primary" for="detailView">
                    <i class="bi bi-list-ul"></i> Detail View
                </label>
                
                <input type="radio" class="btn-check" name="entityView" id="graphView" value="graph">
                <label class="btn btn-outline-primary" for="graphView">
                    <i class="bi bi-diagram-3"></i> Graph View
                </label>
            </div>
            <small class="text-muted ms-2">
                <span id="entityCount">0</span> entities
            </small>
        </div>`;
        
        // Insert toggle after the filter section
        const filterSectionRegex = /<div class="filters mb-3">[\s\S]*?<\/div>/;
        dashboardContent = dashboardContent.replace(filterSectionRegex, (match) => {
            return match + '\n' + viewToggleHTML;
        });
        
        // Add entity processing logic
        const entityProcessingJS = `
        // Process entity groups
        let currentEntityView = 'detail';
        let processedEntities = {
            all: [],
            filtered: []
        };
        
        if (entityGroupsData) {
            processedEntities.all = entityGroupsData.all_entities || [];
            processedEntities.filtered = entityGroupsData.graph_entities || [];
            
            // Update entity count
            document.getElementById('entityCount').textContent = 
                currentEntityView === 'detail' ? processedEntities.all.length : processedEntities.filtered.length;
        }
        
        // Entity view toggle handler
        document.querySelectorAll('input[name="entityView"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentEntityView = e.target.value;
                updateEntityDisplay();
            });
        });
        
        function updateEntityDisplay() {
            const entities = currentEntityView === 'detail' ? processedEntities.all : processedEntities.filtered;
            document.getElementById('entityCount').textContent = entities.length;
            
            // Update any entity-dependent visualizations
            if (window.updateForceGraph) {
                window.updateForceGraph(entities);
            }
            
            // Update entity lists in the UI
            updateEntityLists(entities);
        }
        
        function updateEntityLists(entities) {
            // Group entities by type
            const byType = {};
            entities.forEach(e => {
                const type = e.type || 'other';
                if (!byType[type]) byType[type] = [];
                byType[type].push(e);
            });
            
            // Update sidebar or wherever entities are displayed
            const entityContainer = document.getElementById('entityLists');
            if (entityContainer) {
                entityContainer.innerHTML = Object.entries(byType)
                    .map(([type, items]) => \`
                        <div class="entity-type-group mb-3">
                            <h6 class="text-capitalize">\${type} (\${items.length})</h6>
                            <div class="entity-list">
                                \${items.slice(0, 10).map(e => \`
                                    <span class="badge bg-secondary me-1 mb-1">
                                        \${e.name}
                                        \${e.is_monitored ? '<i class="bi bi-star-fill text-warning"></i>' : ''}
                                        \${e.mentioned_by > 0 ? \`<small>(\${e.mentioned_by})</small>\` : ''}
                                    </span>
                                \`).join('')}
                                \${items.length > 10 ? \`<small class="text-muted">+\${items.length - 10} more</small>\` : ''}
                            </div>
                        </div>
                    \`).join('');
            }
        }`;
        
        // Insert entity processing after data loading
        const afterDataLoadRegex = /Promise\.all\(\[[\s\S]*?\]\)[\s\S]*?;/;
        dashboardContent = dashboardContent.replace(afterDataLoadRegex, (match) => {
            return match + '\n\n' + entityProcessingJS;
        });
        
        // Add styles for entity display
        const entityStyles = `
        /* Entity Group Styles */
        .view-toggle {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .entity-type-group h6 {
            color: var(--primary-color);
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .entity-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
        }
        
        .entity-list .badge {
            font-size: 0.8rem;
            font-weight: normal;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .entity-list .badge i {
            font-size: 0.7rem;
        }
        
        .entity-list .badge small {
            opacity: 0.7;
        }`;
        
        // Insert styles
        const styleRegex = /<style>[\s\S]*?<\/style>/;
        dashboardContent = dashboardContent.replace(styleRegex, (match) => {
            return match.replace('</style>', entityStyles + '\n    </style>');
        });
        
        // Write updated dashboard
        fs.writeFileSync(dashboardPath, dashboardContent);
        console.log('✅ Dashboard updated successfully!');
        
        // Create a simple test to verify entity groups are loaded
        const testHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Entity Groups Test</title>
</head>
<body>
    <h1>Entity Groups Test</h1>
    <div id="results">Loading...</div>
    <script>
        fetch('api-data/entity-groups.json')
            .then(r => r.json())
            .then(data => {
                const results = document.getElementById('results');
                results.innerHTML = \`
                    <h2>Entity Groups Loaded Successfully!</h2>
                    <p>Total Groups: \${data.total_groups}</p>
                    <p>All Entities: \${data.all_entities.length}</p>
                    <p>Graph Entities (filtered): \${data.graph_entities.length}</p>
                    <h3>By Type:</h3>
                    <ul>
                        \${Object.entries(data.by_type).map(([type, items]) => 
                            \`<li>\${type}: \${items.length}</li>\`
                        ).join('')}
                    </ul>
                \`;
            })
            .catch(err => {
                document.getElementById('results').innerHTML = 'Error: ' + err.message;
            });
    </script>
</body>
</html>`;
        
        fs.writeFileSync(path.join(__dirname, '..', 'test-entity-groups.html'), testHTML);
        console.log('✅ Created test-entity-groups.html for verification');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        
        // Restore backup if error
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, dashboardPath);
            console.log('❌ Error occurred, restored backup');
        }
        
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    updateDashboardForEntityGroups().catch(console.error);
}

module.exports = { updateDashboardForEntityGroups };
