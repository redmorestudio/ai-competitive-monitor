#!/usr/bin/env node

/**
 * Entity Normalization and Grouping for AI Monitor
 * 
 * This module provides functions to:
 * 1. Normalize entity names to reduce fragmentation
 * 2. Group related entities together
 * 3. Create entity relationships
 */

// Common abbreviation mappings
const ABBREVIATION_MAP = {
    // AI/ML terms
    'ml': 'machine learning',
    'ai': 'artificial intelligence',
    'llm': 'large language model',
    'llms': 'large language models',
    'nlp': 'natural language processing',
    'cv': 'computer vision',
    'dl': 'deep learning',
    'nn': 'neural network',
    'nns': 'neural networks',
    'rl': 'reinforcement learning',
    'gan': 'generative adversarial network',
    'gans': 'generative adversarial networks',
    'rnn': 'recurrent neural network',
    'rnns': 'recurrent neural networks',
    'cnn': 'convolutional neural network',
    'cnns': 'convolutional neural networks',
    'bert': 'bidirectional encoder representations from transformers',
    'gpt': 'generative pre-trained transformer',
    
    // Tech terms
    'api': 'application programming interface',
    'apis': 'application programming interfaces',
    'sdk': 'software development kit',
    'sdks': 'software development kits',
    'ide': 'integrated development environment',
    'ides': 'integrated development environments',
    'ci': 'continuous integration',
    'cd': 'continuous deployment',
    'ci/cd': 'continuous integration/continuous deployment',
    'k8s': 'kubernetes',
    'aws': 'amazon web services',
    'gcp': 'google cloud platform',
    'gpu': 'graphics processing unit',
    'gpus': 'graphics processing units',
    'cpu': 'central processing unit',
    'cpus': 'central processing units',
    'tpu': 'tensor processing unit',
    'tpus': 'tensor processing units',
    
    // Company variations
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'microsoft': 'Microsoft',
    'google': 'Google',
    'meta': 'Meta',
    'nvidia': 'NVIDIA',
    'amd': 'AMD',
    'intel': 'Intel'
};

// Entity relationships (parent -> children)
const ENTITY_HIERARCHY = {
    'machine learning': ['deep learning', 'neural networks', 'reinforcement learning', 'supervised learning', 'unsupervised learning'],
    'deep learning': ['convolutional neural networks', 'recurrent neural networks', 'transformers', 'generative adversarial networks'],
    'programming languages': ['python', 'javascript', 'java', 'c++', 'rust', 'go'],
    'python': ['scipy', 'numpy', 'pandas', 'matplotlib', 'scikit-learn', 'pytorch', 'tensorflow'],
    'cloud platforms': ['amazon web services', 'google cloud platform', 'microsoft azure', 'alibaba cloud'],
    'ai frameworks': ['pytorch', 'tensorflow', 'jax', 'keras', 'scikit-learn', 'hugging face'],
    'large language models': ['gpt-4', 'claude', 'llama', 'palm', 'gemini', 'mistral'],
    'development tools': ['docker', 'kubernetes', 'git', 'github', 'gitlab', 'vscode'],
    'ai hardware': ['graphics processing units', 'tensor processing units', 'neural processing units']
};

// Synonyms and variations
const SYNONYMS = {
    'artificial intelligence': ['ai', 'a.i.', 'artificial-intelligence'],
    'machine learning': ['ml', 'machine-learning', 'machine_learning'],
    'large language model': ['llm', 'large language models', 'llms'],
    'natural language processing': ['nlp', 'natural-language-processing'],
    'computer vision': ['cv', 'computer-vision', 'vision ai'],
    'deep learning': ['dl', 'deep-learning', 'deep_learning'],
    'neural network': ['nn', 'neural networks', 'nns', 'neural-network'],
    'graphics processing unit': ['gpu', 'gpus', 'graphics card'],
    'kubernetes': ['k8s', 'kube'],
    'continuous integration': ['ci', 'continuous-integration'],
    'continuous deployment': ['cd', 'continuous-deployment'],
    'application programming interface': ['api', 'apis', 'rest api', 'graphql api']
};

/**
 * Normalize an entity name
 */
function normalizeEntity(name) {
    if (!name) return '';
    
    // Convert to lowercase for comparison
    let normalized = name.toLowerCase().trim();
    
    // Remove common suffixes
    normalized = normalized
        .replace(/\s+(inc|incorporated|corp|corporation|llc|ltd|limited|gmbh|ag|sa|pvt|private)\.?$/i, '')
        .replace(/[®™©]/g, '')
        .trim();
    
    // Check if it's a known abbreviation
    if (ABBREVIATION_MAP[normalized]) {
        return ABBREVIATION_MAP[normalized];
    }
    
    // Check synonyms
    for (const [canonical, variations] of Object.entries(SYNONYMS)) {
        if (variations.includes(normalized)) {
            return canonical;
        }
    }
    
    return normalized;
}

/**
 * Find related entities
 */
function findRelatedEntities(entity) {
    const normalized = normalizeEntity(entity);
    const related = new Set();
    
    // Check if it's a parent entity
    if (ENTITY_HIERARCHY[normalized]) {
        ENTITY_HIERARCHY[normalized].forEach(child => related.add(child));
    }
    
    // Check if it's a child entity
    for (const [parent, children] of Object.entries(ENTITY_HIERARCHY)) {
        if (children.includes(normalized)) {
            related.add(parent);
            children.forEach(sibling => {
                if (sibling !== normalized) related.add(sibling);
            });
        }
    }
    
    // Check synonyms
    for (const [canonical, variations] of Object.entries(SYNONYMS)) {
        if (canonical === normalized || variations.includes(normalized)) {
            related.add(canonical);
            variations.forEach(v => related.add(v));
        }
    }
    
    return Array.from(related).filter(e => e !== normalized);
}

/**
 * Group entities by canonical form
 */
function groupEntities(entities) {
    const groups = new Map();
    const processed = new Set();
    
    entities.forEach(entity => {
        if (processed.has(entity.toLowerCase())) return;
        
        const normalized = normalizeEntity(entity);
        const key = normalized || entity.toLowerCase();
        
        if (!groups.has(key)) {
            groups.set(key, {
                canonical: entity, // Keep original case for display
                normalized: normalized,
                variations: new Set([entity]),
                related: new Set()
            });
        } else {
            groups.get(key).variations.add(entity);
        }
        
        // Add related entities
        const related = findRelatedEntities(entity);
        related.forEach(rel => groups.get(key).related.add(rel));
        
        processed.add(entity.toLowerCase());
    });
    
    return groups;
}

/**
 * Create entity relationship graph
 */
function createEntityGraph(groups) {
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    
    // Create nodes
    let nodeId = 0;
    groups.forEach((group, key) => {
        const node = {
            id: nodeId++,
            name: group.canonical,
            normalized: group.normalized,
            variations: Array.from(group.variations),
            type: determineEntityType(group.canonical)
        };
        nodes.push(node);
        nodeMap.set(key, node.id);
    });
    
    // Create edges for relationships
    groups.forEach((group, key) => {
        const sourceId = nodeMap.get(key);
        group.related.forEach(relatedKey => {
            const targetId = nodeMap.get(normalizeEntity(relatedKey));
            if (targetId !== undefined && sourceId !== targetId) {
                edges.push({
                    source: sourceId,
                    target: targetId,
                    type: 'related'
                });
            }
        });
    });
    
    return { nodes, edges };
}

/**
 * Determine entity type based on content
 */
function determineEntityType(entity) {
    const lower = entity.toLowerCase();
    
    // Check hierarchies
    for (const [category, items] of Object.entries({
        'framework': ['pytorch', 'tensorflow', 'keras', 'jax', 'scikit-learn'],
        'language': ['python', 'javascript', 'java', 'c++', 'rust', 'go'],
        'platform': ['aws', 'gcp', 'azure', 'kubernetes', 'docker'],
        'model': ['gpt', 'claude', 'llama', 'bert', 'palm'],
        'concept': ['machine learning', 'deep learning', 'ai', 'nlp', 'computer vision'],
        'hardware': ['gpu', 'cpu', 'tpu', 'nvidia', 'amd', 'intel']
    })) {
        if (items.some(item => lower.includes(item))) {
            return category;
        }
    }
    
    return 'general';
}

// Export for use in other modules
module.exports = {
    normalizeEntity,
    findRelatedEntities,
    groupEntities,
    createEntityGraph,
    ABBREVIATION_MAP,
    ENTITY_HIERARCHY,
    SYNONYMS
};

// Test if run directly
if (require.main === module) {
    const testEntities = [
        'machine learning', 'ML', 'Machine Learning',
        'AI', 'artificial intelligence', 'Artificial Intelligence',
        'scipy', 'numpy', 'Python', 'python',
        'LLM', 'Large Language Model', 'llms',
        'GPU', 'graphics processing unit', 'GPUs',
        'OpenAI Inc.', 'OpenAI', 'openai'
    ];
    
    console.log('Testing entity normalization and grouping...\n');
    
    const groups = groupEntities(testEntities);
    groups.forEach((group, key) => {
        console.log(`\nCanonical: ${group.canonical}`);
        console.log(`Normalized: ${group.normalized}`);
        console.log(`Variations: ${Array.from(group.variations).join(', ')}`);
        console.log(`Related: ${Array.from(group.related).join(', ')}`);
    });
    
    console.log('\n\nEntity Graph:');
    const graph = createEntityGraph(groups);
    console.log(`Nodes: ${graph.nodes.length}`);
    console.log(`Edges: ${graph.edges.length}`);
}
