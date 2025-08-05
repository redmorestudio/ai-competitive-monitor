#!/usr/bin/env node

// SSL Certificate fix for Heroku PostgreSQL
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

/**
 * Enhanced Dynamic Entity Extractor for PostgreSQL
 * 
 * MAJOR IMPROVEMENTS:
 * 1. Proper distinction between entities (proper nouns) and attributes (concepts/technologies)
 * 2. Dynamic scaling based on content size
 * 3. No artificial limits - extract ALL relevant information
 * 4. Structured for future domain extensibility
 * 5. No forced additions - only extracts what's actually present
 */

const Groq = require('groq-sdk');
const path = require('path');
const fs = require('fs');
const { db, end } = require('./postgres-db');

// Only load dotenv in development
if (!process.env.GITHUB_ACTIONS && !process.env.POSTGRES_CONNECTION_STRING) {
  try {
    require('dotenv').config();
  } catch (e) {
    // dotenv not available or no .env file - this is fine
  }
}

// Validate API key
if (!process.env.GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// AI Domain Configuration (structured for future extensibility)
const AI_DOMAIN = {
  name: "AI/Technology",
  entities: {
    companies: "AI companies, tech companies, startups, corporations",
    products: "Named products, services, APIs, platforms with proper names",
    people: "Founders, CEOs, researchers, executives, engineers",
    organizations: "Research labs, institutions, partnerships, alliances"
  },
  attributes: {
    technologies: "Programming languages, frameworks, tools, platforms, infrastructure",
    methodologies: "Techniques, approaches, algorithms, processes",
    capabilities: "What the technology can do - NLP, vision, speech, reasoning",
    concepts: "AI, ML, deep learning, neural networks, transformers",
    standards: "Benchmarks, protocols, certifications, evaluations"
  },
  focusAreas: ["AI", "artificial intelligence", "machine learning", "deep learning", "neural networks", "automation"],
  relationships: ["develops", "uses", "partners_with", "competes_with", "integrates_with", "acquired_by"]
};

// Dynamic extraction prompt that properly distinguishes entities from attributes
const DYNAMIC_EXTRACTION_PROMPT = `You are an AI competitive intelligence analyst. Extract information with proper categorization.

CRITICAL DISTINCTIONS:
- ENTITIES are proper nouns - specific named things (companies, products, people)
- ATTRIBUTES are common nouns - concepts, technologies, capabilities

EXTRACTION RULES:
1. Extract ALL relevant information without any artificial limits
2. Scale extraction based on content - longer content should yield more data
3. DO NOT add anything not explicitly mentioned in the content
4. Properly categorize as entity vs attribute

ENTITIES TO EXTRACT (proper nouns with names):

**COMPANIES** - Extract only the most significant companies:
- The company being analyzed (primary subject)
- Major strategic partners (only if partnership is central to content)
- Direct competitors discussed in detail (not just mentioned in passing)
- Significant acquisitions or mergers (if they are the main topic)
- LIMIT: Maximum 15 companies per page
- DO NOT extract: Companies mentioned only in lists, passing references, or minor mentions

**PRODUCTS** - Extract ALL mentioned:
- Named products and services (ChatGPT, Claude, Bard)
- APIs and platforms (OpenAI API, Vertex AI)
- Specific versions (GPT-4, GPT-3.5)

**PEOPLE** - Extract ALL mentioned:
- Executives and founders
- Researchers and engineers
- Board members and advisors
- Notable employees or alumni

**ORGANIZATIONS** - Extract ALL mentioned:
- Research institutions
- Universities and labs
- Standards bodies
- Industry partnerships

ATTRIBUTES TO EXTRACT (concepts and characteristics):

**TECHNOLOGIES** - Extract ALL mentioned:
- Programming languages (Python, JavaScript, C++)
- Frameworks (TensorFlow, PyTorch, JAX)
- Infrastructure (AWS, Kubernetes, Docker)
- Databases (PostgreSQL, Redis, Pinecone)

**METHODOLOGIES** - Extract ALL mentioned:
- AI/ML techniques (fine-tuning, RLHF, RAG)
- Algorithms (attention, backpropagation)
- Approaches (few-shot learning, zero-shot)
- Processes (training, inference, deployment)

**CAPABILITIES** - Extract ALL mentioned:
- What the AI can do (text generation, translation, summarization)
- Modalities (vision, speech, multimodal)
- Use cases (coding, analysis, creative writing)

**CONCEPTS** - Extract ALL mentioned:
- Broad: AI, artificial intelligence, machine learning
- Specific: deep learning, neural networks, transformers
- Emerging: AGI, consciousness, alignment

**STANDARDS** - Extract ALL mentioned:
- Benchmarks (MMLU, HumanEval, GLUE)
- Evaluations and metrics
- Certifications and compliance

Return a JSON with this structure:
{
  "entities": {
    "companies": [
      {"name": "OpenAI", "type": "company", "role": "self"},
      {"name": "Microsoft", "type": "company", "role": "partner"}
    ],
    "products": [
      {"name": "ChatGPT", "type": "product", "category": "ai_assistant"},
      {"name": "GPT-4", "type": "product", "category": "language_model"}
    ],
    "people": [
      {"name": "Sam Altman", "type": "person", "role": "CEO"}
    ],
    "organizations": [
      {"name": "AI Safety Institute", "type": "organization", "category": "research"}
    ]
  },
  "attributes": {
    "technologies": [
      {"name": "Python", "type": "technology", "category": "language"},
      {"name": "PyTorch", "type": "technology", "category": "ml_framework"}
    ],
    "methodologies": [
      {"name": "RLHF", "type": "methodology", "category": "training"},
      {"name": "fine-tuning", "type": "methodology", "category": "optimization"}
    ],
    "capabilities": [
      {"name": "natural language processing", "type": "capability", "category": "nlp"},
      {"name": "code generation", "type": "capability", "category": "coding"}
    ],
    "concepts": [
      {"name": "artificial intelligence", "type": "concept", "category": "broad"},
      {"name": "deep learning", "type": "concept", "category": "specific"}
    ],
    "standards": [
      {"name": "MMLU", "type": "standard", "category": "benchmark"}
    ]
  }
}

REMEMBER: 
- Extract ALL items found, not just 5 or 10
- Only extract what's actually in the content
- Properly distinguish entities from attributes`;

async function calculateExpectedExtraction(content) {
  const contentLength = content.length;
  const wordsCount = content.split(/\s+/).length;
  
  // Base calculation: 1 item per 100 words or 500 characters
  const byWords = Math.floor(wordsCount / 100);
  const byChars = Math.floor(contentLength / 500);
  
  // Take the higher estimate
  const estimated = Math.max(byWords, byChars);
  
  // Set bounds
  const minimum = 15;  // Even small companies should have at least 15 items
  const maximum = 150; // Reasonable upper limit to avoid token issues
  
  return {
    expected: Math.max(minimum, Math.min(maximum, estimated)),
    contentLength,
    wordsCount
  };
}

async function analyzeWithDynamicExtraction(content, company, url) {
  const maxRetries = 3;
  const baseDelay = 5000;
  
  // Calculate expected extraction based on content
  const expectations = await calculateExpectedExtraction(content);
  
  console.log(`   📊 Content analysis: ${expectations.wordsCount} words, expecting ~${expectations.expected} total items`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an AI competitive intelligence analyst. Extract entities and attributes comprehensively. Always respond with valid JSON only, no markdown formatting."
          },
          {
            role: "user",
            content: `Company: ${company}
URL: ${url}
Content Length: ${expectations.contentLength} characters (${expectations.wordsCount} words)
Expected Items: AT LEAST ${expectations.expected} total items based on content richness

${DYNAMIC_EXTRACTION_PROMPT}

Content to analyze:
${content}`
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      // Calculate comprehensive stats
      const stats = calculateExtractionStats(result);
      const relationships = buildRelationships(result, company);
      
      return {
        entities: result.entities || {},
        attributes: result.attributes || {},
        stats: stats,
        relationships: relationships,
        metadata: {
          company: company,
          url: url,
          extraction_date: new Date().toISOString(),
          content_length: content.length,
          word_count: expectations.wordsCount,
          expected_items: expectations.expected,
          actual_items: stats.total_items,
          extraction_quality: determineExtractionQuality(stats, expectations),
          coverage_ratio: stats.total_items / expectations.expected,
          ai_model: 'groq-llama-3.3-70b-dynamic'
        }
      };
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`   ⚠️  Attempt ${attempt} failed, retrying in ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function calculateExtractionStats(result) {
  const stats = {
    total_items: 0,
    total_entities: 0,
    total_attributes: 0,
    entities: {
      companies: 0,
      products: 0,
      people: 0,
      organizations: 0
    },
    attributes: {
      technologies: 0,
      methodologies: 0,
      capabilities: 0,
      concepts: 0,
      standards: 0
    }
  };
  
  // Count entities
  if (result.entities) {
    for (const [type, items] of Object.entries(result.entities)) {
      if (Array.isArray(items)) {
        stats.entities[type] = items.length;
        stats.total_entities += items.length;
      }
    }
  }
  
  // Count attributes
  if (result.attributes) {
    for (const [type, items] of Object.entries(result.attributes)) {
      if (Array.isArray(items)) {
        stats.attributes[type] = items.length;
        stats.total_attributes += items.length;
      }
    }
  }
  
  stats.total_items = stats.total_entities + stats.total_attributes;
  
  return stats;
}

function buildRelationships(result, company) {
  const relationships = [];
  
  // Entity to entity relationships
  if (result.entities) {
    // Company to products
    if (result.entities.companies && result.entities.products) {
      const selfCompany = result.entities.companies.find(c => c.role === 'self' || c.name === company);
      if (selfCompany) {
        result.entities.products.forEach(product => {
          relationships.push({
            from: selfCompany.name,
            from_type: 'company',
            to: product.name,
            to_type: 'product',
            relationship: 'develops'
          });
        });
      }
    }
    
    // Company to people
    if (result.entities.companies && result.entities.people) {
      const selfCompany = result.entities.companies.find(c => c.role === 'self' || c.name === company);
      if (selfCompany) {
        result.entities.people.forEach(person => {
          relationships.push({
            from: person.name,
            from_type: 'person',
            to: selfCompany.name,
            to_type: 'company',
            relationship: 'works_at'
          });
        });
      }
    }
  }
  
  // Entity to attribute relationships
  if (result.entities && result.attributes) {
    // Products use technologies
    if (result.entities.products && result.attributes.technologies) {
      result.entities.products.forEach(product => {
        result.attributes.technologies.forEach(tech => {
          if (tech.category === 'ml_framework' || tech.category === 'infrastructure') {
            relationships.push({
              from: product.name,
              from_type: 'product',
              to: tech.name,
              to_type: 'technology',
              relationship: 'uses'
            });
          }
        });
      });
    }
    
    // Products have capabilities
    if (result.entities.products && result.attributes.capabilities) {
      result.entities.products.forEach(product => {
        result.attributes.capabilities.forEach(capability => {
          relationships.push({
            from: product.name,
            from_type: 'product',
            to: capability.name,
            to_type: 'capability',
            relationship: 'provides'
          });
        });
      });
    }
  }
  
  return relationships;
}

function determineExtractionQuality(stats, expectations) {
  const ratio = stats.total_items / expectations.expected;
  
  if (ratio >= 0.9) return 'excellent';
  if (ratio >= 0.7) return 'good';
  if (ratio >= 0.5) return 'fair';
  return 'poor';
}

async function storeEnhancedAnalysis(company, url, extractedData) {
  try {
    // Prepare data for storage
    const entities = extractedData.entities || {};
    const attributes = extractedData.attributes || {};
    
    // For backward compatibility, merge into expected format
    const mergedData = {
      ...entities,
      ...attributes
    };
    
    await db.run(`
      INSERT INTO intelligence.baseline_analysis 
      (company, url, 
       entities, themes, sentiment, key_points, relationships,
       company_type, page_purpose, key_topics, main_message, 
       target_audience, unique_value, trust_elements, differentiation, 
       technology_stack, analysis_date, ai_model)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), $17)
      ON CONFLICT (company, url) DO UPDATE SET
        entities = EXCLUDED.entities,
        themes = EXCLUDED.themes,
        sentiment = EXCLUDED.sentiment,
        key_points = EXCLUDED.key_points,
        relationships = EXCLUDED.relationships,
        company_type = EXCLUDED.company_type,
        page_purpose = EXCLUDED.page_purpose,
        key_topics = EXCLUDED.key_topics,
        main_message = EXCLUDED.main_message,
        target_audience = EXCLUDED.target_audience,
        unique_value = EXCLUDED.unique_value,
        trust_elements = EXCLUDED.trust_elements,
        differentiation = EXCLUDED.differentiation,
        technology_stack = EXCLUDED.technology_stack,
        analysis_date = NOW(),
        ai_model = EXCLUDED.ai_model
    `, [
      company,
      url,
      JSON.stringify(mergedData),
      JSON.stringify(extractedData.stats),
      JSON.stringify(extractedData.metadata),
      JSON.stringify(extractedData.metadata),
      JSON.stringify(extractedData.relationships),
      identifyCompanyType(entities, attributes),
      'competitive_intelligence',
      JSON.stringify(extractTopConcepts(attributes)),
      generateSummary(extractedData),
      identifyTargetAudience(entities, attributes),
      extractUniqueValue(entities, attributes),
      JSON.stringify(attributes.concepts || []),
      identifyDifferentiation(entities, attributes),
      JSON.stringify(attributes.technologies || []),
      'groq-llama-3.3-70b-dynamic'
    ]);

    console.log(`   ✅ Stored analysis (${extractedData.stats.total_items} items: ${extractedData.stats.total_entities} entities, ${extractedData.stats.total_attributes} attributes)`);
    console.log(`   📈 Quality: ${extractedData.metadata.extraction_quality} (${Math.round(extractedData.metadata.coverage_ratio * 100)}% of expected)`);
  } catch (error) {
    console.error(`   ❌ Failed to store analysis:`, error.message);
    throw error;
  }
}

// Helper functions
function identifyCompanyType(entities, attributes) {
  if (entities.products?.some(p => p.category === 'language_model')) return 'AI Model Provider';
  if (entities.products?.some(p => p.category === 'ai_assistant')) return 'AI Application';
  if (attributes.technologies?.some(t => t.category === 'ml_framework')) return 'ML Infrastructure';
  return 'AI Company';
}

function extractTopConcepts(attributes) {
  return (attributes.concepts || [])
    .map(c => c.name)
    .slice(0, 10);
}

function generateSummary(extractedData) {
  const e = extractedData.stats.entities;
  const a = extractedData.stats.attributes;
  
  return `AI company with ${e.products} products, ${e.companies} partnerships, using ${a.technologies} technologies and ${a.methodologies} methodologies. ${extractedData.metadata.extraction_quality} extraction quality.`;
}

function identifyTargetAudience(entities, attributes) {
  if (entities.products?.some(p => p.category === 'developer_api')) return 'developers';
  if (entities.products?.some(p => p.category === 'enterprise')) return 'enterprise';
  return 'general';
}

function extractUniqueValue(entities, attributes) {
  const uniqueProducts = entities.products?.slice(0, 3).map(p => p.name).join(', ');
  return uniqueProducts || 'AI-powered solutions';
}

function identifyDifferentiation(entities, attributes) {
  const uniqueTech = attributes.technologies?.filter(t => 
    t.category === 'proprietary' || t.category === 'ml_framework'
  );
  return uniqueTech?.length > 0 ? 'proprietary technology' : 'comprehensive platform';
}

// Main processing function
async function processAllSnapshots() {
  console.log('🚀 Starting Dynamic Entity & Attribute Extraction...');
  console.log('🎯 Properly distinguishing entities (proper nouns) from attributes (concepts)');
  console.log('📊 Scaling extraction based on content richness\n');

  const forceReanalyze = process.argv.includes('--force');
  
  if (forceReanalyze) {
    console.log('🔄 Force flag detected - re-analyzing all content');
  }

  // Get all companies and their latest content
  const latestSnapshots = await db.all(`
    SELECT DISTINCT ON (company, url)
      company,
      url,
      content as markdown_text,
      created_at
    FROM processed_content.markdown_pages
    WHERE content IS NOT NULL AND LENGTH(content) > 100
    ORDER BY company, url, created_at DESC
  `);

  console.log(`📋 Found ${latestSnapshots.length} URLs to analyze\n`);

  let processed = 0;
  const results = {
    successful: 0,
    failed: 0,
    totalItems: 0,
    totalEntities: 0,
    totalAttributes: 0,
    qualityBreakdown: {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    }
  };

  for (const snapshot of latestSnapshots) {
    processed++;
    const progress = Math.round((processed / latestSnapshots.length) * 100);
    
    console.log(`\n[${processed}/${latestSnapshots.length}] (${progress}%) Analyzing ${snapshot.company}`);
    console.log(`   📍 ${snapshot.url}`);
    
    try {
      if (!snapshot.markdown_text || snapshot.markdown_text.length < 100) {
        console.log('   ⚠️  Skipping - content too small');
        continue;
      }

      console.log('   🧠 Extracting entities and attributes...');
      const extractedData = await analyzeWithDynamicExtraction(
        snapshot.markdown_text.substring(0, 50000),
        snapshot.company,
        snapshot.url
      );

      await storeEnhancedAnalysis(
        snapshot.company,
        snapshot.url,
        extractedData
      );

      // Update statistics
      results.successful++;
      results.totalItems += extractedData.stats.total_items;
      results.totalEntities += extractedData.stats.total_entities;
      results.totalAttributes += extractedData.stats.total_attributes;
      results.qualityBreakdown[extractedData.metadata.extraction_quality]++;
      
      // Log extraction results
      console.log(`   📊 Extraction Results:`);
      console.log(`      Entities (${extractedData.stats.total_entities} total):`);
      console.log(`        - Companies: ${extractedData.stats.entities.companies}`);
      console.log(`        - Products: ${extractedData.stats.entities.products}`);
      console.log(`        - People: ${extractedData.stats.entities.people}`);
      console.log(`        - Organizations: ${extractedData.stats.entities.organizations}`);
      console.log(`      Attributes (${extractedData.stats.total_attributes} total):`);
      console.log(`        - Technologies: ${extractedData.stats.attributes.technologies}`);
      console.log(`        - Methodologies: ${extractedData.stats.attributes.methodologies}`);
      console.log(`        - Capabilities: ${extractedData.stats.attributes.capabilities}`);
      console.log(`        - Concepts: ${extractedData.stats.attributes.concepts}`);
      
    } catch (error) {
      console.error(`   ❌ Analysis failed:`, error.message);
      results.failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`📊 Results:`);
  console.log(`   - Successful: ${results.successful}`);
  console.log(`   - Failed: ${results.failed}`);
  console.log(`   - Total Items: ${results.totalItems}`);
  console.log(`     - Entities: ${results.totalEntities}`);
  console.log(`     - Attributes: ${results.totalAttributes}`);
  
  if (results.successful > 0) {
    console.log(`   - Avg Items/Company: ${Math.round(results.totalItems / results.successful)}`);
    console.log(`   - Avg Entities/Company: ${Math.round(results.totalEntities / results.successful)}`);
    console.log(`   - Avg Attributes/Company: ${Math.round(results.totalAttributes / results.successful)}`);
  }
  
  console.log(`\n📈 Extraction Quality:`);
  console.log(`   - Excellent: ${results.qualityBreakdown.excellent}`);
  console.log(`   - Good: ${results.qualityBreakdown.good}`);
  console.log(`   - Fair: ${results.qualityBreakdown.fair}`);
  console.log(`   - Poor: ${results.qualityBreakdown.poor}`);

  return results;
}

// Export for use in other modules
module.exports = {
  analyzeWithDynamicExtraction,
  storeEnhancedAnalysis,
  processAllSnapshots
};

// Run if called directly
if (require.main === module) {
  processAllSnapshots()
    .then((results) => {
      console.log('\n✅ Entity & attribute extraction complete!');
      console.log('🎯 Next step: Run generate-static-data-three-db-postgres.js');
      
      end();
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Extraction failed:', error.message);
      console.error('Stack trace:', error.stack);
      end();
      process.exit(1);
    });
}
