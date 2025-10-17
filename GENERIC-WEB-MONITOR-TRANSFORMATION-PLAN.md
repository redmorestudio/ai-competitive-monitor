# GENERIC WEB MONITOR - TRANSFORMATION PLAN
*Generated: 2025-01-16*
*Current State: ai-competitive-monitor-correct (AI-specific)*
*Target State: generic-web-monitor (domain-agnostic framework)*

---

## EXECUTIVE SUMMARY

Transform AI-specific monitoring system into a **domain-agnostic framework** that can monitor ANY industry (energy drinks, automobiles, SaaS, etc.) with:

1. **AI-powered self-configuration** - "Monitor energy drinks: Red Bull and Monster" → Auto-discovers 12 competitors, 48 URLs
2. **Manual configuration** - Full control over competitors, URLs, and importance scales
3. **User-defined importance bands** - Custom 0-10 scale with domain-specific definitions
4. **Multi-profile support** - Run multiple domains simultaneously (AI + Energy Drinks + Automobiles)

**Safety Strategy**: New repo `generic-web-monitor`, keep `ai-competitive-monitor-correct` untouched for rollback.

---

## CURRENT CONTEXT

### Repository State
- **Local Dir**: `/Users/sethredmore/ai-competitive-monitor-correct`
- **Git Status**: Modified files (`.DS_Store`, `.github/`, `index.html`), uncommitted changes
- **Recent Commits**: Frontend fixes (v69→v70), AI integration, CORS fixes
- **Untracked Files**: `index-base64.txt`, `update-index.json`

### Architecture Analysis
**39 JavaScript files** with AI-specific hardcoding identified:
- `IntelligentMonitor.js` (lines 13-17, 19-31) - Hardcoded AI keywords and page weights
- `ClaudeIntegration.js` (line 148) - AI-specific prompts
- `IntelligentMonitor-LLM.js` (line 153) - "You are an expert competitive intelligence analyst for AI companies..."
- `CompanyConfigComplete.js` - 16 AI companies hardcoded

**Current Backend**: Dual (Google Apps Script + GitHub Actions)
**Current Frontend**: `index.html` - GitHub Actions dashboard

---

## TRANSFORMATION PHASES

### PHASE 0: Repository & Safety Setup ✅

#### New Repository Structure
```
generic-web-monitor/           # NEW repo (the framework)
├── core/                      # Domain-agnostic engine
│   ├── monitoring/
│   │   └── UniversalMonitor.js        # Refactored from IntelligentMonitor.js
│   ├── analysis/
│   │   └── UniversalAnalyzer.js       # Refactored Claude integration
│   ├── scoring/
│   │   └── ProfileScoring.js          # Dynamic scoring engine
│   └── storage/
│       └── MultiProfileStorage.js     # Per-profile data management
├── profiles/
│   ├── schemas/
│   │   └── profile-schema.json        # Profile JSON schema
│   ├── templates/
│   │   ├── generic-analysis.txt       # Default Claude prompt template
│   │   ├── ai-technology-analysis.txt # AI-specific prompt
│   │   └── energy-drinks-analysis.txt # Energy drinks prompt
│   └── examples/
│       ├── ai-competitors.json        # Migrated from current system
│       ├── energy-drinks.json         # Example profile
│       └── automobiles.json           # Example profile
├── discovery/                 # AI-powered profile generation
│   ├── DomainDiscovery.js            # Main orchestrator
│   ├── CompetitorResearch.js         # Claude-powered competitor finding
│   ├── URLDiscovery.js               # Claude-powered URL discovery
│   ├── KeywordExtraction.js          # Domain keyword extraction
│   └── ImportanceBands.js            # Importance band suggester
├── dashboard/                 # Multi-profile UI
│   ├── index.html                    # Refactored with profile selector
│   ├── setup-wizard.html             # Profile creation wizard
│   └── profile-manager.html          # Profile management interface
└── instances/                 # Deployable configurations
    ├── ai-competitors/               # Current system (migrated)
    └── energy-drinks/                # Example: new domain

ai-competitive-monitor-correct/ # Keep as-is (rollback safety)
```

#### Safety Strategy
- ✅ Create new repo first, don't touch existing
- ✅ Parallel development - old system keeps working
- ✅ Export AI profile from old system as test case
- ✅ Only retire old system when new one proven

---

### PHASE 1: Core Architecture - Extract & Generalize 🏗️

#### 1.1 Configuration Schema
**File**: `profiles/schemas/profile-schema.json`

**Key Concept**: ALL domain-specific information moves to profile config

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["profile"],
  "properties": {
    "profile": {
      "type": "object",
      "required": ["id", "name", "domain", "competitors", "importanceBands"],
      "properties": {
        "id": {
          "type": "string",
          "description": "Unique identifier (UUID)"
        },
        "name": {
          "type": "string",
          "description": "Display name",
          "example": "Energy Drinks Monitor"
        },
        "domain": {
          "type": "string",
          "description": "Industry/domain identifier",
          "example": "energy-drinks"
        },
        "description": {
          "type": "string",
          "description": "What this profile monitors"
        },

        "competitors": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "urls"],
            "properties": {
              "name": {"type": "string", "example": "Red Bull"},
              "urls": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["url", "type"],
                  "properties": {
                    "url": {"type": "string", "format": "uri"},
                    "type": {"type": "string", "enum": ["homepage", "products", "pricing", "blog", "news", "docs"]}
                  }
                }
              },
              "keywords": {
                "type": "array",
                "items": {"type": "string"},
                "example": ["energy", "caffeine", "taurine"]
              }
            }
          }
        },

        "importanceBands": {
          "type": "array",
          "description": "User-defined importance scale (0-10)",
          "items": {
            "type": "object",
            "required": ["min", "max", "label", "description", "examples"],
            "properties": {
              "min": {"type": "integer", "minimum": 0, "maximum": 10},
              "max": {"type": "integer", "minimum": 0, "maximum": 10},
              "label": {"type": "string", "example": "Critical"},
              "description": {"type": "string", "example": "New product lines, major formula changes"},
              "examples": {
                "type": "array",
                "items": {"type": "string"},
                "example": ["Launching new energy drink line", "Discontinuing major product"]
              }
            }
          }
        },

        "contentTypes": {
          "type": "array",
          "items": {"type": "string"},
          "description": "Types of content to monitor",
          "example": ["products", "pricing", "blog", "news", "sponsorships"]
        },

        "pageWeights": {
          "type": "object",
          "description": "Multipliers for different page types",
          "example": {
            "products": 2.0,
            "pricing": 2.0,
            "sponsorships": 1.5,
            "news": 1.2,
            "blog": 1.0,
            "homepage": 0.8
          }
        },

        "domainKeywords": {
          "type": "object",
          "required": ["high", "medium", "low"],
          "properties": {
            "high": {
              "type": "array",
              "items": {"type": "string"},
              "description": "High-priority keywords",
              "example": ["launch", "new product", "price", "formula", "discontinued"]
            },
            "medium": {
              "type": "array",
              "items": {"type": "string"},
              "example": ["flavor", "packaging", "partnership", "sponsor"]
            },
            "low": {
              "type": "array",
              "items": {"type": "string"},
              "example": ["campaign", "promotion", "update"]
            }
          }
        },

        "analysisPromptTemplate": {
          "type": "string",
          "description": "Path to Claude prompt template",
          "example": "templates/energy-drinks-analysis.txt"
        },

        "discovery": {
          "type": "object",
          "properties": {
            "enabled": {"type": "boolean"},
            "autoExpand": {"type": "boolean"},
            "seedCompetitors": {
              "type": "array",
              "items": {"type": "string"}
            },
            "maxCompetitors": {"type": "integer"}
          }
        },

        "created": {"type": "string", "format": "date-time"},
        "lastModified": {"type": "string", "format": "date-time"},
        "status": {"type": "string", "enum": ["active", "paused", "archived"]}
      }
    }
  }
}
```

**Example Profile - Energy Drinks**:
```json
{
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Energy Drinks Monitor",
    "domain": "energy-drinks",
    "description": "Track energy drink market changes including new products, pricing, and sponsorships",

    "competitors": [
      {
        "name": "Red Bull",
        "urls": [
          {"url": "https://redbull.com", "type": "homepage"},
          {"url": "https://redbull.com/products", "type": "products"},
          {"url": "https://redbull.com/energydrink", "type": "products"}
        ],
        "keywords": ["energy", "caffeine", "taurine", "B-vitamins", "wings"]
      },
      {
        "name": "Monster Energy",
        "urls": [
          {"url": "https://monsterenergy.com", "type": "homepage"},
          {"url": "https://monsterenergy.com/products", "type": "products"}
        ],
        "keywords": ["energy", "extreme", "unleash the beast"]
      }
    ],

    "importanceBands": [
      {
        "min": 9, "max": 10,
        "label": "Critical",
        "description": "New product lines, major formula changes, market entry/exit, major recalls",
        "examples": [
          "Launching new energy drink line",
          "Discontinuing major product",
          "Major formula reformulation",
          "Entering new market (country/segment)",
          "Safety recall announcement"
        ]
      },
      {
        "min": 7, "max": 8,
        "label": "Important",
        "description": "New flavors, packaging redesigns, major sponsorships, pricing changes",
        "examples": [
          "New flavor announcement",
          "Partnership with major athlete/team",
          "Significant price increase",
          "Can/bottle redesign",
          "New size variant"
        ]
      },
      {
        "min": 5, "max": 6,
        "label": "Moderate",
        "description": "Limited editions, regional launches, promotional campaigns, website updates",
        "examples": [
          "Limited edition flavor",
          "Regional product launch",
          "Seasonal promotion",
          "Website redesign"
        ]
      },
      {
        "min": 3, "max": 4,
        "label": "Low",
        "description": "Minor promotional campaigns, social media campaigns, event sponsorships",
        "examples": [
          "Social media campaign launch",
          "Minor event sponsorship",
          "Promotional contest"
        ]
      },
      {
        "min": 1, "max": 2,
        "label": "Minimal",
        "description": "Routine content updates, ingredient list formatting, FAQ updates",
        "examples": [
          "Updated ingredient list format",
          "Added FAQ entry",
          "Minor copy changes"
        ]
      },
      {
        "min": 0, "max": 0,
        "label": "Trivial",
        "description": "Typos, formatting changes, copyright updates",
        "examples": [
          "Fixed spelling error",
          "Updated copyright year",
          "Minor formatting adjustment"
        ]
      }
    ],

    "contentTypes": ["products", "pricing", "blog", "news", "sponsorships"],

    "pageWeights": {
      "products": 2.0,
      "pricing": 2.0,
      "sponsorships": 1.5,
      "news": 1.2,
      "blog": 1.0,
      "homepage": 0.8
    },

    "domainKeywords": {
      "high": ["launch", "new product", "price", "formula", "discontinued", "recall", "ingredients"],
      "medium": ["flavor", "packaging", "partnership", "sponsor", "event", "redesign"],
      "low": ["campaign", "promotion", "update", "refresh", "contest"]
    },

    "analysisPromptTemplate": "templates/energy-drinks-analysis.txt",

    "discovery": {
      "enabled": true,
      "autoExpand": true,
      "seedCompetitors": ["Red Bull", "Monster Energy"],
      "maxCompetitors": 15
    },

    "created": "2025-01-16T10:00:00Z",
    "lastModified": "2025-01-16T10:00:00Z",
    "status": "active"
  }
}
```

#### 1.2 Refactor Core Monitoring Engine
**File**: `core/monitoring/UniversalMonitor.js`

**Current** (`IntelligentMonitor.js`):
```javascript
// Lines 13-17: HARDCODED keywords
const INTELLIGENT_CONFIG = {
  keywords: {
    high: ['price', 'pricing', 'launch', 'new', 'release', 'announce'],
    medium: ['feature', 'update', 'improve', 'enhance', 'api', 'model'],
    low: ['fix', 'patch', 'minor', 'small', 'tweak']
  },

  // Lines 19-31: HARDCODED page weights
  pageWeights: {
    'homepage': 0.8,
    'news': 1.2,
    'blog': 1.2,
    'pricing': 2.0,
    'announcement': 2.0
  }
};
```

**New** (`UniversalMonitor.js`):
```javascript
/**
 * Universal Monitor - Domain-Agnostic Monitoring Engine
 * Loads all configuration from profile instead of hardcoding
 */

class UniversalMonitor {
  constructor(profile) {
    this.profile = profile;
    this.keywords = profile.domainKeywords;
    this.pageWeights = profile.pageWeights;
    this.maxContentLength = 50000;
    this.crawlDelay = 2000;
  }

  /**
   * Calculate relevance score using profile-specific keywords
   */
  calculateRelevanceScore(oldContent, newContent, url) {
    let score = 5;

    // Use profile keywords instead of hardcoded
    this.keywords.high.forEach(keyword => {
      const oldCount = (oldContent.match(new RegExp(keyword, 'gi')) || []).length;
      const newCount = (newContent.match(new RegExp(keyword, 'gi')) || []).length;
      if (newCount > oldCount) {
        score += 2;
      }
    });

    this.keywords.medium.forEach(keyword => {
      const oldCount = (oldContent.match(new RegExp(keyword, 'gi')) || []).length;
      const newCount = (newContent.match(new RegExp(keyword, 'gi')) || []).length;
      if (newCount > oldCount) {
        score += 1;
      }
    });

    this.keywords.low.forEach(keyword => {
      if (newContent.toLowerCase().includes(keyword)) {
        score -= 1;
      }
    });

    // Apply profile-specific page weights
    const pageType = this.identifyPageType(url);
    const weight = this.pageWeights[pageType] || 1.0;
    score = Math.round(score * weight);

    return Math.max(1, Math.min(10, score));
  }

  /**
   * Find matching importance band from profile
   */
  findImportanceBand(score) {
    return this.profile.importanceBands.find(band =>
      score >= band.min && score <= band.max
    );
  }

  /**
   * Process monitor with profile context
   */
  async processMonitor(competitor) {
    const results = {
      profileId: this.profile.id,
      profileName: this.profile.name,
      company: competitor.name,
      urls: [],
      changes: [],
      errors: []
    };

    for (const urlObj of competitor.urls) {
      try {
        const extraction = await this.extractPageContent(urlObj.url);

        if (!extraction.success) {
          results.errors.push({
            url: urlObj.url,
            error: extraction.error
          });
          continue;
        }

        const baseline = await this.getBaseline(urlObj.url);

        if (!baseline) {
          // First time - create baseline
          await this.storeBaseline(competitor.name, urlObj.url, extraction);
          results.urls.push({
            url: urlObj.url,
            type: urlObj.type,
            status: 'baseline_created'
          });
        } else if (baseline.contentHash !== extraction.contentHash) {
          // Content changed - calculate score with profile
          const score = this.calculateRelevanceScore(
            baseline.content,
            extraction.content,
            urlObj.url
          );

          const importanceBand = this.findImportanceBand(score);

          const change = {
            profileId: this.profile.id,
            profileName: this.profile.name,
            company: competitor.name,
            url: urlObj.url,
            urlType: urlObj.type,
            relevanceScore: score,
            importanceBand: importanceBand,
            detectedAt: new Date().toISOString()
          };

          results.changes.push(change);
          await this.storeBaseline(competitor.name, urlObj.url, extraction);

          results.urls.push({
            url: urlObj.url,
            type: urlObj.type,
            status: 'changed',
            relevanceScore: score,
            importanceBand: importanceBand.label
          });
        } else {
          results.urls.push({
            url: urlObj.url,
            type: urlObj.type,
            status: 'unchanged'
          });
        }

        await this.sleep(this.crawlDelay);

      } catch (error) {
        results.errors.push({
          url: urlObj.url,
          error: error.toString()
        });
      }
    }

    return results;
  }

  // ... other methods (extractPageContent, getBaseline, etc.)
}

/**
 * Load profile and create monitor instance
 */
function createMonitor(profileId) {
  const profile = loadProfile(profileId);
  return new UniversalMonitor(profile);
}

/**
 * Monitor all competitors in a profile
 */
async function monitorProfile(profileId) {
  const monitor = createMonitor(profileId);
  const profile = monitor.profile;

  const allResults = {
    profileId: profile.id,
    profileName: profile.name,
    startTime: new Date().toISOString(),
    competitors: [],
    totalChanges: 0
  };

  for (const competitor of profile.competitors) {
    const result = await monitor.processMonitor(competitor);
    allResults.competitors.push(result);
    allResults.totalChanges += result.changes.length;
  }

  allResults.endTime = new Date().toISOString();
  return allResults;
}
```

#### 1.3 Refactor Claude Integration
**File**: `core/analysis/UniversalAnalyzer.js`

**Current** (`IntelligentMonitor-LLM.js` line 153):
```javascript
const prompt = `You are an expert competitive intelligence analyst for AI companies.

Company: ${company}
URL: ${url}
Page Type: ${identifyPageType(url)}

PREVIOUS CONTENT (excerpt):
${previousPreview}

NEW CONTENT (excerpt):
${contentPreview}

Focus on WHAT CHANGED and WHY IT MATTERS.
...
`;
```

**New** (`UniversalAnalyzer.js`):
```javascript
/**
 * Universal Analyzer - Profile-Driven AI Analysis
 */

class UniversalAnalyzer {
  constructor(profile) {
    this.profile = profile;
    this.templateCache = {};
  }

  /**
   * Load and cache prompt template
   */
  loadPromptTemplate(templatePath) {
    if (this.templateCache[templatePath]) {
      return this.templateCache[templatePath];
    }

    // Load from file/storage
    const template = loadTemplateFile(templatePath);
    this.templateCache[templatePath] = template;
    return template;
  }

  /**
   * Format importance bands for prompt
   */
  formatImportanceBands() {
    return this.profile.importanceBands.map(band =>
      `${band.min}-${band.max} (${band.label}): ${band.description}\n` +
      `  Examples: ${band.examples.join(', ')}`
    ).join('\n\n');
  }

  /**
   * Create analysis prompt from template
   */
  createAnalysisPrompt(content, previousContent, url, company) {
    const template = this.loadPromptTemplate(this.profile.analysisPromptTemplate);

    const variables = {
      '{DOMAIN}': this.profile.domain,
      '{DOMAIN_NAME}': this.profile.name,
      '{COMPANY}': company,
      '{URL}': url,
      '{COMPETITORS}': this.profile.competitors.map(c => c.name).join(', '),
      '{IMPORTANCE_BANDS}': this.formatImportanceBands(),
      '{CONTENT}': content.substring(0, 4000),
      '{PREVIOUS_CONTENT}': previousContent ? previousContent.substring(0, 2000) : 'No previous content',
      '{KEYWORDS_HIGH}': this.profile.domainKeywords.high.join(', '),
      '{KEYWORDS_MEDIUM}': this.profile.domainKeywords.medium.join(', '),
      '{KEYWORDS_LOW}': this.profile.domainKeywords.low.join(', ')
    };

    let prompt = template;
    for (const [variable, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(variable, 'g'), value);
    }

    return prompt;
  }

  /**
   * Analyze content with Claude using profile context
   */
  async analyzeContent(content, previousContent, url, company) {
    const apiKey = getApiKey();
    if (!apiKey) {
      return this.fallbackAnalysis(content);
    }

    const prompt = this.createAnalysisPrompt(content, previousContent, url, company);

    try {
      const response = await callClaude(apiKey, prompt);
      const analysis = JSON.parse(response.content[0].text);

      // Validate score is within profile's importance bands
      const band = this.profile.importanceBands.find(b =>
        analysis.significanceScore >= b.min &&
        analysis.significanceScore <= b.max
      );

      return {
        ...analysis,
        importanceBand: band,
        analysisType: 'claude-enhanced',
        profileId: this.profile.id
      };

    } catch (error) {
      console.error('Claude analysis failed:', error);
      return this.fallbackAnalysis(content);
    }
  }

  fallbackAnalysis(content) {
    // Basic keyword-based analysis as fallback
    return {
      summary: 'Content updated (AI analysis unavailable)',
      significanceScore: 5,
      analysisType: 'basic'
    };
  }
}
```

**Generic Prompt Template** (`profiles/templates/generic-analysis.txt`):
```text
You are an expert competitive intelligence analyst for the {DOMAIN} industry.

Company: {COMPANY}
URL: {URL}
Domain: {DOMAIN_NAME}

Key Competitors in this space: {COMPETITORS}

IMPORTANCE SCALE FOR {DOMAIN}:
{IMPORTANCE_BANDS}

High-Priority Keywords: {KEYWORDS_HIGH}
Medium-Priority Keywords: {KEYWORDS_MEDIUM}
Low-Priority Keywords: {KEYWORDS_LOW}

---

PREVIOUS CONTENT (excerpt):
{PREVIOUS_CONTENT}

NEW CONTENT (excerpt):
{CONTENT}

---

ANALYSIS INSTRUCTIONS:
1. Identify what changed between the previous and new content
2. Evaluate the significance of the change using the importance scale above
3. Consider why this change matters for competitive intelligence in {DOMAIN}
4. Extract key insights relevant to {DOMAIN} competitors

Provide a JSON response with:
{
  "summary": "2-3 sentence executive summary of the change",
  "keyChanges": ["list of the most important changes"],
  "significanceScore": 0-10,
  "urgency": "high/medium/low",
  "competitiveIntel": ["strategic insights for competitors"],
  "recommendations": ["actionable insights"],
  "relevantToDomain": true/false,
  "reasoning": "Why this score on the {DOMAIN} importance scale"
}

Be concise and focus on actionable intelligence for the {DOMAIN} industry.
Score the change using the importance scale provided above.
```

**Energy Drinks Specific Template** (`profiles/templates/energy-drinks-analysis.txt`):
```text
You are an expert competitive intelligence analyst for the energy drinks industry.

Company: {COMPANY}
URL: {URL}

Key Competitors: {COMPETITORS}

IMPORTANCE SCALE FOR ENERGY DRINKS:
{IMPORTANCE_BANDS}

Focus Areas: New products, formulas, flavors, pricing, sponsorships, ingredients, health claims

---

PREVIOUS CONTENT:
{PREVIOUS_CONTENT}

NEW CONTENT:
{CONTENT}

---

Analyze what changed and why it matters for energy drink market intelligence.

Pay special attention to:
- New product launches or discontinuations
- Formula changes or ingredient modifications
- Pricing adjustments
- Major sponsorships (sports, events, athletes)
- Health/nutrition claims
- Packaging or branding changes
- Market expansion (new regions, channels)

Provide JSON:
{
  "summary": "Executive summary",
  "keyChanges": ["list of changes"],
  "significanceScore": 0-10,
  "urgency": "high/medium/low",
  "productChanges": ["product-related changes"],
  "pricingChanges": ["pricing-related changes"],
  "marketingChanges": ["marketing/sponsorship changes"],
  "competitiveIntel": ["strategic insights"],
  "recommendations": ["actionable recommendations"]
}
```

---

### PHASE 2: AI-Powered Discovery System 🤖

#### 2.1 Domain Discovery Orchestrator
**File**: `discovery/DomainDiscovery.js`

```javascript
/**
 * Domain Discovery System
 * Uses Claude to research domain and generate profile
 */

class DomainDiscovery {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Main discovery flow
   */
  async discoverDomain(seedInput) {
    console.log('🔍 Starting domain discovery...');

    // Step 1: Competitor Research
    console.log('📊 Researching competitors...');
    const competitors = await this.discoverCompetitors(seedInput);

    // Step 2: URL Discovery (for each competitor)
    console.log('🔗 Discovering URLs...');
    const competitorsWithUrls = await this.discoverURLs(competitors, seedInput.domain);

    // Step 3: Keyword Extraction
    console.log('🏷️ Extracting domain keywords...');
    const keywords = await this.extractKeywords(seedInput.domain, competitors);

    // Step 4: Importance Bands
    console.log('📏 Generating importance scale...');
    const importanceBands = await this.generateImportanceBands(seedInput.domain);

    // Step 5: Page Weights
    console.log('⚖️ Calculating page weights...');
    const pageWeights = await this.suggestPageWeights(seedInput.domain);

    // Step 6: Generate Profile
    console.log('✨ Generating profile...');
    const profile = this.assembleProfile({
      seedInput,
      competitors: competitorsWithUrls,
      keywords,
      importanceBands,
      pageWeights
    });

    console.log('✅ Discovery complete!');
    return profile;
  }

  /**
   * Discover competitors in the domain
   */
  async discoverCompetitors(seedInput) {
    const prompt = `You are a market research expert.

Domain: ${seedInput.domain}
Seed Competitors: ${seedInput.seedCompetitors.join(', ')}
Target Market: ${seedInput.targetMarket || 'Global'}

Research and identify ALL major competitors in this market.
- Include the seed competitors plus 8-15 additional competitors
- Focus on direct competitors (similar products/services)
- Include market leaders, challengers, and notable niche players

For EACH competitor, provide:
1. Company name (official name)
2. Primary website URL
3. Key product lines or offerings
4. Market position (leader/challenger/niche)
5. Brief description (1 sentence)

Return as JSON:
{
  "competitors": [
    {
      "name": "Company Name",
      "website": "https://company.com",
      "productLines": ["Product 1", "Product 2"],
      "marketPosition": "leader|challenger|niche",
      "description": "Brief description"
    }
  ],
  "totalFound": 12,
  "researchNotes": "Any important notes about this market"
}`;

    const response = await this.callClaude(prompt);
    const result = JSON.parse(response.content[0].text);

    console.log(`  ✓ Found ${result.totalFound} competitors`);
    return result.competitors;
  }

  /**
   * Discover URLs for each competitor
   */
  async discoverURLs(competitors, domain) {
    const competitorsWithUrls = [];

    for (const competitor of competitors) {
      console.log(`  Discovering URLs for ${competitor.name}...`);

      const prompt = `You are a web research expert.

Competitor: ${competitor.name}
Website: ${competitor.website}
Domain: ${domain}
Product Lines: ${competitor.productLines.join(', ')}

Identify the most important URLs to monitor for competitive intelligence.

For a ${domain} company, the key pages are typically:
- Homepage
- Product/offerings pages
- Pricing pages
- News/blog
- About/company info
- Press releases
- Customer case studies (if B2B)
- Documentation (if technical product)

Provide 4-8 URLs that would be most valuable to monitor.

Return as JSON:
{
  "urls": [
    {
      "url": "https://...",
      "type": "homepage|products|pricing|blog|news|docs|about",
      "priority": "high|medium|low",
      "reasoning": "Why this URL is important to monitor"
    }
  ]
}`;

      const response = await this.callClaude(prompt);
      const result = JSON.parse(response.content[0].text);

      competitorsWithUrls.push({
        ...competitor,
        urls: result.urls.map(u => ({url: u.url, type: u.type})),
        keywords: [] // Will be populated from keyword extraction
      });

      console.log(`    ✓ Found ${result.urls.length} URLs`);
    }

    return competitorsWithUrls;
  }

  /**
   * Extract domain-specific keywords
   */
  async extractKeywords(domain, competitors) {
    const competitorSummary = competitors.slice(0, 5).map(c =>
      `${c.name}: ${c.productLines.join(', ')}`
    ).join('\n');

    const prompt = `You are a domain expert in ${domain}.

Key Companies:
${competitorSummary}

What keywords indicate important changes in the ${domain} industry?

Categorize keywords into three priority levels:

HIGH PRIORITY: Keywords that indicate critical business changes
- Examples: new product launches, pricing changes, acquisitions, major partnerships

MEDIUM PRIORITY: Keywords that indicate significant but not urgent changes
- Examples: feature updates, minor partnerships, marketing campaigns

LOW PRIORITY: Keywords that indicate routine updates
- Examples: blog posts, minor updates, general content changes

Provide 10-15 keywords per category, specific to ${domain}.

Return as JSON:
{
  "high": ["keyword1", "keyword2", ...],
  "medium": ["keyword1", "keyword2", ...],
  "low": ["keyword1", "keyword2", ...]
}`;

    const response = await this.callClaude(prompt);
    const result = JSON.parse(response.content[0].text);

    console.log(`  ✓ Extracted ${result.high.length + result.medium.length + result.low.length} keywords`);
    return result;
  }

  /**
   * Generate importance bands for the domain
   */
  async generateImportanceBands(domain) {
    const prompt = `You are a competitive intelligence expert for the ${domain} industry.

Define an importance scale (0-10) for monitoring website changes in ${domain}.

For each band, specify:
1. The score range (min-max)
2. A clear label
3. Detailed description of what types of changes fall in this band
4. 3-5 specific examples relevant to ${domain}

Bands to define:
- 9-10: Critical (business-critical, urgent, major strategic moves)
- 7-8: Important (significant changes, worth immediate attention)
- 5-6: Moderate (notable changes, should be reviewed)
- 3-4: Low (minor changes, routine monitoring)
- 1-2: Minimal (routine updates, low priority)
- 0: Trivial (inconsequential changes)

Return as JSON:
{
  "importanceBands": [
    {
      "min": 9,
      "max": 10,
      "label": "Critical",
      "description": "Detailed description...",
      "examples": ["Example 1", "Example 2", "Example 3"]
    },
    ...
  ]
}`;

    const response = await this.callClaude(prompt);
    const result = JSON.parse(response.content[0].text);

    console.log(`  ✓ Generated ${result.importanceBands.length} importance bands`);
    return result.importanceBands;
  }

  /**
   * Suggest page weights for the domain
   */
  async suggestPageWeights(domain) {
    const prompt = `You are a competitive intelligence expert for ${domain}.

Which types of pages are most important to monitor for competitive intelligence?

Assign weight multipliers (0.5 - 2.0) to different page types.
Higher weights = more important to monitor.

Common page types:
- homepage
- products
- pricing
- blog
- news
- docs
- about
- press
- careers
- support

Return as JSON:
{
  "pageWeights": {
    "products": 2.0,
    "pricing": 1.8,
    ...
  },
  "reasoning": "Brief explanation of why these weights"
}`;

    const response = await this.callClaude(prompt);
    const result = JSON.parse(response.content[0].text);

    console.log(`  ✓ Generated page weights`);
    return result.pageWeights;
  }

  /**
   * Assemble final profile
   */
  assembleProfile(discoveryData) {
    const { seedInput, competitors, keywords, importanceBands, pageWeights } = discoveryData;

    return {
      id: this.generateUUID(),
      name: `${seedInput.domain} Monitor`,
      domain: seedInput.domain,
      description: `Monitoring system for ${seedInput.domain} industry`,

      competitors: competitors,

      importanceBands: importanceBands,

      contentTypes: [...new Set(competitors.flatMap(c => c.urls.map(u => u.type)))],

      pageWeights: pageWeights,

      domainKeywords: keywords,

      analysisPromptTemplate: 'templates/generic-analysis.txt',

      discovery: {
        enabled: true,
        autoExpand: seedInput.autoExpand || false,
        seedCompetitors: seedInput.seedCompetitors,
        maxCompetitors: seedInput.maxCompetitors || 20
      },

      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'active'
    };
  }

  /**
   * Call Claude API
   */
  async callClaude(prompt) {
    // Implementation similar to existing Claude integration
    // Returns parsed response
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Convenience function for quick discovery
 */
async function discoverDomainQuick(domain, seedCompetitors) {
  const discovery = new DomainDiscovery(getApiKey());

  const profile = await discovery.discoverDomain({
    domain: domain,
    seedCompetitors: seedCompetitors,
    targetMarket: 'US',
    maxCompetitors: 15,
    autoExpand: true
  });

  return profile;
}

// Export
module.exports = { DomainDiscovery, discoverDomainQuick };
```

#### 2.2 Example Usage
```javascript
// Discover energy drinks domain
const energyDrinksProfile = await discoverDomainQuick(
  'energy drinks',
  ['Red Bull', 'Monster Energy']
);

// Result:
// {
//   id: "uuid",
//   name: "energy drinks Monitor",
//   competitors: [
//     { name: "Red Bull", urls: [...], keywords: [...] },
//     { name: "Monster Energy", urls: [...] },
//     { name: "Rockstar", urls: [...] },
//     ... (12 total)
//   ],
//   importanceBands: [
//     { min: 9, max: 10, label: "Critical", description: "...", examples: [...] },
//     ...
//   ],
//   domainKeywords: {
//     high: ["new product", "formula", "discontinued", ...],
//     medium: ["flavor", "packaging", ...],
//     low: ["promotion", "campaign", ...]
//   }
// }

// Save profile
saveProfile(energyDrinksProfile);

// Start monitoring
const results = await monitorProfile(energyDrinksProfile.id);
```

---

### PHASE 3: Configuration Interface 🎛️

#### 3.1 Setup Wizard
**File**: `dashboard/setup-wizard.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Monitoring Profile - Generic Web Monitor</title>
    <style>
        /* Modern wizard styles */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }

        .wizard-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .wizard-progress {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }

        .progress-step {
            flex: 1;
            text-align: center;
            position: relative;
        }

        .progress-step::after {
            content: '';
            position: absolute;
            top: 20px;
            left: 50%;
            width: 100%;
            height: 2px;
            background: #ddd;
            z-index: -1;
        }

        .progress-step:last-child::after {
            display: none;
        }

        .progress-step.active .step-number {
            background: #667eea;
            color: white;
        }

        .progress-step.completed .step-number {
            background: #00ff88;
            color: #000;
        }

        .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ddd;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .step-label {
            font-size: 12px;
            color: #666;
        }

        .wizard-step {
            display: none;
        }

        .wizard-step.active {
            display: block;
        }

        .form-group {
            margin-bottom: 25px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }

        input[type="text"],
        textarea,
        select {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            box-sizing: border-box;
        }

        input:focus,
        textarea:focus,
        select:focus {
            outline: none;
            border-color: #667eea;
        }

        textarea {
            min-height: 100px;
            resize: vertical;
        }

        .button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .button-primary {
            background: #667eea;
            color: white;
        }

        .button-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }

        .button-secondary {
            background: #eee;
            color: #333;
        }

        .wizard-actions {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }

        .discovery-status {
            background: #f0f0f0;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .discovery-status.running {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
        }

        .discovery-status.complete {
            background: #d4edda;
            border-left: 4px solid #00ff88;
        }

        .competitor-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
        }

        .competitor-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
        }

        .competitor-item:last-child {
            border-bottom: none;
        }

        .competitor-item input[type="checkbox"] {
            margin-right: 10px;
        }

        .importance-band {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }

        .band-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .band-label {
            font-weight: 600;
            color: #667eea;
        }

        .examples-list {
            list-style: none;
            padding: 0;
            margin: 10px 0 0 0;
        }

        .examples-list li {
            padding: 5px 0;
            color: #666;
            font-size: 14px;
        }

        .examples-list li::before {
            content: '▪';
            color: #667eea;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="wizard-container">
        <h1>Create Monitoring Profile</h1>

        <!-- Progress Indicator -->
        <div class="wizard-progress">
            <div class="progress-step active" data-step="1">
                <div class="step-number">1</div>
                <div class="step-label">Domain</div>
            </div>
            <div class="progress-step" data-step="2">
                <div class="step-number">2</div>
                <div class="step-label">Discovery</div>
            </div>
            <div class="progress-step" data-step="3">
                <div class="step-number">3</div>
                <div class="step-label">Review</div>
            </div>
            <div class="progress-step" data-step="4">
                <div class="step-number">4</div>
                <div class="step-label">Importance</div>
            </div>
            <div class="progress-step" data-step="5">
                <div class="step-number">5</div>
                <div class="step-label">Complete</div>
            </div>
        </div>

        <!-- Step 1: Domain Setup -->
        <div class="wizard-step active" data-step="1">
            <h2>What do you want to monitor?</h2>

            <div class="form-group">
                <label for="domain">Domain/Industry:</label>
                <input type="text" id="domain" placeholder="e.g., energy drinks, automobiles, SaaS companies">
                <small style="color: #666; display: block; margin-top: 5px;">
                    What industry or market do you want to track?
                </small>
            </div>

            <div class="form-group">
                <label for="description">Description (optional):</label>
                <textarea id="description" placeholder="e.g., Track energy drink launches, pricing changes, and sponsorships"></textarea>
            </div>

            <div class="form-group">
                <label for="setup-mode">Setup Mode:</label>
                <select id="setup-mode">
                    <option value="ai">🤖 AI-Assisted (Recommended) - Let AI research and configure</option>
                    <option value="manual">✋ Manual Configuration - Full control</option>
                </select>
            </div>

            <div class="wizard-actions">
                <button class="button button-secondary" onclick="cancelWizard()">Cancel</button>
                <button class="button button-primary" onclick="nextStep()">Next →</button>
            </div>
        </div>

        <!-- Step 2: AI Discovery -->
        <div class="wizard-step" data-step="2">
            <h2>AI-Powered Discovery</h2>
            <p>Provide 2-3 example competitors. Our AI will research the market and expand this list.</p>

            <div class="form-group">
                <label for="seed-competitors">Seed Competitors (comma-separated):</label>
                <input type="text" id="seed-competitors" placeholder="e.g., Red Bull, Monster Energy, Rockstar">
                <small style="color: #666; display: block; margin-top: 5px;">
                    Just provide a few examples. AI will discover 10-15 additional competitors.
                </small>
            </div>

            <div class="form-group">
                <label for="target-market">Target Market (optional):</label>
                <select id="target-market">
                    <option value="global">Global</option>
                    <option value="us">United States</option>
                    <option value="eu">Europe</option>
                    <option value="apac">Asia Pacific</option>
                </select>
            </div>

            <div class="form-group">
                <label for="max-competitors">Maximum Competitors:</label>
                <input type="number" id="max-competitors" value="15" min="5" max="50">
            </div>

            <button class="button button-primary" onclick="runDiscovery()" style="width: 100%;">
                🔍 Start AI Discovery
            </button>

            <div id="discovery-status" class="discovery-status" style="display: none;">
                <h4 style="margin-top: 0;">Discovery in Progress...</h4>
                <div id="discovery-progress"></div>
            </div>

            <div class="wizard-actions">
                <button class="button button-secondary" onclick="prevStep()">← Back</button>
                <button class="button button-primary" id="review-btn" onclick="nextStep()" disabled>Review Results →</button>
            </div>
        </div>

        <!-- Step 3: Review Competitors -->
        <div class="wizard-step" data-step="3">
            <h2>Review Discovery Results</h2>
            <p>AI found <strong id="competitors-found">0</strong> competitors and <strong id="urls-found">0</strong> URLs. Review and select which to monitor.</p>

            <div class="form-group">
                <label>Competitors:</label>
                <div class="competitor-list" id="competitor-list">
                    <!-- Populated by JS -->
                </div>
            </div>

            <div class="wizard-actions">
                <button class="button button-secondary" onclick="prevStep()">← Back</button>
                <button class="button button-primary" onclick="nextStep()">Next: Importance Scale →</button>
            </div>
        </div>

        <!-- Step 4: Importance Bands -->
        <div class="wizard-step" data-step="4">
            <h2>Define Importance Scale</h2>
            <p>Customize what level of changes matter to you. AI has suggested these bands based on your domain.</p>

            <div id="importance-bands-container">
                <!-- Populated by JS -->
            </div>

            <button class="button button-secondary" onclick="aiRefreshBands()" style="margin-top: 20px;">
                ✨ Regenerate with AI
            </button>

            <div class="wizard-actions">
                <button class="button button-secondary" onclick="prevStep()">← Back</button>
                <button class="button button-primary" onclick="nextStep()">Complete Setup →</button>
            </div>
        </div>

        <!-- Step 5: Complete -->
        <div class="wizard-step" data-step="5">
            <h2>Profile Created! 🎉</h2>
            <p>Your monitoring profile has been created and is ready to use.</p>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Profile Summary</h3>
                <p><strong>Name:</strong> <span id="summary-name"></span></p>
                <p><strong>Domain:</strong> <span id="summary-domain"></span></p>
                <p><strong>Competitors:</strong> <span id="summary-competitors"></span></p>
                <p><strong>URLs to Monitor:</strong> <span id="summary-urls"></span></p>
            </div>

            <div class="wizard-actions">
                <button class="button button-primary" onclick="viewDashboard()" style="flex: 1; margin-right: 10px;">
                    📊 Go to Dashboard
                </button>
                <button class="button button-secondary" onclick="runMonitor()" style="flex: 1;">
                    🚀 Run First Monitor
                </button>
            </div>
        </div>
    </div>

    <script>
        let currentStep = 1;
        let discoveredProfile = null;

        function nextStep() {
            // Validate current step
            if (!validateStep(currentStep)) {
                return;
            }

            // Update progress
            document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('completed');

            currentStep++;

            document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.add('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');
        }

        function prevStep() {
            document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.remove('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');

            currentStep--;

            document.querySelector(`.wizard-step[data-step="${currentStep}"]`).classList.add('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('completed');
        }

        function validateStep(step) {
            if (step === 1) {
                const domain = document.getElementById('domain').value.trim();
                if (!domain) {
                    alert('Please enter a domain/industry');
                    return false;
                }
            }
            return true;
        }

        async function runDiscovery() {
            const domain = document.getElementById('domain').value.trim();
            const seedCompetitors = document.getElementById('seed-competitors').value.split(',').map(s => s.trim());
            const targetMarket = document.getElementById('target-market').value;
            const maxCompetitors = parseInt(document.getElementById('max-competitors').value);

            if (seedCompetitors.length < 2) {
                alert('Please provide at least 2 seed competitors');
                return;
            }

            const statusDiv = document.getElementById('discovery-status');
            const progressDiv = document.getElementById('discovery-progress');
            statusDiv.style.display = 'block';
            statusDiv.className = 'discovery-status running';

            progressDiv.innerHTML = '⏳ Initializing AI discovery...';

            try {
                // Call API to run discovery
                progressDiv.innerHTML = '📊 Researching competitors...';
                await sleep(1000);

                progressDiv.innerHTML = '🔗 Discovering URLs...';
                await sleep(1500);

                progressDiv.innerHTML = '🏷️ Extracting keywords...';
                await sleep(1000);

                progressDiv.innerHTML = '📏 Generating importance scale...';
                await sleep(1000);

                // For demo, create mock profile
                discoveredProfile = {
                    domain: domain,
                    competitors: [
                        { name: 'Red Bull', urls: 5, selected: true },
                        { name: 'Monster Energy', urls: 6, selected: true },
                        { name: 'Rockstar', urls: 4, selected: true },
                        // ... more
                    ],
                    totalUrls: 48,
                    importanceBands: [
                        {
                            min: 9, max: 10,
                            label: 'Critical',
                            description: 'New product lines, major formula changes, market entry/exit',
                            examples: ['Launching new drink line', 'Discontinuing major product']
                        },
                        // ... more bands
                    ]
                };

                statusDiv.className = 'discovery-status complete';
                progressDiv.innerHTML = `
                    <h4 style="margin-top: 0;">✅ Discovery Complete!</h4>
                    <p>✓ Found ${discoveredProfile.competitors.length} competitors</p>
                    <p>✓ Discovered ${discoveredProfile.totalUrls} URLs</p>
                    <p>✓ Generated importance scale</p>
                `;

                document.getElementById('review-btn').disabled = false;

            } catch (error) {
                statusDiv.className = 'discovery-status';
                progressDiv.innerHTML = `<p style="color: red;">❌ Error: ${error.message}</p>`;
            }
        }

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        function cancelWizard() {
            if (confirm('Cancel profile creation?')) {
                window.location.href = 'profile-manager.html';
            }
        }

        function viewDashboard() {
            window.location.href = 'index.html';
        }

        function runMonitor() {
            // Trigger first monitor run
            alert('Starting first monitor run...');
        }
    </script>
</body>
</html>
```

#### 3.2 Profile Manager
**File**: `dashboard/profile-manager.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Profile Manager - Generic Web Monitor</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            margin: 0;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .profile-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .profile-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }

        .profile-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .profile-card.new {
            border: 2px dashed #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            cursor: pointer;
        }

        .profile-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }

        .profile-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }

        .status-active {
            background: #d4edda;
            color: #155724;
        }

        .profile-stats {
            margin: 15px 0;
            color: #666;
            font-size: 14px;
        }

        .profile-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .button {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }

        .button-primary {
            background: #667eea;
            color: white;
        }

        .button-secondary {
            background: #eee;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Monitoring Profiles</h1>
            <button class="button button-primary" onclick="createProfile()">
                + Create New Profile
            </button>
        </div>

        <div class="profile-grid">
            <!-- Energy Drinks Profile -->
            <div class="profile-card">
                <h3>🥤 Energy Drinks</h3>
                <span class="profile-status status-active">Active</span>

                <div class="profile-stats">
                    <p>📊 12 competitors monitored</p>
                    <p>🔗 48 URLs tracked</p>
                    <p>📈 23 changes this week</p>
                    <p>⏰ Last run: 2 hours ago</p>
                </div>

                <div class="profile-actions">
                    <button class="button button-primary" onclick="viewDashboard('energy-drinks')">
                        Dashboard
                    </button>
                    <button class="button button-secondary" onclick="editProfile('energy-drinks')">
                        Edit
                    </button>
                    <button class="button button-secondary" onclick="exportProfile('energy-drinks')">
                        Export
                    </button>
                </div>
            </div>

            <!-- AI Competitors Profile -->
            <div class="profile-card">
                <h3>🤖 AI Competitors</h3>
                <span class="profile-status status-active">Active</span>

                <div class="profile-stats">
                    <p>📊 16 competitors monitored</p>
                    <p>🔗 64 URLs tracked</p>
                    <p>📈 15 changes this week</p>
                    <p>⏰ Last run: 1 hour ago</p>
                </div>

                <div class="profile-actions">
                    <button class="button button-primary" onclick="viewDashboard('ai')">
                        Dashboard
                    </button>
                    <button class="button button-secondary" onclick="editProfile('ai')">
                        Edit
                    </button>
                    <button class="button button-secondary" onclick="exportProfile('ai')">
                        Export
                    </button>
                </div>
            </div>

            <!-- New Profile Card -->
            <div class="profile-card new" onclick="createProfile()">
                <div style="text-align: center;">
                    <h2 style="font-size: 48px; margin: 0;">+</h2>
                    <p style="margin: 10px 0 0 0; color: #667eea; font-weight: 600;">
                        Create New Profile
                    </p>
                </div>
            </div>
        </div>
    </div>

    <script>
        function createProfile() {
            window.location.href = 'setup-wizard.html';
        }

        function viewDashboard(profileId) {
            window.location.href = `index.html?profile=${profileId}`;
        }

        function editProfile(profileId) {
            window.location.href = `setup-wizard.html?edit=${profileId}`;
        }

        function exportProfile(profileId) {
            // Export profile as JSON
            alert('Exporting profile: ' + profileId);
        }
    </script>
</body>
</html>
```

---

### PHASE 4: Data Model & Storage 💾

#### 4.1 Google Sheets Structure (Multi-Profile)

**Sheet: "Profiles"**
| Profile ID | Name | Domain | Status | Created | Last Run | Config JSON |
|------------|------|--------|--------|---------|----------|-------------|
| uuid-1 | Energy Drinks | energy-drinks | active | 2025-01-15T10:00:00Z | 2025-01-16T14:00:00Z | {full JSON} |
| uuid-2 | AI Competitors | ai-technology | active | 2025-01-10T12:00:00Z | 2025-01-16T13:30:00Z | {full JSON} |

**Sheet: "Competitors_[ProfileID]"** (one per profile)
| Company | URL Count | Keywords | Last Check | Status | Changes (24h) |
|---------|-----------|----------|------------|--------|---------------|
| Red Bull | 5 | ["energy", "caffeine"] | 2025-01-16T14:00:00Z | monitored | 2 |
| Monster | 6 | ["energy", "extreme"] | 2025-01-16T14:05:00Z | monitored | 1 |

**Sheet: "Changes_[ProfileID]"** (one per profile)
| Timestamp | Company | URL | Score | Band Label | Band Min-Max | Summary | AI Analysis JSON |
|-----------|---------|-----|-------|------------|--------------|---------|------------------|
| 2025-01-16T14:00 | Red Bull | redbull.com/products | 8 | Important | 7-8 | New flavor launch | {...} |

**Sheet: "ImportanceBands_[ProfileID]"** (one per profile)
| Min | Max | Label | Description | Examples JSON |
|-----|-----|-------|-------------|---------------|
| 9 | 10 | Critical | New product lines... | ["launch", "discontinue"] |
| 7 | 8 | Important | New flavors... | ["flavor", "partnership"] |

#### 4.2 ProfileManager.js
**File**: `core/config/ProfileManager.js`

```javascript
/**
 * Profile Manager - CRUD operations for profiles
 */

class ProfileManager {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.profilesSheet = this.getOrCreateSheet('Profiles');
  }

  /**
   * Save profile to Google Sheets
   */
  saveProfile(profile) {
    const sheet = this.profilesSheet;

    // Check if profile exists
    const existingRow = this.findProfileRow(profile.id);

    const rowData = [
      profile.id,
      profile.name,
      profile.domain,
      profile.status,
      profile.created,
      profile.lastModified || new Date().toISOString(),
      JSON.stringify(profile)
    ];

    if (existingRow) {
      // Update existing
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Create new
      sheet.appendRow(rowData);

      // Create associated sheets
      this.createProfileSheets(profile.id);
    }

    // Store importance bands
    this.saveImportanceBands(profile.id, profile.importanceBands);

    return profile.id;
  }

  /**
   * Load profile from Google Sheets
   */
  loadProfile(profileId) {
    const sheet = this.profilesSheet;
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === profileId) {
        return JSON.parse(data[i][6]); // Config JSON column
      }
    }

    throw new Error(`Profile not found: ${profileId}`);
  }

  /**
   * List all profiles
   */
  listProfiles() {
    const sheet = this.profilesSheet;
    const data = sheet.getDataRange().getValues();

    const profiles = [];
    for (let i = 1; i < data.length; i++) {
      profiles.push({
        id: data[i][0],
        name: data[i][1],
        domain: data[i][2],
        status: data[i][3],
        created: data[i][4],
        lastRun: data[i][5]
      });
    }

    return profiles;
  }

  /**
   * Delete profile
   */
  deleteProfile(profileId) {
    const row = this.findProfileRow(profileId);
    if (row) {
      this.profilesSheet.deleteRow(row);

      // Delete associated sheets
      this.deleteProfileSheets(profileId);
    }
  }

  /**
   * Create sheets for a new profile
   */
  createProfileSheets(profileId) {
    const ss = this.spreadsheet;

    // Competitors sheet
    const competitorsSheet = ss.insertSheet(`Competitors_${profileId}`);
    competitorsSheet.appendRow(['Company', 'URL Count', 'Keywords', 'Last Check', 'Status', 'Changes (24h)']);
    competitorsSheet.getRange(1, 1, 1, 6).setFontWeight('bold');

    // Changes sheet
    const changesSheet = ss.insertSheet(`Changes_${profileId}`);
    changesSheet.appendRow(['Timestamp', 'Company', 'URL', 'Score', 'Band Label', 'Band Min-Max', 'Summary', 'AI Analysis JSON']);
    changesSheet.getRange(1, 1, 1, 8).setFontWeight('bold');

    // Importance Bands sheet
    const bandsSheet = ss.insertSheet(`ImportanceBands_${profileId}`);
    bandsSheet.appendRow(['Min', 'Max', 'Label', 'Description', 'Examples JSON']);
    bandsSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  /**
   * Delete sheets for a profile
   */
  deleteProfileSheets(profileId) {
    const ss = this.spreadsheet;
    const sheetNames = [
      `Competitors_${profileId}`,
      `Changes_${profileId}`,
      `ImportanceBands_${profileId}`
    ];

    sheetNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        ss.deleteSheet(sheet);
      }
    });
  }

  /**
   * Save importance bands
   */
  saveImportanceBands(profileId, bands) {
    const sheet = this.spreadsheet.getSheetByName(`ImportanceBands_${profileId}`);
    if (!sheet) return;

    // Clear existing (except header)
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    // Add bands
    bands.forEach(band => {
      sheet.appendRow([
        band.min,
        band.max,
        band.label,
        band.description,
        JSON.stringify(band.examples)
      ]);
    });
  }

  /**
   * Helper: Find profile row
   */
  findProfileRow(profileId) {
    const sheet = this.profilesSheet;
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === profileId) {
        return i + 1; // Row numbers are 1-indexed
      }
    }

    return null;
  }

  /**
   * Helper: Get or create sheet
   */
  getOrCreateSheet(sheetName) {
    let sheet = this.spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);

      if (sheetName === 'Profiles') {
        sheet.appendRow(['Profile ID', 'Name', 'Domain', 'Status', 'Created', 'Last Run', 'Config JSON']);
        sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }

    return sheet;
  }
}

// Export
const profileManager = new ProfileManager();

function saveProfile(profile) {
  return profileManager.saveProfile(profile);
}

function loadProfile(profileId) {
  return profileManager.loadProfile(profileId);
}

function listProfiles() {
  return profileManager.listProfiles();
}

function deleteProfile(profileId) {
  return profileManager.deleteProfile(profileId);
}
```

---

### PHASE 5: Multi-Profile Dashboard 📊

#### 5.1 Dashboard Refactoring
**File**: `dashboard/index.html`

**Key Changes**:
1. Add profile selector dropdown
2. Load data based on active profile
3. Show importance band context with each change
4. Multi-profile summary view

```html
<!-- Profile Selector (add to header) -->
<div class="header">
    <h1>Generic Web Monitor</h1>

    <div class="profile-selector">
        <label>Active Profile:</label>
        <select id="active-profile" onchange="switchProfile(this.value)">
            <option value="all">📊 All Profiles</option>
            <option value="energy-drinks" selected>🥤 Energy Drinks</option>
            <option value="ai">🤖 AI Competitors</option>
            <option value="automobiles">🚗 Automobiles</option>
        </select>
        <button class="button" onclick="manageProfiles()">⚙️ Manage Profiles</button>
    </div>
</div>

<!-- Profile-Specific Change Display -->
<div class="change-item" data-profile="energy-drinks">
    <div class="change-header">
        <div class="importance-badge critical">
            9/10 - Critical
        </div>
        <span class="timestamp">2 hours ago</span>
    </div>

    <h4>Red Bull: New Product Line Launch</h4>
    <p class="change-summary">
        Red Bull announces "Red Bull Zero" - first completely sugar-free line targeting health-conscious consumers
    </p>

    <div class="importance-context">
        <strong>Why this is Critical (9-10) for energy drinks:</strong>
        <p>"New product lines, major formula changes, market entry/exit"</p>
        <div class="examples">
            Examples: Launching new drink line, Discontinuing major product, Major reformulation
        </div>
    </div>

    <div class="ai-analysis">
        <strong>🤖 AI Analysis:</strong>
        <p>Significance: 9/10 - Major market move targeting health segment.
           Competitive response expected from Monster and Rockstar within 6 months.</p>
    </div>

    <div class="change-actions">
        <a href="https://redbull.com/products" target="_blank" class="button button-secondary">
            View Source →
        </a>
        <button class="button button-secondary" onclick="viewHistory('redbull', 'products')">
            History
        </button>
    </div>
</div>

<!-- Multi-Profile Summary (when "All Profiles" selected) -->
<div id="multi-profile-view" style="display: none;">
    <h2>All Profiles - Activity Summary</h2>

    <div class="profile-summary-grid">
        <div class="profile-summary-card">
            <h3>🥤 Energy Drinks</h3>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-value">3</span>
                    <span class="stat-label">Critical (9-10)</span>
                </div>
                <div class="stat">
                    <span class="stat-value">5</span>
                    <span class="stat-label">Important (7-8)</span>
                </div>
                <div class="stat">
                    <span class="stat-value">15</span>
                    <span class="stat-label">Total Changes</span>
                </div>
            </div>
            <button class="button button-primary" onclick="switchProfile('energy-drinks')">
                View Dashboard →
            </button>
        </div>

        <div class="profile-summary-card">
            <h3>🤖 AI Competitors</h3>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-value">1</span>
                    <span class="stat-label">Critical (9-10)</span>
                </div>
                <div class="stat">
                    <span class="stat-value">8</span>
                    <span class="stat-label">Important (7-8)</span>
                </div>
                <div class="stat">
                    <span class="stat-value">12</span>
                    <span class="stat-label">Total Changes</span>
                </div>
            </div>
            <button class="button button-primary" onclick="switchProfile('ai')">
                View Dashboard →
            </button>
        </div>
    </div>
</div>

<script>
function switchProfile(profileId) {
    const selector = document.getElementById('active-profile');
    selector.value = profileId;

    if (profileId === 'all') {
        document.getElementById('multi-profile-view').style.display = 'block';
        document.getElementById('single-profile-view').style.display = 'none';
    } else {
        document.getElementById('multi-profile-view').style.display = 'none';
        document.getElementById('single-profile-view').style.display = 'block';

        // Load profile-specific data
        loadProfileData(profileId);
    }
}

async function loadProfileData(profileId) {
    // Load from API
    const response = await fetch(`/api/profiles/${profileId}/dashboard`);
    const data = await response.json();

    // Update dashboard
    updateDashboard(data);
}

function manageProfiles() {
    window.location.href = 'profile-manager.html';
}
</script>
```

---

### PHASE 6: Migration & Testing 🧪

#### 6.1 Migration Script
**File**: `migration/export-ai-profile.js`

```javascript
/**
 * Export Current AI Monitor as Profile
 * Converts existing AI monitor configuration to new profile format
 */

function exportAIMonitorAsProfile() {
  console.log('📦 Exporting AI Competitor Monitor as Profile...');

  // Load current configuration
  const currentCompanies = COMPLETE_MONITOR_CONFIG; // from CompanyConfigComplete.js
  const currentKeywords = INTELLIGENT_CONFIG.keywords; // from IntelligentMonitor.js
  const currentPageWeights = INTELLIGENT_CONFIG.pageWeights;

  // Convert to new profile format
  const aiProfile = {
    id: generateUUID(),
    name: "AI Competitors",
    domain: "ai-technology",
    description: "Monitor AI companies for product launches, pricing changes, and strategic moves",

    competitors: currentCompanies.map(company => ({
      name: company.company,
      urls: company.urls.map(u => ({
        url: u.url,
        type: u.type
      })),
      keywords: ["ai", "ml", "model", "api", "assistant", "agent"]
    })),

    importanceBands: [
      {
        min: 9, max: 10,
        label: "Critical",
        description: "New model releases, major pricing changes, strategic pivots, acquisitions",
        examples: [
          "GPT-5 launch announcement",
          "Major pricing overhaul",
          "Company acquisition",
          "Strategic pivot announcement",
          "Major partnership (e.g., Google + Anthropic)"
        ]
      },
      {
        min: 7, max: 8,
        label: "Important",
        description: "New features, API updates, significant partnerships, model improvements",
        examples: [
          "New API endpoint release",
          "Major partnership announcement",
          "New feature launch (e.g., vision, voice)",
          "Model performance improvement",
          "Enterprise tier announcement"
        ]
      },
      {
        min: 5, max: 6,
        label: "Moderate",
        description: "Documentation updates, blog posts, minor features, webinars",
        examples: [
          "Technical blog post",
          "Documentation expansion",
          "Minor feature addition",
          "Webinar announcement",
          "Case study publication"
        ]
      },
      {
        min: 3, max: 4,
        label: "Low",
        description: "Bug fixes, maintenance announcements, minor updates",
        examples: [
          "Bug fix announcement",
          "Scheduled maintenance",
          "Minor API update",
          "Status page update"
        ]
      },
      {
        min: 1, max: 2,
        label: "Minimal",
        description: "Website tweaks, minor content changes, routine updates",
        examples: [
          "Homepage content refresh",
          "Minor copy changes",
          "FAQ update"
        ]
      },
      {
        min: 0, max: 0,
        label: "Trivial",
        description: "Typos, formatting, inconsequential changes",
        examples: [
          "Typo correction",
          "Copyright year update",
          "Minor formatting adjustment"
        ]
      }
    ],

    contentTypes: ["homepage", "products", "pricing", "blog", "news", "docs", "api"],

    pageWeights: currentPageWeights,

    domainKeywords: {
      high: currentKeywords.high,
      medium: currentKeywords.medium,
      low: currentKeywords.low
    },

    analysisPromptTemplate: "templates/ai-technology-analysis.txt",

    discovery: {
      enabled: false,
      autoExpand: false,
      seedCompetitors: ["OpenAI", "Anthropic", "Google AI"],
      maxCompetitors: 20
    },

    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    status: "active"
  };

  console.log('✅ AI Profile exported successfully');
  console.log(`   Companies: ${aiProfile.competitors.length}`);
  console.log(`   URLs: ${aiProfile.competitors.reduce((sum, c) => sum + c.urls.length, 0)}`);
  console.log(`   Importance Bands: ${aiProfile.importanceBands.length}`);

  // Save to new system
  const profileId = saveProfile(aiProfile);

  console.log(`✅ Profile saved with ID: ${profileId}`);

  return aiProfile;
}

/**
 * Compare old and new system results
 */
function compareOldAndNew() {
  console.log('🔬 Running side-by-side comparison...');

  // Run old system
  console.log('Running OLD system...');
  const oldResults = monitorAllChanges(); // Existing function

  // Run new system with migrated profile
  console.log('Running NEW system...');
  const aiProfileId = 'ai-competitors-legacy';
  const newResults = monitorProfile(aiProfileId);

  // Compare
  console.log('\n📊 COMPARISON RESULTS:');
  console.log(`Old system changes: ${oldResults.changes.length}`);
  console.log(`New system changes: ${newResults.totalChanges}`);

  const match = oldResults.changes.length === newResults.totalChanges;
  console.log(`\n${match ? '✅' : '❌'} Results ${match ? 'MATCH' : 'DO NOT MATCH'}`);

  // Detailed comparison
  if (!match) {
    console.log('\n⚠️ DIFFERENCES DETECTED:');
    console.log('Old changes:', oldResults.changes.map(c => `${c.company} - ${c.url}`));
    console.log('New changes:', newResults.competitors.flatMap(c =>
      c.changes.map(ch => `${c.company} - ${ch.url}`)
    ));
  }

  return { oldResults, newResults, match };
}

/**
 * Run full migration test
 */
function testMigration() {
  console.log('🧪 MIGRATION TEST SUITE\n');

  // Test 1: Export
  console.log('TEST 1: Export AI Profile');
  const profile = exportAIMonitorAsProfile();
  console.log(profile ? '✅ PASS' : '❌ FAIL');

  // Test 2: Load
  console.log('\nTEST 2: Load Profile');
  const loaded = loadProfile(profile.id);
  console.log(loaded && loaded.id === profile.id ? '✅ PASS' : '❌ FAIL');

  // Test 3: Monitor
  console.log('\nTEST 3: Run Monitoring');
  const results = monitorProfile(profile.id);
  console.log(results && results.profileId === profile.id ? '✅ PASS' : '❌ FAIL');

  // Test 4: Compare
  console.log('\nTEST 4: Compare Old vs New');
  const comparison = compareOldAndNew();
  console.log(comparison.match ? '✅ PASS' : '❌ FAIL');

  console.log('\n' + '='.repeat(50));
  console.log('MIGRATION TEST COMPLETE');
}
```

---

### PHASE 7: Implementation Timeline ⏱️

#### Week 1-2: Foundation
- [ ] Create `generic-web-monitor` repository
- [ ] Define profile schema (`profile-schema.json`)
- [ ] Refactor `UniversalMonitor.js` (remove hardcoding)
- [ ] Refactor `UniversalAnalyzer.js` (template engine)
- [ ] Create `ProfileManager.js` (load/save profiles)
- [ ] Test: Load AI profile from JSON, run monitoring

#### Week 3-4: Discovery System
- [ ] Build `CompetitorResearch.js` (Claude competitor discovery)
- [ ] Build `URLDiscovery.js` (Claude URL discovery)
- [ ] Build `KeywordExtraction.js` (domain keyword extraction)
- [ ] Build `ImportanceBands.js` (importance band suggester)
- [ ] Build `DomainDiscovery.js` (orchestrates all discovery)
- [ ] Test: Create energy drinks profile from 2 seeds

#### Week 5-6: Configuration UI
- [ ] Build `setup-wizard.html` (step-by-step profile creation)
- [ ] Build `profile-manager.html` (manage multiple profiles)
- [ ] Build importance band editor
- [ ] Build profile export/import
- [ ] Test: User creates profile in < 5 minutes

#### Week 7: Integration
- [ ] Refactor dashboard with profile selector
- [ ] Multi-profile data routing
- [ ] Profile-specific email reports
- [ ] Profile-specific API endpoints
- [ ] Test: Switch between profiles seamlessly

#### Week 8: Migration & Testing
- [ ] Export current AI monitor as profile
- [ ] Import to new system
- [ ] Side-by-side testing (old vs new)
- [ ] Create energy drinks test profile
- [ ] Validate all features work
- [ ] Performance testing

#### Week 9-10: Polish & Deploy
- [ ] Documentation (README, setup guides)
- [ ] Example profiles (AI, energy drinks, automobiles)
- [ ] Video tutorials
- [ ] Deploy to production
- [ ] Gradual migration plan
- [ ] Retire old system (optional)

---

## FILE TRANSFORMATION MAP 📝

### Refactor (Domain-Agnostic)
| Current File | New File | Key Changes |
|--------------|----------|-------------|
| `IntelligentMonitor.js` | `core/monitoring/UniversalMonitor.js` | Remove hardcoded keywords (lines 13-17), page weights (19-31). Load from profile. |
| `ClaudeIntegration.js` | `core/analysis/UniversalAnalyzer.js` | Remove hardcoded AI prompt (line 148). Use template engine. |
| `IntelligentMonitor-LLM.js` | Merge into `UniversalAnalyzer.js` | Remove AI-specific prompt (line 153). Use profile variables. |
| `CompanyConfigComplete.js` | `profiles/examples/ai-competitors.json` | Convert JS object → JSON profile |
| `WebApp.js` | `core/api/UniversalAPI.js` | Add multi-profile routing, profileId parameter |
| `index.html` | `dashboard/index.html` | Add profile selector, multi-profile view |

### Create New
| File | Purpose |
|------|---------|
| `profiles/schemas/profile-schema.json` | JSON schema for profiles |
| `discovery/DomainDiscovery.js` | Main discovery orchestrator |
| `discovery/CompetitorResearch.js` | Claude competitor research |
| `discovery/URLDiscovery.js` | Claude URL discovery |
| `discovery/KeywordExtraction.js` | Domain keyword extraction |
| `discovery/ImportanceBands.js` | Importance band generator |
| `dashboard/setup-wizard.html` | Profile creation wizard |
| `dashboard/profile-manager.html` | Profile management UI |
| `core/config/ProfileManager.js` | Profile CRUD operations |
| `core/analysis/PromptTemplateEngine.js` | Template variable substitution |
| `profiles/templates/generic-analysis.txt` | Default Claude prompt |
| `profiles/templates/ai-technology-analysis.txt` | AI-specific prompt |
| `profiles/templates/energy-drinks-analysis.txt` | Energy drinks prompt |
| `profiles/examples/energy-drinks.json` | Example profile |
| `profiles/examples/automobiles.json` | Example profile |

---

## SUCCESS METRICS 📈

### Phase 1 Success
- [ ] Core engine runs with profile config (not hardcoded)
- [ ] AI analysis uses templated prompts
- [ ] Old AI profile migrates to new format successfully
- [ ] Side-by-side comparison: old vs new produces identical results

### Phase 2 Success
- [ ] AI discovery creates valid energy drinks profile from 2 seeds
- [ ] Discovers 10+ competitors automatically
- [ ] Suggests 40+ URLs to monitor
- [ ] Proposes 6 importance bands (0-10 scale)
- [ ] Profile validates against schema

### Phase 3 Success
- [ ] User creates new profile in < 5 minutes (manual mode)
- [ ] User creates new profile in < 2 minutes (AI-assisted mode)
- [ ] Custom importance bands work correctly
- [ ] Profile exports/imports successfully

### Phase 4 Success
- [ ] Multiple profiles stored in Google Sheets
- [ ] Profile switching works seamlessly
- [ ] Data isolated per profile (no cross-contamination)

### Phase 5 Success
- [ ] Dashboard displays profile-specific data
- [ ] Multi-profile summary view works
- [ ] Importance band context shown with each change
- [ ] Email reports separated by profile

### Final Success
- [ ] 3+ different domain profiles running simultaneously
- [ ] Each profile uses domain-specific scoring
- [ ] AI competitor monitor works exactly as before (migrated)
- [ ] New domains can be added in < 5 minutes

---

## ROLLBACK PLAN 🛡️

### Rollback Triggers
- ❌ New system produces different results than old (bugs)
- ❌ AI discovery creates invalid profiles
- ❌ Performance degradation (> 2x slower)
- ❌ Data loss or corruption

### Rollback Process
1. **Stop using new system** - Pause all monitoring on `generic-web-monitor`
2. **Switch back to `ai-competitive-monitor-correct`** - Resume on old system
3. **Diagnose issue** - Debug new system in parallel
4. **Fix and re-test** - Resolve issues
5. **Try again** - Migrate back when ready

### Safety Measures
- ✅ Keep `ai-competitive-monitor-correct` untouched
- ✅ Develop in parallel (`generic-web-monitor`)
- ✅ Test with non-critical profile first (energy drinks)
- ✅ Export/backup all data before migration
- ✅ Side-by-side monitoring during transition

---

## RESUME CONTEXT 🔄

When you restart me, provide:

1. **This markdown file** - Full transformation plan
2. **Current working directory** - Likely `/Users/sethredmore/generic-web-monitor/` (new repo)
3. **Current phase** - Which phase you're working on
4. **What you're implementing** - Specific file or feature

I'll know:
- Full transformation strategy
- All file mappings and refactoring needed
- Profile schema design
- AI discovery system architecture
- Configuration interface designs
- Migration strategy
- Testing criteria
- Rollback plan

---

## QUICK START COMMANDS 🚀

```bash
# Create new repository
mkdir generic-web-monitor
cd generic-web-monitor
git init

# Create directory structure
mkdir -p core/{monitoring,analysis,scoring,storage}
mkdir -p profiles/{schemas,templates,examples}
mkdir -p discovery
mkdir -p dashboard
mkdir -p instances/{ai-competitors,energy-drinks}

# Copy and refactor first file
cp /Users/sethredmore/ai-competitive-monitor-correct/IntelligentMonitor.js \
   core/monitoring/UniversalMonitor.js

# Edit and remove hardcoded sections (lines 13-17, 19-31)
# Test: node core/monitoring/UniversalMonitor.js
```

---

*End of Transformation Plan*
*Ready to transform AI-specific monitor → Generic domain-agnostic framework*
