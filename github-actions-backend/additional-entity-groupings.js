// Additional groupings for common ungrouped entities

const ADDITIONAL_SYNONYMS = {
    // Companies
    'microsoft': ['msft', 'microsoft corporation', 'microsoft corp'],
    'google': ['googl', 'google llc', 'alphabet'],
    'nvidia': ['nvda', 'nvidia corporation'],
    'amazon': ['amzn', 'amazon.com', 'amazon inc'],
    'apple': ['aapl', 'apple inc'],
    'facebook': ['fb', 'facebook inc', 'meta platforms'],
    
    // AI/ML concepts
    'reinforcement learning from human feedback': ['rlhf', 'reinforcement learning from human feedback'],
    'retrieval augmented generation': ['rag', 'retrieval-augmented generation'],
    'massive multitask language understanding': ['mmlu', 'massive multitask language understanding'],
    'general language understanding evaluation': ['glue', 'general language understanding evaluation'],
    'human evaluation': ['humaneval', 'human eval', 'human-eval'],
    'generative ai': ['gen ai', 'generative artificial intelligence'],
    'conversational ai': ['conversational artificial intelligence', 'chat ai'],
    'agentic ai': ['agent ai', 'ai agents', 'agentic artificial intelligence'],
    
    // Technical capabilities
    'text-to-speech': ['tts', 'text to speech', 'text2speech'],
    'speech-to-text': ['stt', 'speech to text', 'speech2text'],
    'speech recognition': ['voice recognition', 'asr', 'automatic speech recognition'],
    'image generation': ['image gen', 'image synthesis', 'text-to-image', 'text to image'],
    'video generation': ['video gen', 'video synthesis', 'text-to-video', 'text to video'],
    'code generation': ['code gen', 'program synthesis', 'code synthesis'],
    'code completion': ['code autocomplete', 'code suggestion'],
    'text generation': ['text gen', 'text synthesis', 'language generation'],
    'voice cloning': ['voice synthesis', 'voice replication', 'speech synthesis'],
    'video editing': ['video editor', 'video manipulation'],
    'image recognition': ['image classification', 'visual recognition'],
    
    // Platforms
    'github': ['github.com', 'gh'],
    'gitlab': ['gitlab.com', 'gl'],
    'twitter': ['x', 'twitter.com', 'x.com'],
    'linkedin': ['linkedin.com', 'li'],
    'youtube': ['youtube.com', 'yt'],
    'discord': ['discord.com', 'discord app'],
    
    // Frameworks/Tools
    'pytorch': ['torch', 'py torch'],
    'tensorflow': ['tf', 'tensor flow'],
    'transformers': ['transformer models', 'transformer architecture'],
    
    // Compliance/Security
    'general data protection regulation': ['gdpr', 'general data protection regulation'],
    'ai safety': ['ai alignment', 'ai safety research'],
    'ai safety institute': ['ai safety inst', 'artificial intelligence safety institute'],
    
    // Products (should be linked to companies)
    'chatgpt': ['chat gpt', 'chat-gpt'],
    'github copilot': ['copilot', 'gh copilot'],
    'claude': ['claude ai', 'claude assistant'],
};

const ADDITIONAL_HIERARCHICAL = {
    'generation': {
        parent: 'generation',
        children: [
            'text generation',
            'image generation',
            'video generation',
            'code generation',
            'speech generation',
            'music generation',
            'audio generation'
        ]
    },
    
    'recognition': {
        parent: 'recognition',
        children: [
            'speech recognition',
            'image recognition',
            'face recognition',
            'object recognition',
            'pattern recognition',
            'gesture recognition',
            'emotion recognition'
        ]
    },
    
    'ai safety': {
        parent: 'ai safety',
        children: [
            'ai alignment',
            'ai ethics',
            'responsible ai',
            'ai governance',
            'ai risk management',
            'ai safety research',
            'ai safety institute'
        ]
    },
    
    'evaluation': {
        parent: 'evaluation',
        children: [
            'mmlu',
            'glue',
            'humaneval',
            'benchmark',
            'evaluation metrics',
            'performance evaluation',
            'model evaluation'
        ]
    },
    
    'editing': {
        parent: 'editing',
        children: [
            'video editing',
            'image editing',
            'audio editing',
            'photo editing',
            'content editing',
            'document editing'
        ]
    },
    
    'compliance': {
        parent: 'compliance',
        children: [
            'gdpr',
            'hipaa',
            'sox',
            'pci',
            'regulatory compliance',
            'data compliance',
            'privacy compliance'
        ]
    }
};

// Merge with existing rules
module.exports = {
    ADDITIONAL_SYNONYMS,
    ADDITIONAL_HIERARCHICAL
};
