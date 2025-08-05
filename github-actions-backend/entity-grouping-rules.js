#!/usr/bin/env node

/**
 * Entity Grouping Rules
 * Defines both synonym merging and hierarchical grouping
 */

// SYNONYM GROUPS - These should be merged into a single entity
const SYNONYM_GROUPS = {
    // Core AI/ML terms
    'artificial intelligence': ['ai', 'a.i.', 'artificial-intelligence', 'artificial_intelligence', 'artifical intelligence'],
    'machine learning': ['ml', 'machine-learning', 'machine_learning', 'machinelearning'],
    'deep learning': ['dl', 'deep-learning', 'deep_learning', 'deeplearning'],
    'natural language processing': ['nlp', 'natural-language-processing', 'natural_language_processing'],
    'large language model': ['llm', 'large-language-model', 'large_language_model', 'large language models', 'llms'],
    'neural network': ['nn', 'neural-network', 'neural_network', 'neural networks', 'nns'],
    'reinforcement learning': ['rl', 'reinforcement-learning', 'reinforcement_learning'],
    'computer vision': ['cv', 'computer-vision', 'computer_vision', 'vision ai'],
    'generative adversarial network': ['gan', 'gans', 'generative-adversarial-network'],
    'recurrent neural network': ['rnn', 'rnns', 'recurrent-neural-network'],
    'convolutional neural network': ['cnn', 'cnns', 'convolutional-neural-network'],
    
    // Technical terms
    'application programming interface': ['api', 'apis', 'a.p.i.', 'rest api'],
    'software development kit': ['sdk', 'sdks', 's.d.k.'],
    'integrated development environment': ['ide', 'ides', 'i.d.e.'],
    'graphics processing unit': ['gpu', 'gpus', 'g.p.u.', 'graphics card', 'graphics cards'],
    'central processing unit': ['cpu', 'cpus', 'c.p.u.', 'processor', 'processors'],
    'tensor processing unit': ['tpu', 'tpus', 't.p.u.'],
    'continuous integration': ['ci', 'c.i.', 'continuous-integration'],
    'continuous deployment': ['cd', 'c.d.', 'continuous-deployment'],
    'continuous integration/continuous deployment': ['ci/cd', 'ci-cd', 'cicd'],
    'user interface': ['ui', 'u.i.', 'user-interface'],
    'user experience': ['ux', 'u.x.', 'user-experience'],
    'application': ['app', 'apps', 'application', 'applications'],
    
    // Cloud/Infrastructure
    'amazon web services': ['aws', 'amazon-web-services', 'amazon_web_services'],
    'google cloud platform': ['gcp', 'google-cloud-platform', 'google_cloud_platform', 'google cloud'],
    'microsoft azure': ['azure', 'ms azure', 'microsoft-azure'],
    'kubernetes': ['k8s', 'kube', 'k8', 'kubernetes'],
    'docker': ['docker', 'docker container', 'docker containers'],
    
    // Programming languages
    'javascript': ['js', 'javascript', 'java-script', 'java_script'],
    'typescript': ['ts', 'typescript', 'type-script', 'type_script'],
    'python': ['py', 'python', 'python3', 'python 3'],
    
    // Company variations
    'openai': ['open ai', 'open-ai', 'open_ai', 'openai inc', 'openai inc.'],
    'deepmind': ['deep mind', 'deep-mind', 'deep_mind', 'google deepmind'],
    'hugging face': ['huggingface', 'hugging-face', 'hugging_face', 'hf'],
    'meta': ['meta', 'meta ai', 'meta-ai', 'facebook ai'],
    'anthropic': ['anthropic', 'anthropic ai', 'anthropic-ai'],
    
    // Model names
    'gpt-4': ['gpt4', 'gpt 4', 'gpt-4.0'],
    'gpt-3': ['gpt3', 'gpt 3', 'gpt-3.0'],
    'claude': ['claude', 'claude ai', 'claude-ai'],
    'llama': ['llama', 'llama model', 'llama models'],
    'bert': ['bert', 'bert model', 'bidirectional encoder representations from transformers'],
    
    // Common tech terms
    'database': ['db', 'database', 'databases', 'dbs'],
    'repository': ['repo', 'repos', 'repository', 'repositories'],
    'algorithm': ['algo', 'algos', 'algorithm', 'algorithms'],
    'function': ['fn', 'func', 'function', 'functions'],
    'configuration': ['config', 'configs', 'configuration', 'configurations'],
    'authentication': ['auth', 'authn', 'authentication'],
    'authorization': ['authz', 'authorization'],
    
    // Concepts
    'artificial general intelligence': ['agi', 'a.g.i.', 'artificial-general-intelligence'],
    'natural language understanding': ['nlu', 'natural-language-understanding'],
    'natural language generation': ['nlg', 'natural-language-generation'],
    'optical character recognition': ['ocr', 'optical-character-recognition'],
    'internet of things': ['iot', 'internet-of-things'],
    'software as a service': ['saas', 'software-as-a-service'],
    'platform as a service': ['paas', 'platform-as-a-service'],
    'infrastructure as a service': ['iaas', 'infrastructure-as-a-service'],
};

// HIERARCHICAL GROUPS - Related but distinct concepts
const HIERARCHICAL_GROUPS = {
    'learning': {
        parent: 'learning',
        children: [
            'machine learning',
            'deep learning',
            'reinforcement learning',
            'supervised learning',
            'unsupervised learning',
            'semi-supervised learning',
            'transfer learning',
            'federated learning',
            'active learning',
            'online learning',
            'meta learning',
            'continual learning'
        ]
    },
    
    'model': {
        parent: 'model',
        children: [
            'language model',
            'large language model',
            'vision model',
            'foundation model',
            'base model',
            'fine-tuned model',
            'multimodal model',
            'generative model',
            'discriminative model',
            'pre-trained model',
            'embedding model'
        ]
    },
    
    'data': {
        parent: 'data',
        children: [
            'data processing',
            'data pipeline',
            'data analysis',
            'data science',
            'data engineering',
            'data cleaning',
            'data augmentation',
            'data labeling',
            'data storage',
            'data warehouse',
            'data lake',
            'data governance'
        ]
    },
    
    'network': {
        parent: 'network',
        children: [
            'neural network',
            'network architecture',
            'network layer',
            'network training',
            'network optimization',
            'network pruning',
            'attention network',
            'transformer network',
            'convolutional network',
            'recurrent network'
        ]
    },
    
    'processing': {
        parent: 'processing',
        children: [
            'data processing',
            'image processing',
            'signal processing',
            'batch processing',
            'stream processing',
            'parallel processing',
            'natural language processing',
            'audio processing',
            'video processing',
            'real-time processing'
        ]
    },
    
    'cloud': {
        parent: 'cloud',
        children: [
            'cloud computing',
            'cloud platform',
            'cloud service',
            'cloud infrastructure',
            'cloud storage',
            'cloud deployment',
            'cloud migration',
            'cloud security',
            'cloud native',
            'multi-cloud',
            'hybrid cloud'
        ]
    },
    
    'development': {
        parent: 'development',
        children: [
            'software development',
            'web development',
            'mobile development',
            'backend development',
            'frontend development',
            'full-stack development',
            'api development',
            'development tools',
            'development environment',
            'development framework'
        ]
    },
    
    'security': {
        parent: 'security',
        children: [
            'data security',
            'cloud security',
            'network security',
            'application security',
            'api security',
            'security compliance',
            'security monitoring',
            'security testing',
            'security framework',
            'cybersecurity'
        ]
    },
    
    'analysis': {
        parent: 'analysis',
        children: [
            'data analysis',
            'sentiment analysis',
            'statistical analysis',
            'predictive analysis',
            'text analysis',
            'image analysis',
            'behavior analysis',
            'performance analysis',
            'competitive analysis',
            'market analysis'
        ]
    },
    
    'optimization': {
        parent: 'optimization',
        children: [
            'model optimization',
            'performance optimization',
            'cost optimization',
            'hyperparameter optimization',
            'neural architecture search',
            'inference optimization',
            'memory optimization',
            'training optimization',
            'query optimization'
        ]
    },
    
    'training': {
        parent: 'training',
        children: [
            'model training',
            'distributed training',
            'transfer learning',
            'fine-tuning',
            'pre-training',
            'continuous training',
            'adversarial training',
            'curriculum learning',
            'few-shot learning',
            'zero-shot learning'
        ]
    },
    
    'inference': {
        parent: 'inference',
        children: [
            'model inference',
            'real-time inference',
            'batch inference',
            'edge inference',
            'inference optimization',
            'inference serving',
            'inference latency',
            'inference throughput'
        ]
    }
};

// TECHNOLOGY STACKS - Group related technologies
const TECHNOLOGY_STACKS = {
    'python-data-science': {
        name: 'Python Data Science Stack',
        technologies: ['numpy', 'pandas', 'scipy', 'matplotlib', 'seaborn', 'scikit-learn', 'jupyter', 'ipython']
    },
    
    'python-ml-frameworks': {
        name: 'Python ML Frameworks',
        technologies: ['pytorch', 'tensorflow', 'keras', 'jax', 'mxnet', 'theano']
    },
    
    'javascript-frameworks': {
        name: 'JavaScript Frameworks',
        technologies: ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt.js', 'gatsby']
    },
    
    'cloud-platforms': {
        name: 'Cloud Platforms',
        technologies: ['aws', 'gcp', 'azure', 'alibaba cloud', 'ibm cloud', 'oracle cloud']
    },
    
    'container-orchestration': {
        name: 'Container & Orchestration',
        technologies: ['docker', 'kubernetes', 'helm', 'istio', 'openshift', 'rancher']
    },
    
    'data-processing': {
        name: 'Data Processing',
        technologies: ['spark', 'hadoop', 'flink', 'kafka', 'airflow', 'databricks']
    },
    
    'databases': {
        name: 'Databases',
        technologies: ['postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'neo4j']
    },
    
    'ml-ops': {
        name: 'MLOps Tools',
        technologies: ['mlflow', 'kubeflow', 'wandb', 'neptune', 'tensorboard', 'dvc']
    }
};

// COMPANY PRODUCTS - Group products by company
const COMPANY_PRODUCTS = {
    'openai': ['gpt-4', 'gpt-3', 'dall-e', 'whisper', 'codex', 'chatgpt'],
    'google': ['bard', 'palm', 'gemini', 'lamda', 'bert', 'tensor processing unit'],
    'microsoft': ['copilot', 'azure openai', 'bing chat', 'cognitive services'],
    'meta': ['llama', 'opt', 'make-a-video', 'segment anything'],
    'anthropic': ['claude', 'constitutional ai'],
    'stability ai': ['stable diffusion', 'stable video', 'stable audio'],
    'hugging face': ['transformers', 'datasets', 'tokenizers', 'accelerate', 'diffusers']
};

// Function to normalize an entity
function normalizeEntity(entity) {
    if (!entity) return null;
    
    const lower = entity.toLowerCase().trim();
    
    // Check if it's a known synonym
    for (const [canonical, synonyms] of Object.entries(ALL_SYNONYM_GROUPS)) {
        if (canonical === lower || synonyms.includes(lower)) {
            return {
                type: 'synonym',
                canonical: canonical,
                original: entity
            };
        }
    }
    
    // Check if it belongs to a hierarchical group
    for (const [groupName, group] of Object.entries(ALL_HIERARCHICAL_GROUPS)) {
        if (group.children.includes(lower)) {
            return {
                type: 'hierarchical',
                parent: group.parent,
                canonical: lower,
                original: entity
            };
        }
    }
    
    // Check if it's a technology in a stack
    for (const [stackName, stack] of Object.entries(TECHNOLOGY_STACKS)) {
        if (stack.technologies.includes(lower)) {
            return {
                type: 'technology-stack',
                stack: stack.name,
                canonical: lower,
                original: entity
            };
        }
    }
    
    // Check if it's a company product
    for (const [company, products] of Object.entries(COMPANY_PRODUCTS)) {
        if (products.includes(lower)) {
            return {
                type: 'company-product',
                company: company,
                canonical: lower,
                original: entity
            };
        }
    }
    
    // Not grouped
    return {
        type: 'ungrouped',
        canonical: lower,
        original: entity
    };
}

// Function to suggest groups for a list of entities
function suggestGroupings(entities) {
    const results = {
        synonymsToMerge: {},
        hierarchicalGroups: {},
        technologyStacks: {},
        companyProducts: {},
        ungrouped: []
    };
    
    entities.forEach(entity => {
        const normalized = normalizeEntity(entity);
        
        switch (normalized.type) {
            case 'synonym':
                if (!results.synonymsToMerge[normalized.canonical]) {
                    results.synonymsToMerge[normalized.canonical] = [];
                }
                results.synonymsToMerge[normalized.canonical].push(normalized.original);
                break;
                
            case 'hierarchical':
                if (!results.hierarchicalGroups[normalized.parent]) {
                    results.hierarchicalGroups[normalized.parent] = [];
                }
                results.hierarchicalGroups[normalized.parent].push(normalized.original);
                break;
                
            case 'technology-stack':
                if (!results.technologyStacks[normalized.stack]) {
                    results.technologyStacks[normalized.stack] = [];
                }
                results.technologyStacks[normalized.stack].push(normalized.original);
                break;
                
            case 'company-product':
                if (!results.companyProducts[normalized.company]) {
                    results.companyProducts[normalized.company] = [];
                }
                results.companyProducts[normalized.company].push(normalized.original);
                break;
                
            default:
                results.ungrouped.push(normalized.original);
        }
    });
    
    return results;
}

// Import additional groupings
const { ADDITIONAL_SYNONYMS, ADDITIONAL_HIERARCHICAL } = require('./additional-entity-groupings');

// Merge synonym groups
const ALL_SYNONYM_GROUPS = {
    ...SYNONYM_GROUPS,
    ...ADDITIONAL_SYNONYMS
};

// Merge hierarchical groups
const ALL_HIERARCHICAL_GROUPS = {
    ...HIERARCHICAL_GROUPS,
    ...ADDITIONAL_HIERARCHICAL
};

// Export everything
module.exports = {
    SYNONYM_GROUPS: ALL_SYNONYM_GROUPS,
    HIERARCHICAL_GROUPS: ALL_HIERARCHICAL_GROUPS,
    TECHNOLOGY_STACKS,
    COMPANY_PRODUCTS,
    normalizeEntity,
    suggestGroupings
};

// Test if run directly
if (require.main === module) {
    console.log('Testing entity grouping rules...\n');
    
    const testEntities = [
        'AI', 'artificial intelligence', 'machine learning', 'ML',
        'deep learning', 'neural network', 'neural networks',
        'pytorch', 'tensorflow', 'numpy', 'pandas',
        'gpt-4', 'claude', 'chatgpt',
        'data processing', 'data science', 'data pipeline',
        'cloud computing', 'cloud platform'
    ];
    
    const grouped = suggestGroupings(testEntities);
    
    console.log('SYNONYMS TO MERGE:');
    Object.entries(grouped.synonymsToMerge).forEach(([canonical, items]) => {
        console.log(`  ${canonical}: ${items.join(', ')}`);
    });
    
    console.log('\nHIERARCHICAL GROUPS:');
    Object.entries(grouped.hierarchicalGroups).forEach(([parent, items]) => {
        console.log(`  ${parent}:`);
        items.forEach(item => console.log(`    - ${item}`));
    });
    
    console.log('\nTECHNOLOGY STACKS:');
    Object.entries(grouped.technologyStacks).forEach(([stack, items]) => {
        console.log(`  ${stack}: ${items.join(', ')}`);
    });
    
    console.log('\nCOMPANY PRODUCTS:');
    Object.entries(grouped.companyProducts).forEach(([company, items]) => {
        console.log(`  ${company}: ${items.join(', ')}`);
    });
    
    console.log('\nUNGROUPED:', grouped.ungrouped);
}
