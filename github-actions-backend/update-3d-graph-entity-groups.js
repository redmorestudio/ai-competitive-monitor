#!/usr/bin/env node

/**
 * Update 3D Force Graph for Entity Groups
 * This script updates the 3D force graph to use filtered entity groups
 */

const fs = require('fs');
const path = require('path');

async function update3DGraphForEntityGroups() {
    console.log('Updating 3D force graph to use entity groups...\n');
    
    const graphPath = path.join(__dirname, '..', '3d-force-graph.html');
    const backupPath = `${graphPath}.backup-${Date.now()}`;
    
    try {
        // Create backup
        if (fs.existsSync(graphPath)) {
            fs.copyFileSync(graphPath, backupPath);
            console.log(`✅ Created backup: ${backupPath}`);
        }
        
        // Read current graph file
        let graphContent = fs.readFileSync(graphPath, 'utf8');
        
        // Update data loading to include entity groups
        const dataLoadingRegex = /\/\/ Load data[\s\S]*?Promise\.all\(\[[\s\S]*?\]\)/;
        
        const newDataLoading = `// Load data
        console.log('Loading graph data...');
        const [companiesData, summaryData, entityGroupsData] = await Promise.all([
            fetch('api-data/companies.json').then(r => r.json()),
            fetch('api-data/summary.json').then(r => r.json()),
            fetch('api-data/entity-groups.json').then(r => r.json()).catch(() => ({ graph_entities: [] }))
        ])`;
        
        graphContent = graphContent.replace(dataLoadingRegex, newDataLoading);
        
        // Add entity filtering logic
        const entityFilteringLogic = `
        // Entity filtering based on grouped entities
        let useFilteredEntities = true; // Default to filtered view
        let allEntities = entityGroupsData.all_entities || [];
        let filteredEntities = entityGroupsData.graph_entities || [];
        
        // Create entity lookup maps for quick access
        const entityTypeMap = new Map();
        const entityMentionMap = new Map();
        const monitoredEntities = new Set();
        
        allEntities.forEach(e => {
            entityTypeMap.set(e.name.toLowerCase(), e.type);
            entityMentionMap.set(e.name.toLowerCase(), e.mentioned_by);
            if (e.is_monitored) {
                monitoredEntities.add(e.name.toLowerCase());
            }
        });
        
        // Filter function for entities
        function shouldShowEntity(entityName) {
            if (!useFilteredEntities) return true;
            
            const lowerName = entityName.toLowerCase();
            
            // Always show monitored companies
            if (monitoredEntities.has(lowerName)) return true;
            
            // Show if mentioned by 3+ sources
            const mentionCount = entityMentionMap.get(lowerName) || 0;
            if (mentionCount >= 3) return true;
            
            // Always show technology and concepts
            const type = entityTypeMap.get(lowerName);
            if (type === 'technology' || type === 'concept') return true;
            
            return false;
        }
        
        // Add UI toggle for entity filtering
        const controlsHTML = \`
            <div class="entity-filter-toggle" style="position: absolute; top: 10px; right: 10px; z-index: 1000; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px;">
                <label style="color: white; display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="filterEntities" checked>
                    <span>Smart Filter (Show key entities only)</span>
                </label>
                <small style="color: #aaa; display: block; margin-top: 5px;">
                    Showing: <span id="entityCount">0</span> entities
                </small>
            </div>
        \`;
        document.body.insertAdjacentHTML('afterbegin', controlsHTML);
        
        document.getElementById('filterEntities').addEventListener('change', (e) => {
            useFilteredEntities = e.target.checked;
            updateGraph();
        });`;
        
        // Insert filtering logic after data loading
        graphContent = graphContent.replace(
            /const \[companiesData[\s\S]*?\]\);/,
            (match) => match + '\n\n' + entityFilteringLogic
        );
        
        // Update the node creation to use filtering
        const nodeCreationRegex = /\/\/ Create nodes for each entity[\s\S]*?entities\.forEach\(entity => \{[\s\S]*?\}\);/;
        
        const newNodeCreation = `// Create nodes for each entity
        const filteredEntitySet = new Set();
        entities.forEach(entity => {
            if (shouldShowEntity(entity)) {
                filteredEntitySet.add(entity);
                
                const nodeType = entityTypeMap.get(entity.toLowerCase()) || 'other';
                const mentionCount = entityMentionMap.get(entity.toLowerCase()) || 0;
                const isMonitored = monitoredEntities.has(entity.toLowerCase());
                
                nodes.push({
                    id: entity,
                    name: entity,
                    type: nodeType,
                    isMonitored: isMonitored,
                    mentionCount: mentionCount,
                    // Node size based on importance
                    val: isMonitored ? 20 : 
                         mentionCount >= 5 ? 15 :
                         mentionCount >= 3 ? 10 : 5,
                    // Color based on type
                    color: nodeType === 'company' ? '#4169E1' :
                           nodeType === 'product' ? '#32CD32' :
                           nodeType === 'technology' ? '#FF6347' :
                           nodeType === 'concept' ? '#FFD700' :
                           nodeType === 'person' ? '#9370DB' : '#708090'
                });
            }
        });
        
        // Update entity count
        document.getElementById('entityCount').textContent = filteredEntitySet.size;`;
        
        graphContent = graphContent.replace(nodeCreationRegex, newNodeCreation);
        
        // Update link creation to only show links between visible entities
        const linkCreationRegex = /\/\/ Create links between entities[\s\S]*?links\.push\(\{[\s\S]*?\}\);/g;
        
        graphContent = graphContent.replace(linkCreationRegex, (match) => {
            return match.replace(
                'links.push({',
                'if (filteredEntitySet.has(source) && filteredEntitySet.has(target)) { links.push({'
            ).replace(
                '});',
                '}); }'
            );
        });
        
        // Add updateGraph function if it doesn't exist
        if (!graphContent.includes('function updateGraph()')) {
            const updateGraphFunction = `
        // Function to update the graph when filtering changes
        function updateGraph() {
            // Re-process all data with new filter settings
            const { nodes, links } = processGraphData(companiesData, summaryData);
            
            // Update the graph
            Graph.graphData({ nodes, links });
        }`;
            
            // Insert before the Graph initialization
            graphContent = graphContent.replace(
                /const Graph = ForceGraph3D\(\)/,
                updateGraphFunction + '\n\n        const Graph = ForceGraph3D()'
            );
        }
        
        // Add tooltip to show entity details
        const tooltipEnhancement = `
        .nodeLabel(node => {
            const mentions = node.mentionCount || 0;
            const type = node.type || 'other';
            return \`
                <div style="text-align: center;">
                    <div style="font-weight: bold;">\${node.name}</div>
                    <div style="font-size: 0.8em; color: #aaa;">Type: \${type}</div>
                    \${mentions > 0 ? \`<div style="font-size: 0.8em; color: #aaa;">Mentioned by: \${mentions} sources</div>\` : ''}
                    \${node.isMonitored ? '<div style="color: gold;">★ Monitored</div>' : ''}
                </div>
            \`;
        })`;
        
        // Add tooltip enhancement to graph configuration
        graphContent = graphContent.replace(
            /\.nodeLabel\([^)]*\)/,
            tooltipEnhancement
        );
        
        // Write updated graph file
        fs.writeFileSync(graphPath, graphContent);
        console.log('✅ 3D force graph updated successfully!');
        
        // Create visualization guide
        const guideContent = `# 3D Force Graph Entity Filtering Guide

## What's Changed
The 3D force graph now uses intelligent entity filtering to show only the most relevant entities.

## Default Filter (Smart Filter ON)
Shows only:
- ⭐ Monitored companies (OpenAI, Anthropic, etc.)
- 🔥 Entities mentioned by 3+ different sources
- 💻 All technology entities
- 💡 All concept entities

## Entity Colors
- 🔵 Blue: Companies
- 🟢 Green: Products  
- 🔴 Red: Technologies
- 🟡 Yellow: Concepts
- 🟣 Purple: People
- ⚫ Gray: Other

## Node Sizes
- Large: Monitored companies
- Medium: Frequently mentioned (5+ sources)
- Small: Less frequently mentioned

## Toggle Options
- **Smart Filter**: Toggle between filtered view (~800 entities) and full view (3000+ entities)
- Full view may be slower but shows all relationships

## Performance Tips
- Use Smart Filter for better performance
- Zoom in to see local clusters
- Click and drag to rotate the graph
- Double-click nodes to focus on them
`;
        
        fs.writeFileSync(path.join(__dirname, '..', '3D-GRAPH-FILTERING-GUIDE.md'), guideContent);
        console.log('✅ Created 3D-GRAPH-FILTERING-GUIDE.md');
        
    } catch (error) {
        console.error('Error updating 3D graph:', error);
        
        // Restore backup if error
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, graphPath);
            console.log('❌ Error occurred, restored backup');
        }
        
        throw error;
    }
}

// Run if called directly  
if (require.main === module) {
    update3DGraphForEntityGroups().catch(console.error);
}

module.exports = { update3DGraphForEntityGroups };
