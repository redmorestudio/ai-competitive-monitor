---
title: Enhanced Dynamic Entity Extraction Strategy for AI Monitor
type: note
permalink: project-documentation/ai-competitive-monitor/enhanced-dynamic-entity-extraction-strategy-for-ai-monitor
---

# Enhanced Dynamic Entity Extraction Strategy for AI Monitor

## Problem Statement
Current entity extraction is limited to 5 technologies and 5 products per company, creating normalization issues where smaller companies get disproportionate coverage compared to larger ones. Additionally, obvious entities like "AI" are being missed.

## Proposed Solution: Dynamic Content-Aware Extraction

### 1. Remove Hard Limits
Instead of extracting a fixed number of entities, use a dynamic approach:
- **Minimum threshold**: Extract at least 10 entities per company
- **Content-based scaling**: Extract roughly 1 entity per 500 characters of content
- **Maximum reasonable limit**: Cap at 100 entities to prevent token overflow

### 2. Hierarchical Entity Extraction
Create a hierarchy of entities to capture both broad and specific concepts:

```
AI (concept)
├── Machine Learning (subconcept)
│   ├── Deep Learning (technique)
│   │   └── Transformer (architecture)
│   └── Reinforcement Learning (technique)
├── Natural Language Processing (capability)
│   ├── GPT-4 (model)
│   └── Claude (model)
└── Computer Vision (capability)
    └── DALL-E (model)
```

### 3. Multi-Pass Extraction Strategy

#### Pass 1: Broad Concepts
Extract high-level concepts and technologies:
- AI, ML, Data Science
- Cloud Computing, Edge Computing
- Automation, Digital Transformation

#### Pass 2: Specific Technologies
Extract specific implementations:
- Models: GPT-4, Claude, Llama, Gemini
- Frameworks: TensorFlow, PyTorch, JAX
- Platforms: AWS, Azure, GCP

#### Pass 3: Products and Features
Extract actual products and their features:
- Products with version numbers
- APIs and SDKs
- Services and solutions

#### Pass 4: Relationships and Context
Extract how entities relate to each other:
- "Uses", "Builds on", "Integrates with"
- "Competes with", "Partners with"
- "Enables", "Powered by"

### 4. Enhanced Prompt Structure

```javascript
const DYNAMIC_EXTRACTION_PROMPT = `
Analyze this content and extract ALL relevant entities without any artificial limits.

EXTRACTION GUIDELINES:
1. Extract EVERY technology, product, concept, and entity mentioned
2. Include both broad concepts (AI, ML) and specific implementations (GPT-4, TensorFlow)
3. Scale extraction based on content richness - more content = more entities
4. Create a hierarchy from general to specific
5. Include synonyms and variations (e.g., "AI", "Artificial Intelligence", "machine intelligence")

ENTITY CATEGORIES (extract ALL found, not limited to these):
- Concepts: AI, ML, NLP, Computer Vision, etc.
- Technologies: Models, frameworks, tools, languages
- Products: Named products, services, APIs
- Features: Capabilities, functionalities
- Companies: Partners, competitors, customers
- People: Founders, executives, researchers
- Standards: Protocols, specifications, benchmarks
- Methodologies: Techniques, approaches, algorithms

For a company like OpenAI with extensive content, we expect 50-100+ entities.
For a smaller startup, we might extract 20-30 entities.

Return entities with confidence scores and hierarchical relationships.
`;
```

### 5. Implementation Changes

#### Update ai-analyzer-baseline-enhanced-postgres.js:

```javascript
async function analyzeWithDynamicExtraction(content, company, url) {
  // Calculate expected entity count based on content
  const contentLength = content.length;
  const minEntities = 10;
  const entitiesPerChar = 1 / 500; // 1 entity per 500 chars
  const expectedEntities = Math.max(minEntities, Math.min(100, Math.floor(contentLength * entitiesPerChar)));
  
  const prompt = `
    Company: ${company}
    URL: ${url}
    Content Length: ${contentLength} characters
    Expected Entities: ${expectedEntities} (based on content richness)
    
    ${DYNAMIC_EXTRACTION_PROMPT}
    
    Extract approximately ${expectedEntities} entities from this content...
  `;
  
  // Multi-pass extraction
  const passes = [
    extractBroadConcepts(content),
    extractSpecificTechnologies(content),
    extractProductsAndFeatures(content),
    extractRelationships(content)
  ];
  
  const results = await Promise.all(passes);
  return mergeAndDeduplicate(results);
}
```

### 6. Entity Scoring and Filtering

Implement a scoring system to prioritize entities:

```javascript
function scoreEntity(entity, context) {
  let score = 0;
  
  // Frequency score
  score += entity.frequency * 10;
  
  // Relevance score
  if (entity.type === 'ai_technology') score += 50;
  if (entity.type === 'product') score += 40;
  if (entity.type === 'concept' && entity.name.includes('AI')) score += 30;
  
  // Context score
  if (entity.inTitle) score += 20;
  if (entity.inHeading) score += 15;
  if (entity.inBold) score += 10;
  
  return score;
}
```

### 7. Benefits of This Approach

1. **Proportional Coverage**: Larger companies with more content get more entities extracted
2. **Comprehensive**: Captures both high-level concepts and specific implementations
3. **Flexible**: Adapts to different content types and company sizes
4. **Hierarchical**: Shows relationships between concepts
5. **No Artificial Limits**: Extracts all relevant information

### 8. Expected Results

- **Large AI Company (OpenAI, Google)**: 60-100 entities
- **Medium Company (Cohere, Stability AI)**: 30-50 entities  
- **Small Startup**: 15-25 entities
- **All companies**: Will have "AI" as a core concept

### 9. Visualization Impact

This will create a much richer 3D force graph:
- More connection points between companies
- Better clustering around shared technologies
- Clearer differentiation between company capabilities
- More nuanced competitive landscape view

### 10. Next Steps

1. Update the extraction prompt in ai-analyzer-baseline-enhanced-postgres.js
2. Remove any hardcoded limits in the extraction logic
3. Implement multi-pass extraction
4. Add entity scoring and deduplication
5. Test with a few companies to validate results
6. Run full extraction across all companies
7. Update 3D graph to handle larger entity sets efficiently