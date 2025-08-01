// 3D Force Graph Module
// Handles all 3D graph visualization logic

import { CONFIG } from './config.js';

// Module state
let Graph;
let graphData = { nodes: [], links: [] };
let rawData = {};
let particlesEnabled = true;
let currentView = 'companies';

// Graph configuration
const GRAPH_CONFIG = {
    nodeColors: {
        'LLM Providers': '#ff6b6b',
        'AI Hardware': '#4ecdc4',
        'AI Frameworks': '#45b7d1',
        'Cloud Providers': '#96ceb4',
        'AI Applications': '#f7b731',
        'AI Research': '#5f27cd',
        'AI Coding': '#e74c3c',
        'Image Generation': '#9b59b6',
        'AI Search': '#f39c12',
        'default': '#667eea'
    },
    threatColors: {
        'high': '#ff4444',
        'medium': '#ffa726',
        'low': '#66bb6a',
        'unknown': '#666666'
    },
    particleSpeed: 0.003,
    linkOpacity: 0.3,
    linkWidth: 0.5
};

// Debug function
function debug(message) {
    console.log(`[Graph3D] ${message}`);
    const debugElement = document.getElementById('debugContent');
    if (debugElement) {
        debugElement.innerHTML += message + '<br/>';
    }
}

// Initialize the graph
export async function initGraph(containerId, data) {
    try {
        debug('Starting graph initialization...');
        
        rawData = data;
        debug(`Loaded data: ${rawData.dashboard.companies.length} companies`);
        
        // Build initial graph data
        buildCompanyNetwork();
        debug(`Built network: ${graphData.nodes.length} nodes, ${graphData.links.length} links`);
        
        // Create the graph
        Graph = ForceGraph3D()
            (document.getElementById(containerId))
            .graphData(graphData)
            .nodeLabel('label')
            .nodeAutoColorBy('group')
            .nodeThreeObject(node => {
                const sprite = new SpriteText(node.name);
                sprite.material.depthWrite = false;
                sprite.color = node.color || '#ffffff';
                sprite.textHeight = 6;
                return sprite;
            })
            .linkWidth(link => link.width || GRAPH_CONFIG.linkWidth)
            .linkOpacity(GRAPH_CONFIG.linkOpacity)
            .linkDirectionalParticles(link => particlesEnabled ? link.particles || 2 : 0)
            .linkDirectionalParticleSpeed(GRAPH_CONFIG.particleSpeed)
            .linkDirectionalParticleWidth(2)
            .linkDirectionalParticleColor(link => link.color || '#ffffff')
            .onNodeHover(node => {
                document.getElementById('node-info').innerHTML = node ? 
                    `<strong>${node.name}</strong><br/>
                     Type: ${node.group}<br/>
                     ${node.description || ''}` : 
                    'Hover over nodes for details';
            })
            .onNodeClick(node => {
                // Focus on node
                const distance = 200;
                const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                
                Graph.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                    node,
                    3000
                );
            });
        
        // Set initial camera position
        Graph.cameraPosition({ z: 500 });
        
        debug('Graph initialization complete!');
        return Graph;
        
    } catch (error) {
        console.error('Error initializing graph:', error);
        debug(`ERROR: ${error.message}`);
        throw error;
    }
}

// Build company network view
function buildCompanyNetwork() {
    graphData.nodes = [];
    graphData.links = [];
    const nodeMap = new Map();
    
    debug('Building company network...');
    
    // Create company nodes using the correct data structure
    rawData.dashboard.companies.forEach(company => {
        const node = {
            id: company.name,
            name: company.name,
            group: company.category,
            color: GRAPH_CONFIG.nodeColors[company.category] || GRAPH_CONFIG.nodeColors.default,
            description: `URLs: ${company.urls.length}<br/>Changes: ${company.stats.totalChanges}<br/>High Interest: ${company.stats.highInterestChanges}`,
            val: company.urls.length * 3, // Node size based on URL count
            company: company
        };
        graphData.nodes.push(node);
        nodeMap.set(company.name, node);
    });
    
    debug(`Added ${graphData.nodes.length} company nodes`);
    
    // Create technology/product connections based on real intelligence data
    const techConnections = new Map();
    
    rawData.dashboard.companies.forEach(company => {
        // Connect companies that share AI technologies
        if (company.intelligence && company.intelligence.ai_technologies) {
            company.intelligence.ai_technologies.forEach(tech => {
                if (!techConnections.has(tech)) {
                    techConnections.set(tech, []);
                }
                techConnections.get(tech).push(company.name);
            });
        }
    });
    
    debug(`Found ${techConnections.size} unique technologies`);
    
    // Create links between companies sharing technologies
    let linkCount = 0;
    techConnections.forEach((companies, tech) => {
        if (companies.length > 1) {
            debug(`${tech}: shared by ${companies.join(', ')}`);
            for (let i = 0; i < companies.length - 1; i++) {
                for (let j = i + 1; j < companies.length; j++) {
                    graphData.links.push({
                        source: companies[i],
                        target: companies[j],
                        label: tech,
                        color: '#4ecdc4',
                        particles: 1,
                        width: 0.5
                    });
                    linkCount++;
                }
            }
        }
    });
    
    debug(`Created ${linkCount} technology links`);
    
    // Create concept nodes for major AI/ML concepts  
    const conceptConnections = new Map();
    rawData.dashboard.companies.forEach(company => {
        if (company.intelligence && company.intelligence.ai_ml_concepts) {
            company.intelligence.ai_ml_concepts.forEach(concept => {
                if (!conceptConnections.has(concept)) {
                    conceptConnections.set(concept, []);
                }
                conceptConnections.get(concept).push(company.name);
            });
        }
    });
    
    // Add concept nodes and connections for concepts shared by multiple companies
    let conceptNodes = 0;
    conceptConnections.forEach((companies, concept) => {
        if (companies.length > 1) {
            // Create a central concept node
            const conceptNode = {
                id: `concept-${concept}`,
                name: concept,
                group: 'AI Concept',
                color: '#00ff88',
                val: companies.length * 4,
                description: `AI/ML Concept shared by ${companies.length} companies`
            };
            graphData.nodes.push(conceptNode);
            conceptNodes++;
            
            // Connect companies to concept
            companies.forEach(company => {
                graphData.links.push({
                    source: company,
                    target: conceptNode.id,
                    color: '#00ff88',
                    particles: 2,
                    width: 1
                });
            });
            
            debug(`Added concept: ${concept} (${companies.length} companies)`);
        }
    });
    
    debug(`Added ${conceptNodes} concept nodes`);
    debug(`Total: ${graphData.nodes.length} nodes, ${graphData.links.length} links`);
}

// Build technology landscape view
function buildTechnologyView() {
    graphData.nodes = [];
    graphData.links = [];
    
    const techNodes = new Map();
    
    // Create technology nodes from real data
    rawData.dashboard.companies.forEach(company => {
        if (company.intelligence && company.intelligence.ai_technologies) {
            company.intelligence.ai_technologies.forEach(tech => {
                if (!techNodes.has(tech)) {
                    techNodes.set(tech, {
                        id: `tech-${tech}`,
                        name: tech,
                        group: 'Technology',
                        color: '#4ecdc4',
                        companies: [],
                        val: 5
                    });
                }
                techNodes.get(tech).companies.push(company.name);
                techNodes.get(tech).val += 3;
            });
        }
    });
    
    // Add technology nodes to graph
    techNodes.forEach(node => {
        node.description = `Technology used by ${node.companies.length} companies`;
        graphData.nodes.push(node);
    });
    
    // Add company nodes
    rawData.dashboard.companies.forEach(company => {
        graphData.nodes.push({
            id: company.name,
            name: company.name,
            group: company.category,
            color: GRAPH_CONFIG.nodeColors[company.category] || GRAPH_CONFIG.nodeColors.default,
            val: 3,
            description: `${company.category} company with ${company.urls.length} monitored URLs`
        });
    });
    
    // Create links
    techNodes.forEach((techNode, tech) => {
        techNode.companies.forEach(company => {
            graphData.links.push({
                source: techNode.id,
                target: company,
                particles: 1,
                color: '#4ecdc4'
            });
        });
    });
}

// Build AI/ML concepts view
function buildConceptsView() {
    graphData.nodes = [];
    graphData.links = [];
    
    const conceptNodes = new Map();
    
    // Create concept nodes from real data
    rawData.dashboard.companies.forEach(company => {
        if (company.intelligence && company.intelligence.ai_ml_concepts) {
            company.intelligence.ai_ml_concepts.forEach(concept => {
                if (!conceptNodes.has(concept)) {
                    conceptNodes.set(concept, {
                        id: `concept-${concept}`,
                        name: concept,
                        group: 'AI Concept',
                        color: '#00ff88',
                        companies: [],
                        val: 6
                    });
                }
                conceptNodes.get(concept).companies.push(company.name);
                conceptNodes.get(concept).val += 4;
            });
        }
    });
    
    // Add concept nodes
    conceptNodes.forEach(node => {
        node.description = `AI/ML concept used by ${node.companies.length} companies`;
        graphData.nodes.push(node);
    });
    
    // Add company nodes
    rawData.dashboard.companies.forEach(company => {
        graphData.nodes.push({
            id: company.name,
            name: company.name,
            group: company.category,
            color: GRAPH_CONFIG.nodeColors[company.category] || GRAPH_CONFIG.nodeColors.default,
            val: 4,
            description: `${company.category}: ${company.intelligence && company.intelligence.ai_ml_concepts ? company.intelligence.ai_ml_concepts.length : 0} AI concepts`
        });
    });
    
    // Create links
    conceptNodes.forEach((conceptNode, concept) => {
        conceptNode.companies.forEach(company => {
            graphData.links.push({
                source: conceptNode.id,
                target: company,
                particles: 2,
                color: '#00ff88'
            });
        });
    });
}

// Build recent changes view
function buildChangesView() {
    graphData.nodes = [];
    graphData.links = [];
    
    // Add company nodes
    rawData.dashboard.companies.forEach(company => {
        const recentChanges = company.recentChanges.filter(change => change.interestLevel >= 6);
        
        graphData.nodes.push({
            id: company.name,
            name: company.name,
            group: company.category,
            color: GRAPH_CONFIG.nodeColors[company.category] || GRAPH_CONFIG.nodeColors.default,
            val: Math.max(3, recentChanges.length * 2),
            description: `${company.category}<br/>${recentChanges.length} high-interest changes<br/>Total: ${company.stats.totalChanges} changes`
        });
        
        // Add change nodes for high-interest changes
        recentChanges.slice(0, 3).forEach((change, index) => {
            const changeNode = {
                id: `change-${company.name}-${index}`,
                name: `Change ${index + 1}`,
                group: 'Change',
                color: change.interestLevel >= 8 ? '#ff4444' : '#ffa726',
                val: change.interestLevel,
                description: `Interest: ${change.interestLevel}/10<br/>${change.relativeTime}<br/>Type: ${change.changeType}`
            };
            graphData.nodes.push(changeNode);
            
            // Link change to company
            graphData.links.push({
                source: company.name,
                target: changeNode.id,
                color: changeNode.color,
                particles: change.interestLevel >= 8 ? 3 : 1,
                width: 1
            });
        });
    });
}

// Change view mode
export function changeView(viewMode) {
    currentView = viewMode;
    debug(`Switching to view: ${currentView}`);
    
    switch(currentView) {
        case 'technologies':
            buildTechnologyView();
            break;
        case 'concepts':
            buildConceptsView();
            break;
        case 'changes':
            buildChangesView();
            break;
        case 'companies':
        default:
            buildCompanyNetwork();
            break;
    }
    
    if (Graph) {
        Graph.graphData(graphData);
    }
    
    return getStats();
}

// Filter by type
export function filterByType(filterType) {
    debug(`Filtering by: ${filterType}`);
    
    if (filterType === 'all') {
        buildCompanyNetwork();
        if (Graph) {
            Graph.graphData(graphData);
        }
    } else {
        // Filter nodes by company category
        const filteredNodes = graphData.nodes.filter(node => 
            node.group === filterType || node.group === 'AI Concept' || node.group === 'Technology'
        );
        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = graphData.links.filter(link =>
            nodeIds.has(link.source.id || link.source) && 
            nodeIds.has(link.target.id || link.target)
        );
        
        if (Graph) {
            Graph.graphData({ nodes: filteredNodes, links: filteredLinks });
        }
    }
    
    return getStats();
}

// Toggle particles
export function toggleParticles() {
    particlesEnabled = !particlesEnabled;
    debug(`Particles: ${particlesEnabled}`);
    
    if (Graph) {
        graphData.links.forEach(link => {
            Graph.linkDirectionalParticles(link, particlesEnabled ? link.particles || 2 : 0);
        });
    }
    
    return particlesEnabled;
}

// Reset camera view
export function resetView() {
    if (Graph) {
        Graph.cameraPosition({ x: 0, y: 0, z: 500 }, { x: 0, y: 0, z: 0 }, 1000);
    }
}

// Get statistics
export function getStats() {
    const stats = {
        companies: rawData.dashboard ? rawData.dashboard.companies.length : 0,
        totalChanges: rawData.dashboard ? rawData.dashboard.totalChanges : 0,
        highInterestChanges: rawData.dashboard ? rawData.dashboard.highInterestChanges : 0,
        nodes: graphData.nodes.length,
        links: graphData.links.length
    };
    
    return stats;
}

// Export the graph instance for external use if needed
export function getGraphInstance() {
    return Graph;
}