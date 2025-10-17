# Generic Web Monitor - Complete Specification
**Version:** 2.0
**Date:** October 17, 2025
**Architecture:** GitHub Actions + PostgreSQL + GitHub Pages
**Instance Model:** Separate Repository Per Domain

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture & Design Decisions](#2-architecture--design-decisions)
3. [Profile-Driven Configuration](#3-profile-driven-configuration)
4. [3D Force Graph Visualization](#4-3d-force-graph-visualization)
5. [Email Notification System](#5-email-notification-system)
6. [Dashboard System](#6-dashboard-system)
7. [KWIC & Mentions Tracking](#7-kwic--mentions-tracking)
8. [Intelligent Analysis System](#8-intelligent-analysis-system)
9. [NAICS Market Sizing Integration](#9-naics-market-sizing-integration)
10. [Audience Segmentation Tracking](#10-audience-segmentation-tracking)
11. [Database Architecture](#11-database-architecture)
12. [GitHub Actions Workflows](#12-github-actions-workflows)
13. [User Interfaces](#13-user-interfaces)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Testing Strategy](#15-testing-strategy)
16. [User Stories](#16-user-stories)
17. [Success Criteria](#17-success-criteria)

---

## 1. Executive Summary

### 1.1 Vision

Transform the AI Competitor Monitor from an AI-industry-specific tool into a **domain-agnostic template repository** that can monitor ANY competitive landscape (energy drinks, hydration products, SaaS, automobiles, restaurants, etc.) while preserving ALL existing sophisticated features.

### 1.2 Key Principles

**Separate Instance Per Domain**: Each monitored industry runs as an isolated GitHub repository created from the template. No multi-profile complexity in a single deployment.

**Profile-Driven Everything**: All domain-specific configuration (competitors, importance bands, keywords, audiences, categories) lives in a single JSON file that drives the entire system.

**Preserve All Existing Features**: The current system has sophisticated visualization (3D force graph), analysis (KWIC, mentions, LLM), and reporting (beautiful email digests). Every feature must be preserved and made generic.

**Add Missing Capabilities**: Integrate NAICS market sizing, audience segmentation tracking, and human-editable configuration interfaces.

### 1.3 What Gets Transformed

| Current (AI-Specific) | Generic System |
|----------------------|----------------|
| Hardcoded list of 16 AI companies | Profile JSON with N competitors in ANY domain |
| AI-specific keywords ("model", "API", "GPT") | Domain-specific keywords defined per profile |
| AI-specific categories (LLM Provider, Dev Tools) | User-defined categories per profile |
| Fixed importance scoring | Customizable importance bands (0-10) per domain |
| AI technology tracking | Generic technology/feature tracking |
| No market sizing | NAICS-based market size data |
| No audience tracking | Audience segmentation detection |

### 1.4 Core Features Preserved

✅ **3D Force Graph** with 5 view modes, rich filtering, interactive controls
✅ **Email System** with daily digests, weekly summaries, beautiful HTML templates
✅ **KWIC Tracking** (Keyword in Context) with 100-150 char surrounding text
✅ **Competitor Mentions** with context extraction and sentiment analysis
✅ **Multi-Tab Dashboard** with 6 tabs and advanced filtering
✅ **Management Interface** for editing configuration
✅ **LLM Analysis** using Claude for relevance scoring, summaries, insights
✅ **Smart Categorization** with 8 change types and multi-signal detection
✅ **Pattern Detection** across multiple changes for trend identification
✅ **Change Magnitude** calculation (% of content changed)
✅ **Diff Engine** showing before/after comparisons

### 1.5 New Capabilities Added

✅ **NAICS Integration** - Free US Census Bureau data for market sizing
✅ **Audience Segmentation** - Track which customer segments competitors target
✅ **Setup Wizard** - Web UI for non-technical users to configure profiles
✅ **Profile Editor** - Human-editable interface for ongoing management
✅ **Profile Templates** - Pre-built configurations for common industries

---

## 2. Architecture & Design Decisions

### 2.1 Deployment Model: Separate Instance Per Domain

**Decision**: Each domain runs as a separate GitHub repository instance, NOT multiple profiles in one deployment.

**Example Repositories**:
```
github.com/my-org/energy-drinks-monitor
github.com/my-org/hydration-monitor
github.com/my-org/saas-competitors-monitor
github.com/my-org/automobile-monitor
```

**Why This Approach**:
1. **Simplicity**: No multi-tenancy complexity in database or code
2. **Isolation**: One profile's issues don't affect others
3. **GitHub-Native**: Leverage GitHub's repo isolation and access control
4. **Independent Scaling**: Each domain can scale independently
5. **Customization**: Teams can fork and modify without affecting others
6. **Clean Schema**: No `profile_id` columns everywhere

**How It Works**:
- Template repository: `generic-web-monitor-template`
- User creates new repo from template via `gh repo create --template`
- Copy example profile JSON, customize for their domain
- Push changes → GitHub Actions workflows run automatically
- Each instance has its own PostgreSQL database, GitHub Pages site, email configuration

### 2.2 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend Processing | GitHub Actions (Node.js 20) | Scraping, analysis, data sync |
| Database | PostgreSQL (Supabase/Neon) | Data storage |
| Frontend | GitHub Pages (Static HTML/JS) | Dashboard hosting |
| AI Analysis | Anthropic Claude Sonnet 3.5 | Content analysis, scoring |
| AI Baseline | Groq Llama 3.3 70B | Fast baseline analysis |
| Email | SMTP (SendGrid/Postmark) | Notification delivery |
| 3D Visualization | Three.js + 3d-force-graph | Interactive graphs |
| Market Data | US Census Bureau APIs | NAICS statistics (FREE) |

### 2.3 Repository Structure

```
generic-web-monitor-template/
├── profiles/
│   ├── active-profile.json          ← USER EDITS THIS FILE
│   ├── schemas/
│   │   └── profile-schema.json      ← Validation schema
│   ├── templates/
│   │   ├── generic-analysis.txt     ← Default AI prompt
│   │   └── examples/                ← Domain-specific prompts
│   └── examples/
│       ├── energy-drinks.json
│       ├── hydration-drinks.json
│       ├── saas-companies.json
│       └── automobiles.json
│
├── .github/workflows/
│   ├── scrape-postgres.yml          ← Scrape competitor URLs
│   ├── analyze-postgres.yml         ← AI analysis of changes
│   ├── sync-deploy-postgres.yml     ← Deploy to GitHub Pages
│   ├── daily-digest-postgres.yml    ← Send email digest
│   └── naics-data-sync.yml          ← Monthly market data sync
│
├── lib/
│   ├── profile-loader.js            ← Load and validate profile
│   ├── universal-analyzer.js        ← Domain-agnostic AI analysis
│   ├── audience-analyzer.js         ← Detect audience targeting
│   ├── kwic-extractor.js            ← Keyword in context
│   ├── mentions-tracker.js          ← Competitor mentions
│   ├── naics-api.js                 ← Census Bureau integration
│   └── importance-scorer.js         ← Score using profile bands
│
├── dashboard/
│   ├── index.html                   ← Main 6-tab dashboard
│   ├── 3d-force-graph.html          ← Graph visualization
│   ├── setup-wizard.html            ← NEW: Initial config UI
│   ├── profile-editor.html          ← NEW: Edit config UI
│   └── assets/
│       ├── dashboard.js
│       ├── graph.js
│       └── styles.css
│
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_add_audiences.sql
│       └── 003_add_naics.sql
│
├── email-templates/
│   ├── daily-digest.html            ← Beautiful HTML template
│   └── weekly-summary.html
│
└── docs/
    ├── SETUP.md
    ├── PROFILE-GUIDE.md
    └── DEPLOYMENT.md
```

---

## 3. Profile-Driven Configuration

### 3.1 The Profile File

**Location**: `profiles/active-profile.json`

**Purpose**: Single source of truth for ALL domain-specific configuration. The entire system reads this file to know what to monitor, how to score changes, which audiences to track, etc.

### 3.2 Profile Schema Sections

#### 3.2.1 Basic Metadata
- **id**: Unique UUID for this profile
- **name**: Display name for emails/dashboard
- **domain**: URL-friendly slug (e.g., 'energy-drinks')
- **description**: Brief description of what's being monitored
- **version**: Profile schema version
- **created/updated**: ISO 8601 timestamps

#### 3.2.2 Competitors Section
<<we need to monitor more than just competitors?  Or maybe this keeps it focused>>
Array of companies to monitor, each with:
- **id**: Unique identifier
- **name**: Company name
- **category**: User-defined (e.g., "Direct Competitor", "Adjacent Player", "Partner")
- **description**: Brief company description
- **urls[]**: Array of URLs to monitor, each with:
  - url: Full URL
  - type: Page type (products, pricing, blog, etc.)
  - weight: Importance multiplier (0.5 to 2.0)
  - checkFrequency: How often to check (daily, weekly, etc.)
  - selector: CSS selector for content extraction
  - enabled: Boolean to turn monitoring on/off
- **keywords[]**: Company-specific keywords
- **naics**: Primary and secondary NAICS codes
- **color**: Hex color for visualization
- **technologies[]**: Technologies/features this company uses
- **products[]**: Key products/services
- **interestLevel**: 1-10 score for strategic importance

#### 3.2.3 Importance Bands Section
Defines the 0-10 scoring scale with domain-specific meanings.

Each band includes:
- **min/max**: Score range (e.g., 9-10, 7-8)
- **label**: Human name (e.g., "Critical", "Important")
- **description**: What this band means for THIS domain
- **examples[]**: 3-5 concrete examples of changes at this level
- **notificationChannels[]**: Where to send alerts (email, slack, dashboard)
- **urgency**: Response timeframe (immediate, daily, weekly, none)
- **color**: Visualization color
- **icon**: Emoji for display

**Example for Hydration Drinks**:
- **9-10 (Critical)**: "New product launches, formula changes, major partnerships, safety recalls"
- **7-8 (Important)**: "New flavors, packaging changes, celebrity endorsements"
- **5-6 (Moderate)**: "Blog posts, regional launches, minor promotions"
- **3-4 (Low)**: "Social media content, routine updates"
- **0-2 (Minimal)**: "Footer changes, legal disclaimers"

**Example for SaaS Companies**:
- **9-10 (Critical)**: "New product launches, major pricing changes, acquisitions, security breaches"
- **7-8 (Important)**: "New features, API updates, strategic partnerships"
- **5-6 (Moderate)**: "Documentation updates, webinars, case studies"

#### 3.2.4 Domain Keywords Section
Three-tier keyword system:

- **high[]**: Critical keywords that indicate major changes (e.g., "launch", "acquire", "discontinue")
- **medium[]**: Important but not critical (e.g., "feature", "update", "partnership")
- **low[]**: Minor signals (e.g., "blog", "promotion", "contest")
- **competitive[]**: Competitor names and brands to track in mentions

#### 3.2.5 Page Weights Section
Multipliers for different page types showing relative importance:

Example:
- products: 2.0 (High importance)
- pricing: 2.0 (High importance)
- technology: 1.8
- blog: 1.2
- homepage: 0.8 (Lower importance)
- legal: 0.3 (Very low importance)

#### 3.2.6 Audiences Section (NEW)
Customer segments to track. Each audience includes:
- **id**: Unique identifier
- **name**: Display name
- **description**: Who this audience is
- **keywords[]**: Keywords indicating targeting this segment
- **channels[]**: Marketing channels for this audience
- **priority**: 1-10 importance to track
- **businessValue**: high/medium/low strategic value
- **color**: Visualization color

**Example Audiences for Hydration Drinks**:
1. Athletes and Fitness Enthusiasts
2. Health-Conscious Consumers
3. Busy Professionals
4. Parents
5. Travelers
6. College Students

#### 3.2.7 NAICS Section (NEW)
Market sizing configuration:
- **primary**: 6-digit NAICS code for main industry
- **secondary[]**: Related NAICS codes
- **trackCompetitorCount**: Boolean - show competitor count vs total establishments
- **trackMarketSize**: Boolean - show employment, payroll stats
- **trackGrowthRate**: Boolean - show year-over-year growth

#### 3.2.8 Categories Section
Change categories with detection logic. Each category has:
- **priority**: 1-10 importance level
- **indicators[]**: Keywords that suggest this category
- **contentPatterns[]**: Regex patterns for detection
- **magnitudeThreshold**: Minimum % content change to qualify

**8 Default Categories**:
1. product_launch (priority 10)
2. pricing_change (priority 9)
3. feature_update (priority 8)
4. partnership (priority 7)
5. strategic_shift (priority 8)
6. technical_update (priority 6)
7. content_update (priority 4)
8. minor_update (priority 2)

#### 3.2.9 AI Analysis Section
LLM configuration:
- **provider**: "anthropic" or "groq"
- **model**: Model name (e.g., "claude-sonnet-3-5")
- **customPromptPath**: Path to domain-specific prompt template
- **enableAudienceDetection**: Boolean
- **enableCompetitiveMentions**: Boolean
- **enableKWIC**: Boolean
- **confidenceThreshold**: Minimum confidence % (typically 70)
- **contextLength**: Characters before/after keywords (typically 150)

#### 3.2.10 Notifications Section
Email and Slack configuration:
- Daily digest settings (time, recipients, filters)
- Weekly digest settings
- Slack webhook configuration
- Importance score filters
- Category filters

#### 3.2.11 Scraping Section
Technical scraping configuration:
- **schedule**: Cron expression
- **userAgent**: Bot identification string
- **respectRobotsTxt**: Boolean
- **maxRetries**: Retry attempts on failure
- **retryDelay**: Milliseconds between retries
- **timeoutSeconds**: Request timeout
- **maxConcurrent**: Parallel requests limit
- **crawlDelay**: Milliseconds between requests

#### 3.2.12 Visualization Section
3D force graph configuration:
- **enabled**: Boolean
- **viewModes[]**: Available view modes
- **defaultView**: Initial view mode
- **nodeColors{}**: Color map for node types
- **linkStrength**: Physics simulation parameter
- **linkDistance**: Default link distance
- **particleSpeed**: Animation speed

#### 3.2.13 TheBrain Section (Stub)
```json
{
  "thebrain": {
    "enabled": false,
    "note": "TheBrain integration deferred to future phase"
  }
}
```

### 3.3 Profile Validation

All profiles are validated against JSON schema before use. Validation checks:
- Required fields present
- Data types correct
- Value ranges appropriate (scores 0-10, etc.)
- URLs well-formed
- NAICS codes are 6 digits
- Importance bands cover full 0-10 range without gaps
- No duplicate competitor IDs

---

## 4. 3D Force Graph Visualization

### 4.1 Overview

Interactive, physics-based 3D visualization of competitive landscape using Three.js and 3d-force-graph library. **This is a CRITICAL feature that required extensive work to perfect in the original system and MUST be preserved fully with ALL filtering, rendering, and interaction features.**

### 4.2 Technical Components

**Core Libraries**:
- **Three.js (0.152.0)** - 3D rendering engine with WebGL
- **three-spritetext (1.8.0)** - Text labels in 3D space
- **3d-force-graph (1.73.0)** - Force-directed graph with physics simulation
- **D3.js (7.8.5)** - D3-force simulation for physics

**Modular Architecture** (ES6 modules):
- `graph-3d-core.js` - Core rendering engine and graph initialization
- `graph-3d-visuals.js` - Visual rendering (colors, sizes, effects)
- `graph-3d-filters.js` - Complete filtering system
- `graph-3d-data.js` - Data loading and processing
- `graph-3d-ui.js` - Control panel generation
- `graph-3d-physics.js` - Force simulation controls
- `graph-3d-tooltip.js` - Hover tooltips
- `graph-3d-context.js` - Right-click context menu
- `graph-3d-config.js` - Configuration constants

**Data Sources**:
- Profile configuration (competitors, technologies, products, concepts)
- Change detection database (recent changes with timestamps)
- Intelligence data (technologies, concepts, products per company)
- NAICS data (optional market relationships)

### 4.3 Eight View Modes

The graph supports 8 distinct coloring/filtering modes for different analysis perspectives:

#### Mode 1: Entity Type (Default)
**What It Shows**: Colors nodes by their entity type with full relationship visualization

**Color Scheme**:
- **Company nodes**: Colored by company category:
  - LLM Providers: #ff5722 (red-orange)
  - AI Hardware: #4caf50 (green)
  - AI Infrastructure: #9c27b0 (purple)
  - AI Search: #f44336 (red)
  - AI Voice/Audio: #ff9800 (orange)
  - Enterprise AI: #d32f2f (dark red)
  - Image Generation: #e91e63 (pink)
  - Video AI: #3f51b5 (blue)
  - AI Consulting: #808080 (gray)
- **Technology nodes**: #00ff88 (bright green)
- **Concept nodes**: #00ffff (cyan)
- **Product nodes**: #ff00ff (magenta)

#### Mode 2: Interest Level
**What It Shows**: Heat map visualization based on strategic importance (interestLevel field in profile)
- **Color Gradient**: Green (level 1) → Yellow (level 5) → Red (level 10)
- **Formula**: `rgb(255 * (level/10), 255 * (1 - level/10), 0)`

#### Mode 3: Number of Connections
**What It Shows**: Activity level based on relationship count
- **Color Gradient**: Blue (few connections) → Purple (medium) → Red (many connections)
- **Formula**: `rgb(255 * ratio, 0, 255 * (1-ratio))` where ratio = connections/50

#### Mode 4: All Connections
**What It Shows**: Full relationship graph with all link types visible
- Same colors as Entity Type mode
- Shows technology, concept, shared-technology, and product links simultaneously

#### Mode 5: Technology Links Only
**What It Shows**: Filters to show only company ↔ technology relationships
- Hides concept and product links
- Useful for understanding technology adoption patterns

#### Mode 6: Concept Links Only
**What It Shows**: Filters to show only company ↔ AI/ML concept relationships
- Hides technology and product links
- Useful for understanding capability patterns

#### Mode 7: Recent Activity
**What It Shows**: Heat map based on change timestamps
- **Red**: Changed in last 24 hours
- **Orange**: Changed in last 48 hours
- **Yellow**: Changed in last 7 days
- **Dark gray**: No recent changes

#### Mode 8: High Interest Only
**What It Shows**: Simplified view showing only high-priority entities
- Shows only companies with interestLevel >= 7
- Hides low-priority nodes for focused analysis

### 4.4 Link Properties (Complete Specification)

**THIS SECTION CAPTURES ALL THE SOPHISTICATED LINK RENDERING THAT WAS EXTENSIVELY DEVELOPED**

#### 4.4.1 Link Width Calculation
Links have dynamic widths based on connection strength:

**Base Formula**:
```
width = 0.1 + (strength × 0.1)
Capped at maximum: 5.0
```

**Strength Calculation by Link Type**:
1. **Concept Links** (`linkType: 'concept'`):
   - `strength = linkWidthMultiplier` (full multiplier, default 12)
   - These are the strongest visual connections

2. **Technology Links** (`linkType: 'technology'`):
   - `strength = linkWidthMultiplier × min(connectionCount / 10, 1)`
   - Scales based on how many companies share this technology
   - Example: If 5 companies use same tech, strength = 12 × 0.5 = 6

3. **Shared-Technology Links** (`linkType: 'shared-technology'`):
   - `strength = linkWidthMultiplier × min(sharedCount / 5, 1)`
   - Based on number of technologies shared between two companies
   - Example: If companies share 3 techs, strength = 12 × 0.6 = 7.2

**Link Width Multiplier Control**:
- UI slider range: 1 to 50
- Default value: 12
- User-adjustable in real-time

**Thin Lines Mode**:
- When enabled: `width = 0.05 + (width × 0.1)` (much thinner but maintains relative differences)
- Useful for dense graphs with many connections

#### 4.4.2 Link Opacity
Links have configurable opacity for visual clarity:

**Opacity Settings**:
- Range: 0.1 to 1.0
- Default: 0.5
- UI slider for real-time adjustment
- Applied to all link colors as alpha channel

**Color with Opacity Formula**:
```
rgba(R, G, B, opacity)
```

#### 4.4.3 Link Colors by Type

**Technology Links**:
- Color: `rgba(0, 255, 136, opacity)` (bright green)
- Indicates company uses this technology

**Concept Links**:
- Color: `rgba(78, 205, 196, opacity)` (teal/cyan)
- Indicates company employs this AI/ML concept

**Shared-Technology Links**:
- Color: `rgba(255, 215, 0, opacity × 0.8)` (gold, slightly more transparent)
- Connects two companies that use same technologies

**Default Links**:
- Color: `rgba(150, 150, 150, opacity)` (gray)
- Fallback for other relationship types

**Monochrome Mode**:
- When enabled, all links become: `rgba(0, 255, 255, opacity)` (cyan)

#### 4.4.4 Animated Link Particles ("The Little Thingies")

**THIS IS THE ANIMATED PARTICLE SYSTEM THAT TRAVELS ALONG LINKS**

**Particle Configuration**:
- **Count per Link**: 2 particles (default, user-configurable)
- **Speed**: 0.002 (default), equivalent to 0.2× speed multiplier
- **Width**: 2 pixels
- **Color**: Inherits from link color
- **Direction**: Flows from source → target along link path

**Speed Control**:
- Base speed: 0.01
- Multiplier range: 0.5× (slow) to 3.0× (fast)
- Formula: `linkDirectionalParticleSpeed(0.01 × speedMultiplier)`

**Particle Toggle**:
- UI checkbox: "Show Particles"
- When disabled: `linkDirectionalParticles(0)` (removes all particles)
- When enabled: `linkDirectionalParticles(particleCount)` (default 2)

**Visual Effect**: Particles create a "flow" effect showing relationship direction and strength, making the graph feel alive

**Performance Note**: Particles are automatically reduced when >100 links are visible to maintain 60 FPS

### 4.5 Node Properties (Complete Specification)

#### 4.5.1 Node Rendering
Nodes are rendered as 3D spheres using THREE.js:

**Geometry**:
- Shape: `THREE.SphereGeometry(size, 16, 16)`
- 16 segments for smooth appearance
- Size range: 2 to 30 (based on sizing mode)

**Material**:
- Type: `THREE.MeshPhongMaterial`
- Properties:
  - `color`: Base node color
  - `emissive`: Same as color for glow effect
  - `emissiveIntensity`: 0.3 (subtle internal glow)
  - `shininess`: 100 (gives metallic appearance)

#### 4.5.2 Node Size Modes
Four different sizing algorithms:

**Mode 1: Uniform (Default)**
- All nodes: size = 8
- Clean, simple visualization
- Best for focus on connections rather than metrics

**Mode 2: By URL Count** (`url-count`)
- Formula: `size = max(2, min(20, urlCount × 0.5))`
- Companies with more monitored URLs appear larger
- Example: 10 URLs → size = 5, 40 URLs → size = 20 (capped)

**Mode 3: By Connections** (`connections`)
- Formula: `size = max(2, min(30, connectionCount × 0.3))`
- Nodes with more relationships appear larger
- Shows network centrality visually

**Mode 4: By Interest Level** (`interest-level`)
- Formula: `size = max(2, interestLevel × 2)`
- Strategic importance shown through size
- Example: interest 5 → size = 10, interest 10 → size = 20

#### 4.5.3 Node Glow Effect (High Interest Indicator)
Nodes with `interestLevel >= 7` automatically get a glow effect:

**Glow Implementation**:
- Additional `SphereGeometry(size × 1.5)` added as child object
- Material: `THREE.MeshBasicMaterial`
  - `color`: Same as node color
  - `transparent`: true
  - `opacity`: 0.3
- Creates an aura around high-priority nodes
- Makes strategically important entities stand out visually

#### 4.5.4 Node Labels (Text Sprites)
Labels are rendered using `SpriteText`:

**Label Configuration**:
- Font: System default, sans-serif
- Height calculation: `max(4, min(40, size × 2 × fontScale × companyMultiplier))`
- Position: `y = size + (size × 2)` (above the sphere)
- Color: Inherits from node color
- `depthWrite: false` (prevents z-fighting)

**Font Size Control**:
- UI slider range: 4 to 16
- Default: 12
- `fontScale = fontSize / 12` (proportional scaling)

**Company Label Scale**:
- Additional multiplier for company nodes: 1.0 to 3.0
- Tech/concept nodes use scale 1.0
- Allows emphasizing company names while keeping tech labels smaller

**Label Toggle**:
- UI checkbox: "Show Labels"
- When disabled: Labels removed, only spheres visible
- Improves performance with many nodes

### 4.6 Complete Filtering System

**THE FILTERING SYSTEM REQUIRED EXTENSIVE THOUGHT AND DEVELOPMENT - ALL 10 FILTER TYPES MUST BE PRESERVED**

#### 4.6.1 Entity Type Filter
**Location**: "Filter by Type" section
**UI**: Checkboxes with Select All / Select None buttons

**Functionality**:
- Dynamically populated from actual company types in data
- Each checkbox shows: `[Type Name] (count)`
- Filters affect both companies and their connected entities
- Example: Unchecking "LLM Providers" hides those companies AND orphaned tech nodes

**Filter Logic**:
```javascript
filteredNodes = nodes.filter(node =>
  node.nodeType !== 'company' || entityTypeFilters.has(node.companyType)
)
```

#### 4.6.2 Technology Filter (Advanced Mode Only)
**Location**: "Filter by Technology" section
**UI**: Scrollable checkbox list with search box

**Functionality**:
- Shows all unique technologies from intelligence data
- Search box filters checkbox list in real-time
- When technology selected: Show only companies using that tech + the tech node
- BFS algorithm includes connected nodes

**Search Implementation**:
- Case-insensitive substring match
- Updates checkbox visibility dynamically
- Preserves checked state when searching

#### 4.6.3 AI Concepts Filter (Advanced Mode Only)
**Location**: "Filter by AI Concepts" section
**UI**: Scrollable checkbox list with search box

**Functionality**:
- Shows all unique AI/ML concepts from intelligence data
- Same search/filter behavior as technology filter
- Useful for finding companies with specific capabilities

#### 4.6.4 Product Filter (Advanced Mode Only)
**Location**: "Filter by Products" section
**UI**: Scrollable checkbox list

**Functionality**:
- Shows detected products from company intelligence
- When selected: Shows companies offering that product + product node

#### 4.6.5 Search Filter with Depth
**Location**: "Search" section (both Simple and Advanced)
**UI**: Text input + Depth dropdown

**Search Query**:
- Case-insensitive substring match on node names
- Updates in real-time as user types

**Depth Options**:
1. **Match Only** (depth = 0): Shows only nodes matching search term
2. **1 Level Out** (depth = 1, default): Includes direct connections
3. **2 Levels Out** (depth = 2): Includes connections of connections

**Implementation**: Breadth-First Search (BFS) algorithm
```javascript
// BFS to find nodes within depth levels
visited = matchingNodes
for (depth iterations) {
  for (each node in current level) {
    find all connected nodes via links
    add to visited set
    add to queue for next level
  }
}
```

**Use Case**: Search "GPT" with depth=1 shows GPT-4 node + all companies using it

#### 4.6.6 Link Strength Threshold Filter
**Location**: "Link Strength Filter" section
**UI**: Slider (0 to 10)

**Functionality**:
- Hides links with `strength < threshold`
- Reduces visual clutter in dense graphs
- Orphaned nodes automatically removed after link filtering

**Example**: Setting threshold to 3 hides weak connections, showing only strong relationships

#### 4.6.7 Entity Limit Filter
**Location**: "Number of Entities" section
**UI**: Slider (10 to 500)

**Functionality**:
- Limits total nodes displayed
- Default: 200
- Takes first N nodes after other filters applied
- Prevents performance issues with massive graphs

#### 4.6.8 Node Type Visibility Toggles
**Location**: "Node Visibility" section
**UI**: 4 checkboxes

**Options**:
1. **Show Technology Nodes** - Toggle tech nodes on/off
2. **Show Concept Nodes** - Toggle concept nodes on/off
3. **Show Product Nodes** - Toggle product nodes on/off
4. **Show Company Nodes** - Toggle company nodes on/off

**Logic**: Applied BEFORE other filters as base visibility layer

#### 4.6.9 Flatten Graph Toggle (2D/3D Mode)
**Location**: "View Mode" section
**UI**: Checkbox

**Functionality**:
- **2D Mode** (`numDimensions(2)`): Flattens Z-axis, creates 2D layout
- **3D Mode** (`numDimensions(3)`): Full 3D physics simulation

**Transition Behavior**:
- When switching from 2D → 3D: Randomizes Z positions to break out of plane
- Applies temporary strong repulsion force for 2 seconds
- Reheats simulation to redistribute nodes

**Use Case**: 2D mode useful for presentations, 3D mode for exploration

#### 4.6.10 Custom Tag Filter (Click-to-Filter)
**Location**: Triggered by clicking technology/concept tags in tooltips
**UI**: No direct control (activated programmatically)

**Functionality**:
- When user clicks a tech/concept tag: `filterByTag(tagName)`
- Shows only companies using that tag + the tag node
- Info panel shows: "Filtered by: [Tag Name]" with Clear button
- Overrides other filters temporarily

**Clear Filter**: Returns to previous filter state

### 4.7 Draw Modes (Layout Algorithms)

#### Mode 1: Normal
**Layout**: Standard force-directed 3D distribution
- D3-force simulation with charge, link, and center forces
- Nodes naturally cluster based on connections
- No special positioning

#### Mode 2: Group by Type
**Layout**: Companies clustered by category
- Force simulation with additional category-based attraction
- Creates distinct clusters for each company type
- Technologies/concepts positioned between relevant clusters

#### Mode 3: Changes Past 24 Hours
**Layout**: Recent activity highlighted and positioned forward
- Companies changed <24h positioned closer to camera (Z+)
- Unchanged companies pushed back (Z-)
- Highlight color: Red for changed nodes

#### Mode 4: Changes Past 48 Hours
- Same as above but 48-hour window
- Highlight color: Orange

#### Mode 5: Changes Past Week
- Same as above but 7-day window
- Highlight color: Yellow

### 4.8 UI Control Panel (Simple vs Advanced Modes)

**THE UI HAS TWO COMPLEXITY MODES WITH EXTENSIVE CONTROLS**

#### 4.8.1 Mode Toggle
**Location**: Top of control panel
**UI**: Two-button toggle (Simple | Advanced)

**Simple Mode** (Default):
- Shows essential controls only (~10 controls)
- Beginner-friendly
- Faster to navigate

**Advanced Mode**:
- Shows all controls (~25+ controls)
- Full filtering capabilities
- For power users

#### 4.8.2 Simple Mode Controls (Visible by Default)

1. **Draw By** (Layout Mode dropdown)
2. **Legend** (Auto-generated from visible node types)
3. **View Mode** (Color By dropdown)
4. **Node Size** (Size By dropdown)
5. **View Mode** (Flatten Graph checkbox)
6. **Node Visibility** (4 checkboxes for node types)
7. **Graph Physics** (3 sliders: Force, Distance, Gravity)
8. **Link Strength Filter** (Threshold slider)
9. **Number of Entities** (Limit slider)
10. **Filter by Type** (Checkboxes with Select All/None)
11. **Search** (Text input + Depth dropdown)

#### 4.8.3 Advanced Mode Additional Controls

12. **Stats** (Monitoring counts display)
13. **Visual Settings** (8 toggles):
    - Show Links
    - Show Labels
    - Label Font Size (slider 4-16)
    - Show Particles
    - Link Width Multiplier (slider 1-50)
    - Link Opacity (slider 0.1-1.0)
    - Floating Tooltip
    - Monochrome Mode
    - Show Change Rings
14. **Camera Controls** (Center View button)
15. **Filter by Technology** (Checkbox list + search)
16. **Filter by AI Concepts** (Checkbox list + search)
17. **Filter by Products** (Checkbox list)

#### 4.8.4 Collapsible Sections
**All sections are collapsible** to save space:
- Click section header to expand/collapse
- Arrow indicator shows state (▶ collapsed, ▼ expanded)
- State persists during session

#### 4.8.5 Mobile Optimization
**On screens < 768px**:
- Control panel slides up from bottom
- Toggle button: "⚙️ Config" (bottom-right)
- Panel covers bottom 60% of screen when open
- Swipe down to close
- All controls remain functional

### 4.9 Mouse & Keyboard Interactions

#### 4.9.1 Camera Controls
**Left-Click + Drag**:
- Rotates camera around graph center
- Maintains current zoom level
- Smooth orbital rotation

**Right-Click + Drag**:
- Pans camera (translates view)
- Useful for repositioning without rotating

**Middle-Click + Drag** OR **Ctrl + Left-Click + Drag**:
- Zooms camera in/out
- Alternative to scroll wheel for precise control

**Mouse Scroll Wheel**:
- Scroll up: Zoom in
- Scroll down: Zoom out
- Smooth continuous zooming

**Double-Click Empty Space**:
- Centers view on all nodes
- Fits graph to window

#### 4.9.2 Node Interactions
**Hover Over Node**:
- Shows floating tooltip with:
  - Node name (bold, large)
  - Node type (Technology/Concept/Product/Company)
  - Company type (if company node)
  - Interest level (if company)
  - URL count (if company)
  - Connection count
  - Technologies list (if company)
  - Concepts list (if company)
  - Products list (if company)
  - Recent changes count (if any)
- Tooltip follows mouse cursor (when "Floating Tooltip" enabled)
- Tooltip fixed in place (when disabled)
- 500ms delay before showing (prevents flicker)

**Click Node**:
- Centers camera on node with smooth animation
- Camera distance: 300 units from node
- Animation duration: 1000ms
- Node remains highlighted

**Right-Click Node**:
- Shows context menu with options:
  - **"Show Only This & Connected"**: Filters graph to show only this node + directly connected nodes
  - **"Show All"**: Clears all filters, shows full graph
  - **"Center Camera Here"**: Smoothly moves camera to focus on node
  - **"Fit to Window"**: Zooms to show all visible nodes
  - **"Cancel"**: Closes menu

**Click Technology/Concept/Product Node**:
- Automatically applies `filterByTag()` to show only companies using that entity
- Updates info panel with filter status
- Shows "Clear Filter" button in info panel

#### 4.9.3 Link Interactions
**Hover Over Link**:
- Link opacity increases to 1.0 (full brightness)
- Particles speed up 2× temporarily
- Shows tooltip (if enabled) with:
  - Link type (Technology/Concept/Shared-Tech)
  - Connection strength
  - Source → Target names

**Click Link**:
- Highlights both connected nodes
- Dims all other nodes to opacity 0.3
- Increases link width by 50%
- Click again or click elsewhere to reset

#### 4.9.4 Keyboard Shortcuts
**Escape**:
- Closes context menu
- Clears active filter
- Resets focus

**Space**:
- Toggles physics simulation pause/resume
- Useful for capturing screenshots

**R**:
- Reheats simulation (applies force to redistribute nodes)
- Useful when nodes are stuck in local minima

**C**:
- Centers view on all nodes
- Same as "Center View" button

**F**:
- Fits all visible nodes to window
- Calculates bounding box and adjusts camera

#### 4.9.5 Click-to-Filter Workflow
Example user flow:
1. User hovers over node "OpenAI"
2. Tooltip shows technologies: ["GPT-4", "DALL-E", "Whisper"]
3. User clicks "GPT-4" technology tag in tooltip
4. Graph filters to show only companies using GPT-4
5. Info panel shows: "Filtered by: GPT-4 | Showing 8 companies"
6. User clicks "Clear Filter" button
7. Full graph restored

### 4.10 Physics Simulation

#### 4.10.1 D3-Force Configuration
The graph uses D3-force for physics simulation with three force types:

**Charge Force** (Node Repulsion):
- Default strength: -300
- UI slider range: -1000 to -50
- Formula: All nodes repel each other
- Negative value = repulsion, positive = attraction
- Higher absolute value = stronger force

**Link Force** (Connection Strength):
- Default distance: 30
- UI slider range: 10 to 200
- Formula: Connected nodes try to maintain this distance
- Longer distance = more spread out graph

**Center Force** (Gravity):
- Default strength: 0.3
- UI slider range: 0.0 to 1.0
- Formula: All nodes pulled toward graph center
- Prevents nodes from drifting away
- 0 = no gravity, 1 = strong pull to center

#### 4.10.2 Force Configuration Presets
**Tight Clustering** (for dense data):
- Charge: -200
- Link Distance: 20
- Center Gravity: 0.5

**Spread Out** (for clarity):
- Charge: -500
- Link Distance: 100
- Center Gravity: 0.2

**Balanced** (default):
- Charge: -300
- Link Distance: 30
- Center Gravity: 0.3

#### 4.10.3 Simulation Control
**Reheat Simulation**:
- Increases simulation alpha to 1.0
- Causes nodes to rearrange
- Use when graph looks "stuck"

**Pause/Resume**:
- Space bar toggles
- Paused: Nodes freeze in place
- Useful for screenshots or analysis

**Collision Detection**:
- Prevents node overlap
- Radius: node size + 2
- Applied in all modes

#### 4.10.4 True 3D Physics
**Critical Implementation Details**:
- Must call `numDimensions(3)` IMMEDIATELY after graph creation
- Default is 2D - will collapse to flat plane if not set
- When switching 2D→3D: Randomize Z positions to break out of plane
- Apply strong charge force briefly (2 seconds) to redistribute

**Z-Axis Force**:
- Nodes naturally distribute in 3D space
- No forced layering (organic distribution)
- Initial positions: Random within [-300, +300] cube

### 4.11 Performance Optimization

#### 4.11.1 Limits & Throttling
**Hard Limits**:
- Maximum nodes displayed: 500 (configurable, default 200)
- Maximum links displayed: 1000
- If exceeded: Show only highest-priority entities

**Particle Throttling**:
- >100 links visible: Reduce particles from 2 to 1 per link
- >200 links visible: Disable particles entirely
- Automatic, transparent to user

**Debouncing**:
- Filter changes: 150ms debounce
- Slider adjustments: 100ms debounce
- Search input: 300ms debounce

#### 4.11.2 Rendering Optimization
**Level of Detail (LOD)**:
- Nodes >500 units from camera: Reduced to 8 segments (from 16)
- Nodes >1000 units: No label rendered
- Links >800 units: Width reduced by 50%

**Canvas Rendering**:
- Uses WebGL via Three.js (not Canvas 2D or SVG)
- Hardware accelerated
- 60 FPS target

**Memory Management**:
- Old geometries disposed when filters change
- Textures recycled
- Tooltip DOM elements pooled (not recreated)

#### 4.11.3 Data Loading Strategy
**Progressive Loading**:
1. Load company nodes first (show immediately)
2. Calculate technology/concept nodes (50ms delay)
3. Calculate links (100ms delay)
4. Enable physics simulation (200ms delay)

**Lazy Loading**:
- Technology/concept counts calculated on-demand
- Product nodes only created if products exist in data
- KWIC contexts loaded separately when clicked

### 4.12 Error States & Edge Cases

**No Data Available**:
- Shows message: "No data available. Run scraping workflow first."
- Displays minimal empty graph with loading instructions

**No Nodes Match Filters**:
- Shows message: "No entities match current filters. Try adjusting filter settings."
- "Reset All Filters" button prominently displayed

**All Nodes Orphaned** (no connections):
- Still displays nodes in grid pattern
- Message: "No connections between entities. This may indicate missing intelligence data."

**Graph Too Large** (>500 nodes):
- Automatically applies entity limit to 200
- Shows warning: "Graph limited to 200 entities for performance. Use filters to refine."

**WebGL Not Supported**:
- Graceful fallback message: "3D visualization requires WebGL support. Please use a modern browser."
- Link to 2D table view

---

---

## 5. Email Notification System

### 5.1 Overview

Comprehensive HTML email system that sends beautiful, actionable intelligence reports. **This is a critical feature with extensive template work that must be preserved.**

### 5.2 Email Types

#### 5.2.1 Daily Digest
**When**: Automatically after morning scraping workflow completes
**Who**: All recipients in profile.notifications.email.recipients
**Subject**: "[Profile Name] Daily Intelligence Digest - [Date]"

**Content Sections**:

1. **Header**
   - Profile name and domain
   - Date
   - Beautiful gradient background

2. **Executive Summary Box**
   - One-paragraph overview
   - Total companies monitored
   - Total changes detected
   - Number of critical/important changes

3. **Statistics Grid** (3 cards side-by-side)
   - Companies Monitored (count)
   - Changes Detected (count)
   - High Priority (count)

4. **Critical Changes Section** (if any with importance 9-10)
   - Company name and category
   - Importance badge (color-coded)
   - Change category (product_launch, pricing_change, etc.)
   - Time detected (e.g., "2 hours ago")
   - AI-generated summary (2-3 sentences)
   - KWIC snippets (up to 3) showing keyword context:
     - "...before text **keyword** after text..."
   - Detected audience targets (if any) with confidence %
   - Link to source
   - "View Diff" link

5. **Important Changes Section** (if any with importance 7-8)
   - Similar structure to Critical but different styling

6. **AI Insights Section** (if available)
   - Per-company insights from LLM analysis
   - Strategic implications
   - Recommendations

7. **Stable Companies Section**
   - List of companies with no changes detected
   - Reassurance that monitoring is working

8. **Monitoring Issues Section** (if any errors)
   - Companies where scraping failed
   - Error messages
   - What's being done about it

9. **Call to Action Button**
   - "View Full Dashboard" → links to GitHub Pages site

10. **Footer**
    - Coverage summary (X companies across Y domain)
    - Next scheduled run time
    - NAICS market stats (establishments, employment)
    - Links to Dashboard, Settings, Unsubscribe

**Styling**:
- Modern, professional design
- Color-coded importance levels
- Responsive (works on mobile)
- Monospace font for KWIC snippets
- Gradient headers
- Shadow effects on cards

#### 5.2.2 Weekly Summary
**When**: Every Monday 8 AM (configurable in profile)
**Who**: Same recipients as daily, or different list in profile
**Subject**: "[Profile Name] Weekly Intelligence Summary - [Week of Date]"

**Content Differences from Daily**:
- 7-day aggregate statistics instead of single day
- Trend analysis:
  - "3 competitors launched new products this week"
  - "Pricing changes detected at 4 companies"
  - "Athletes audience targeted by 6 competitors"
- Top 5 most important changes (not all changes)
- Pattern detection highlights:
  - Categories most active
  - Competitors most active
  - Emerging themes
- Strategic recommendations from AI weekly analysis
- Competitor comparison matrix (who's doing what)
- Embedded trend charts (if image generation available)

#### 5.2.3 Critical Alerts
**When**: Immediately upon detecting importance 9-10 change
**Who**: Subset of recipients configured for urgent alerts
**Subject**: "🚨 CRITICAL: [Company] - [Brief Change]"

**Content**:
- Single change focus
- Urgent styling
- Immediate action recommendations
- All context (KWIC, mentions, audience)

#### 5.2.4 Test Email
**When**: Manually triggered from dashboard
**Who**: Single recipient (tester)
**Purpose**: Verify SMTP configuration and preview template

### 5.3 Email Configuration

**Profile Settings**:
- enabled: true/false
- recipients: Array of email addresses
- dailyDigestTime: "08:00"
- dailyDigestEnabled: true/false
- weeklyDigestDay: "Monday"
- weeklyDigestTime: "08:00"
- weeklyDigestEnabled: true/false
- includeScores: [7, 8, 9, 10]
- includeCategories: ["product_launch", "pricing_change", "partnership"]
- template: "default"

**GitHub Secrets Required**:
- `SMTP_HOST` - SMTP server address
- `SMTP_PORT` - Port (typically 587)
- `SMTP_USER` - Email account username
- `SMTP_PASS` - Email account password/app password
- `NOTIFICATION_EMAIL` - From address (optional, defaults to SMTP_USER)

### 5.4 Email Triggering

**Daily Digest Workflow**:
1. Scraping workflow completes
2. Analyze workflow completes
3. Daily digest workflow triggers automatically
4. Reads profile for recipients and settings
5. Queries database for changes in last 24 hours
6. Filters by importance scores and categories from profile
7. Generates HTML using template
8. Sends via SMTP
9. Logs delivery status to database

**Manual Trigger**:
From dashboard Email tab, click email type card → triggers GitHub Actions workflow dispatch event

---

## 6. Dashboard System

### 6.1 Overview

Multi-tab dashboard hosted on GitHub Pages showing real-time competitive intelligence. **The filtering system took significant work to perfect and must be preserved fully.**

### 6.2 Six Main Tabs

#### Tab 1: Dashboard (Overview)

**Stats Cards Row**:
Six cards showing:
1. System Status (Operational / Issues)
2. Companies Monitored (count from profile)
3. URLs Tracked (total monitored URLs)
4. Last Check (time ago since last scrape)
5. Backend Type (PostgreSQL badge)
6. Changes Today (changes in last 24 hours)

**Companies Grid**:
- Card-based layout (3-4 columns depending on screen width)
- Each card shows:
  - Company name
  - Category badge
  - Status indicator (Active / Error dot)
  - Number of monitored URLs
  - Last checked time
  - Last change time (if any)
  - Change indicator pulsing animation if recent (< 24h)
  - "View Details" button expanding card to show:
    - All monitored URLs with status
    - Recent changes summary
    - Technologies/products
    - Interest level

**Filter Dropdown**:
- "All Categories" (default)
- One option per category from profile
- Live filtering without page reload

#### Tab 2: Extracted Data

**Purpose**: Detailed, filterable view of all detected changes with full context

**Filter Controls** (Sticky header):
- **Company**: Dropdown of all competitors (All / Specific company)
- **Type**: Dropdown of page types (All / products / pricing / blog / etc.)
- **Importance**: Dropdown (All / Critical 9-10 / Important 7-8 / Moderate 5-6 / Low 0-4)
- **Keyword Search**: Text input (searches in AI summaries, titles, KWIC context)
- **Time Range**: Dropdown (All Time / Last 24 Hours / Last 7 Days / Last 30 Days / Last 90 Days)
- **Category**: Dropdown of change categories from profile (All / product_launch / pricing_change / etc.)
- **Audience**: Dropdown of audiences from profile (All / athletes-fitness / health-conscious / etc.)
- **Apply Filters** button
- **Clear All** button
- **Export CSV** button

**Results Table**:
Columns:
1. Company name
2. Type (page type)
3. Content Preview (first 150 chars + "...")
4. Importance (visual bar 0-10 + label)
5. Audience (tags for detected audiences)
6. Detected (time ago)

**Row Click Behavior**:
Expands to show full details:
- **AI Summary**: Complete LLM-generated summary
- **Key Changes**: Bullet list of what changed
- **KWIC Snippets**: Up to 5 keyword-in-context snippets with keywords highlighted
- **Competitor Mentions**: List of mentioned competitors with mention count and context
- **Detected Audiences**: Audience tags with confidence percentages
- **Strategic Insights**: Recommendations from AI
- **Source**: Link to original URL
- **View Diff**: Button opening modal with before/after comparison
- **Full Analysis**: Button opening detailed analysis view

**Performance**:
- Pagination: 50 results per page
- Filters applied client-side for <1000 results, server-side for larger datasets
- Loading indicators while filtering
- "Load More" button for infinite scroll option

#### Tab 3: Change History

**Purpose**: Timeline view of all changes with visual importance indicators

**Layout**:
- Reverse chronological order (newest first)
- Grouped by day with date headers
- Visual timeline line on left
- Importance-color-coded dots on timeline

**Each Change Card**:
- Company name and category
- Time detected (relative: "2 hours ago")
- Importance badge (color-coded, with emoji icon)
- Category badge (product_launch, pricing_change, etc.)
- AI summary (2-3 sentences)
- KWIC snippets (if keywords matched)
- Competitor mentions (if any)
- Audience targets (if detected)
- Magnitude indicator (X% of page changed)
- Actions:
  - View Source link
  - View Diff button
  - Full Analysis button

**Filters**:
Same as Extracted Data tab (company, type, importance, keyword, time, category, audience)

**Special Features**:
- "Jump to Date" button opens date picker
- "Compare Changes" mode: Select 2 changes to compare side-by-side

#### Tab 4: System Logs

**Purpose**: Monitor GitHub Actions workflow status

**Sections**:

1. **Recent Workflow Runs**
   - Last 10 runs for each workflow type
   - Status (success, failure, in progress)
   - Duration
   - Trigger (scheduled, manual dispatch, push)
   - Logs link → opens GitHub Actions page
   - "Re-run" button for manual trigger

2. **Workflow Types**:
   - Scrape Workflow
   - Analyze Workflow
   - NAICS Sync Workflow
   - Daily Digest Workflow
   - Deploy Workflow

3. **System Health**:
   - Database connection status
   - Last successful scrape per company
   - Failed scrape count (last 24h)
   - API quota usage (if applicable)

4. **Quick Actions**:
   - "Trigger Scrape Now" button
   - "Trigger Analysis Now" button
   - "Send Test Email" button
   - "Sync NAICS Data" button

#### Tab 5: 3D Force Graph

Embedded force graph visualization (see Section 4)

Full-screen option available

#### Tab 6: Email Notifications

**Purpose**: Manage email settings and trigger manual emails

**Email Trigger Cards** (Grid Layout):

1. **Test Email Card**
   - Icon: 🧪
   - Title: "Test Email"
   - Description: "Verify email configuration"
   - Button: "Send Test Email"
   - Form on click: Enter recipient email

2. **Daily Digest Card**
   - Icon: 📊
   - Title: "Daily Digest"
   - Description: "Summary of all companies"
   - Buttons: "Send Now" | "Schedule Settings"
   - Shows next scheduled time
   - Enable/Disable toggle

3. **Weekly Summary Card**
   - Icon: 📋
   - Title: "Weekly Summary"
   - Description: "7-day trends and insights"
   - Buttons: "Send Now" | "Schedule Settings"
   - Shows next scheduled time
   - Enable/Disable toggle

4. **Critical Alerts Card**
   - Icon: 🚨
   - Title: "Critical Alerts"
   - Description: "Importance 9-10 only"
   - Button: "Send Now"
   - Enable/Disable toggle

**Email Configuration Form**:
- Recipients (comma-separated emails)
- Daily digest time (time picker)
- Weekly digest day and time
- Importance threshold (multi-select: 7, 8, 9, 10)
- Category filters (checkboxes for each category)
- Template preview button
- Save Changes button

**Email Log Table**:
- Timestamp sent
- Email type
- Recipient
- Status (delivered, failed)
- Changes included (count)
- "View Email" button (preview sent email)

### 6.3 Management Interface (`manage.html`)

**Purpose**: Edit configuration without directly editing JSON

**Three Tabs**:

#### Manage Tab 1: Companies

**Table Columns**:
- Company name
- Category
- URL (primary monitoring URL)
- CSS Selector
- Status (Active / Error)
- Last Checked
- Actions (Edit button)

**Edit Company Form** (Modal or Inline):
- Company name (text input)
- Category (dropdown)
- URLs section:
  - Add/remove URL rows
  - For each: URL, type, weight, frequency, selector, enabled checkbox
- Keywords (comma-separated text area)
- NAICS codes (primary dropdown + secondary multi-select)
- Interest level (1-10 slider)
- Color picker
- Technologies (text area, comma-separated)
- Products (text area, comma-separated)
- Save / Cancel buttons

**Add Company Button**:
Opens same form empty

#### Manage Tab 2: Extracted Data

**Purpose**: Review what's actually being extracted from pages

**Table Columns**:
- Company
- Extracted Content:
  - Title (from page)
  - Description (from meta tags or CSS selector)
  - Keywords Found (badges)
- Has Update? (Yes/No badge)
- Last Extraction (timestamp)

**Use Case**: Verify CSS selectors are extracting correct content

#### Manage Tab 3: Settings

**General Settings Form**:
- Update Keywords (text area, comma-separated)
- Check Frequency (number input in hours)
- Email Recipients (text area, one per line)
- NAICS Primary Code (6-digit input with validation)
- NAICS Secondary Codes (multi-select or comma-separated)
- Save Settings button

**Configuration Preview**:
- JSON preview of current active-profile.json
- "Download Profile" button
- "Upload Profile" button (replaces active-profile.json)

### 6.4 Setup Wizard (`setup-wizard.html`) - NEW

**Purpose**: Initial configuration for non-technical users creating new instance

**Step 1: Domain Selection**
- Dropdown of common industries (pre-populated)
- "Custom" option with text input
- "Start with template" button for each option
- Example: Select "Energy Drinks" → loads energy-drinks.json template as starting point

**Step 2: Add Competitors**
- Form to add competitors one at a time:
  - Company name
  - Website URL
  - Category (dropdown with ability to add new)
  - "Add pages to monitor" button opens URL wizard:
    - Suggests common page types (products, pricing, blog, about)
    - User enters URLs or uses "Auto-detect" button
    - Auto-detect fetches robots.txt and sitemap to suggest URLs
- List of added competitors (editable)

**Step 3: Define Importance Bands**
- Visual 0-10 scale builder
- Drag to create bands
- For each band, enter:
  - Label
  - Description
  - Examples (3-5)
  - Notification channel checkboxes
- Preview how each band will appear in emails/dashboard

**Step 4: Keywords**
- Three sections (High / Medium / Low)
- Text areas for comma-separated keywords
- "Suggest keywords" button uses AI to analyze competitor websites and suggest relevant keywords
- Competitive keywords section (competitor names/brands)

**Step 5: Audiences** (Optional)
- "Skip" button available
- Add audience form:
  - Name
  - Description
  - Keywords (text area)
  - Channels (text area)
  - Priority (1-10 slider)
- Pre-built templates available (e.g., "Athletes", "Parents", "Professionals")

**Step 6: NAICS** (Optional)
- "Skip" button available
- Search NAICS database by keyword or browse hierarchy
- Select primary code
- Select secondary codes (multi-select)
- Preview market size data from Census Bureau

**Step 7: Notifications**
- Email addresses (comma-separated)
- Daily digest enabled? (checkbox)
- Weekly digest enabled? (checkbox)
- Test email button

**Step 8: Review & Save**
- Summary of all settings
- "Edit" button for each section
- "Generate Profile" button
- Downloads active-profile.json
- "Commit and Deploy" button (pushes to GitHub)

---

## 7. KWIC & Mentions Tracking

### 7.1 Keyword in Context (KWIC)

**Purpose**: Extract surrounding text around matched keywords to understand context and meaning

**How It Works**:
1. When a change is detected with keyword matches
2. For each matched keyword:
   - Extract N characters before keyword (default 150)
   - Extract N characters after keyword (default 150)
   - Find word boundaries to avoid cutting mid-word
   - Store as {before, keyword, after}
3. Score relevance of each KWIC snippet based on:
   - Keyword priority (high/medium/low from profile)
   - Proximity to other high-value keywords
   - Presence in heading vs body text
4. Keep top 5 most relevant snippets per change

**Context Length**:
- Default: 150 characters before and after
- Configurable in profile.aiAnalysis.contextLength
- Adjustable from 50 (short context) to 300 (long context)

**Display**:
- In dashboard: "...before text **keyword** after text..."
- In emails: Styled with monospace font and yellow highlight on keyword
- In database: Stored as JSON array of snippet objects

**Example**:
Change detected on Liquid IV product page with keyword "launch"

KWIC Snippet:
```
...today we're excited to announce the official launch of our new Energy Multiplier line, designed
specifically for athletes and fitness enthusiasts who...
```

### 7.2 Competitor Mentions Tracking

**Purpose**: Track when competitors mention each other, compare themselves, or reference competitive products

**What Gets Tracked**:
1. **Direct Mentions**: Company name appears in content
2. **Product Mentions**: Competitor product names mentioned
3. **Comparison Statements**: "better than X", "versus Y", "unlike Z"
4. **Positioning**: Claims like "market leader", "industry first"

**Mention Types**:
1. **Reference**: Neutral mention ("Also available from Competitor X")
2. **Comparison**: Direct comparison ("Better performance than X")
3. **Partnership**: Collaboration mention ("In partnership with Y")
4. **Competitive**: Negative positioning ("Unlike X, we don't use...")

**Data Captured Per Mention**:
- Competitor name
- Mention count (how many times on this page)
- Context (KWIC-style: 100 chars before/after)
- Mention type (reference, comparison, partnership, competitive)
- Sentiment (positive, neutral, negative)
- Page URL where found
- Company doing the mentioning
- Detection timestamp

**Context Extraction**:
Same KWIC logic as keywords, but 100 char context (shorter than keywords)

**Sentiment Analysis**:
Simple rule-based initially:
- Positive: "partner", "integrate", "powered by"
- Negative: "unlike", "worse", "lacking"
- Neutral: Default

Enhanced with LLM:
Send mention context to Claude, ask for sentiment classification

**Aggregation**:
- Total mentions per competitor across all monitored companies
- "Most mentioned" ranking
- Mention frequency trends over time
- Sentiment breakdown (% positive, neutral, negative)

**Dashboard Display**:

**Mentions Panel Widget**:
Shows top 5 most mentioned competitors this week with:
- Competitor name
- Mention count
- Sentiment indicator (emoji: 😊 😐 😠)
- Mention type breakdown (pie chart or bar)
- "View All" button → detailed mentions page

**Detailed Mentions Page**:
- Table with columns:
  - Competitor mentioned
  - Mentioned by (company)
  - Count
  - Type
  - Sentiment
  - Latest context snippet
  - View all contexts button
- Filterable by competitor, type, sentiment, date range
- Export to CSV

**Competitive Intelligence Insights**:
- "Gatorade mentioned by 8 competitors - high competitive pressure"
- "Pedialyte mentioned only in partnership context - potential collaboration opportunity"
- "New competitor 'Hydrant' mentioned 3 times this week - emerging threat"

### 7.3 Context Quality

**Word Boundary Detection**:
- Don't cut mid-word
- If context starts/ends mid-word, extend to nearest space
- Max extension: 20 characters

**Ellipsis Addition**:
- Add "..." at start if context doesn't begin at start of document
- Add "..." at end if context doesn't end at end of document

**HTML Stripping**:
- Remove HTML tags from context
- Preserve text content only
- Convert entities (&amp; → &)

**Whitespace Normalization**:
- Collapse multiple spaces to single space
- Remove excessive newlines (max 1 in context)

---

## 8. Intelligent Analysis System

### 8.1 Overview

Multi-layered AI analysis system combining rule-based detection with LLM intelligence.

### 8.2 Analysis Flow

**Step 1: Basic Detection**
- Hash comparison detects content changed
- Calculate magnitude: percentage of content different
- Extract keywords matched (from profile.domainKeywords)
- Determine page type (from URL)
- Apply page weight multiplier

**Step 2: Rule-Based Scoring**
- Start with base relevance score (5)
- Add points for high-priority keywords (+2 each)
- Add points for medium-priority keywords (+1 each)
- Subtract points for low-priority keywords (-1 each)
- Multiply by page weight
- Clamp to 0-10 range

**Step 3: Categorization**
- Check each category's indicators and patterns
- Score category likelihood based on keyword matches, patterns, magnitude
- Select highest-scoring category
- If no strong match, default to "content_update"

**Step 4: LLM Analysis** (if enabled)
- Send to Claude:
  - Company name
  - URL and page type
  - Old content excerpt (first 2000 chars)
  - New content excerpt (first 2000 chars)
  - Profile domain and keywords for context
  - Analysis prompt template
- Claude returns:
  - Relevance score (1-10)
  - Category classification
  - Summary (2-3 sentences)
  - Key changes (bullet list)
  - Strategic insights
  - Recommendations
  - Sentiment
  - Urgency level

**Step 5: KWIC Extraction**
- For each matched keyword, extract context
- Rank by relevance
- Keep top 5

**Step 6: Competitor Mentions**
- Search for competitor names from profile
- Extract contexts
- Classify mention type
- Analyze sentiment

**Step 7: Audience Detection**
- For each audience in profile:
  - Count keyword matches
  - Check channel mentions
  - Calculate confidence score
  - If >70% confident, record detection
- Get LLM reasoning for top detected audiences

**Step 8: Final Scoring**
- Combine rule-based and LLM scores (if available)
- Use LLM score as primary if confidence high
- Map final score to importance band from profile
- Record band label, color, icon

### 8.3 LLM Integration

**Providers Supported**:
- Anthropic Claude (Sonnet 3.5 recommended)
- Groq (Llama 3.3 70B for faster, cheaper baseline)

**Model Selection Strategy**:
- Use Groq for initial triage (fast, cheap)
- Use Claude for high-priority changes (better quality)
- Configurable in profile.aiAnalysis

**Prompt Engineering**:
- Domain-specific prompts in `profiles/templates/`
- Placeholders replaced at runtime:
  - `{{company}}` → Company name
  - `{{domain}}` → Profile domain
  - `{{keywords}}` → Comma-separated keywords from profile
  - `{{importanceBands}}` → JSON of bands for context
- Generic template provided, but users encouraged to customize

### 8.4 Smart Categorization

**8 Change Categories**:

1. **product_launch** (priority 10)
   - Indicators: launch, announce, introducing, unveil, release, new product
   - Patterns: "introducing \w+", "proud to announce", "now available"
   - Magnitude threshold: 20% (usually major content addition)

2. **pricing_change** (priority 9)
   - Indicators: price, pricing, cost, subscription, tier, plan
   - Patterns: "$\d+", "per month", "pricing update"
   - Magnitude threshold: 10%

3. **feature_update** (priority 8)
   - Indicators: feature, capability, improvement, enhance, upgrade
   - Patterns: "new features?", "improved \w+", "\d+x faster"
   - Magnitude threshold: 15%

4. **partnership** (priority 7)
   - Indicators: partner, partnership, collaboration, integrate, alliance
   - Patterns: "partnership with", "integrated with", "powered by"
   - Magnitude threshold: 10%

5. **strategic_shift** (priority 8)
   - Indicators: vision, mission, strategy, direction, pivot, transform
   - Patterns: "new (vision|mission|strategy)", "strategic \w+"
   - Magnitude threshold: 30% (major rewrite)

6. **technical_update** (priority 6)
   - Indicators: API, SDK, library, technology, architecture
   - Patterns: "API v?\d+", "SDK release"
   - Magnitude threshold: 10%

7. **content_update** (priority 4)
   - Indicators: blog, article, post, update, news
   - Patterns: "blog post", "article about"
   - Magnitude threshold: 5%

8. **minor_update** (priority 2)
   - Indicators: fix, typo, correction, minor
   - Patterns: "minor \w+", "bug fix"
   - Magnitude threshold: 5%

**Scoring Logic**:
- For each category, calculate score = 0
- +2 points for each indicator keyword matched
- +1 point for each pattern matched
- +3 points if magnitude exceeds threshold
- Multiply by category priority / 10
- Select category with highest score
- Minimum score of 5 required, else default to "content_update"

### 8.5 Pattern Detection

**Purpose**: Identify trends across multiple changes

**Patterns Detected**:
1. **Category Clustering**: "5 competitors launched products this week"
2. **Audience Trends**: "Athletes segment targeted by 7 competitors"
3. **Technology Adoption**: "3 companies added AI chatbots"
4. **Competitive Pressure**: "Company X mentioned by 6 competitors"
5. **Seasonal Patterns**: "Product launches increased 40% in Q4"

**Data Aggregation**:
- Group changes by category, company, audience, technology
- Count occurrences
- Compare to historical baseline
- Flag significant deviations

**Insight Generation**:
- If ≥3 companies in same category within 7 days → "Industry trend"
- If company mentioned ≥5 times → "High competitive attention"
- If specific audience targeted by ≥4 companies → "Market segment heating up"

**Display**:
- "Trends This Week" widget on dashboard
- Included in weekly summary email
- Detailed trends page with charts

---

## 9. NAICS Market Sizing Integration

### 9.1 Overview

Integrate **free** US Census Bureau data to provide market context and sizing information. This is NEW functionality not in the original system.

### 9.2 NAICS Background

**What is NAICS**: North American Industry Classification System - 6-digit codes for industries

**Example Codes**:
- 312111 - Soft Drink Manufacturing
- 312112 - Bottled Water Manufacturing
- 311930 - Flavoring Syrup and Concentrate Manufacturing
- 511210 - Software Publishers
- 518210 - Data Processing, Hosting, and Related Services

**Why Use NAICS**:
- Standard classification used by US government
- Free data available from Census Bureau
- Updated regularly
- Comprehensive coverage of all industries

### 9.3 Data Sources (All Free)

**County Business Patterns (CBP)**:
- Annual data on establishments, employment, payroll by industry
- Published ~18 months after year-end
- Available at national, state, county, metro levels
- URL: `https://api.census.gov/data/{year}/cbp`

**Economic Census**:
- Every 5 years (years ending in 2 and 7)
- Detailed industry statistics including revenue, expenses
- Most recent: 2022 (data available 2024)
- URL: `https://api.census.gov/data/{year}/ecnbasic`

**BLS QCEW** (Quarterly Census of Employment and Wages):
- Quarterly data, more recent than CBP
- Employment and wage data by industry
- URL: BLS API (not Census, but also free)

### 9.4 Data Integration

**Profile Configuration**:
- primary: "312112" (6-digit NAICS code)
- secondary: ["311930", "454110"]
- trackCompetitorCount: true
- trackMarketSize: true
- trackGrowthRate: true

**Automatic Data Sync**:
- Monthly GitHub Actions workflow
- Fetches latest data from Census Bureau API for profile's NAICS codes
- Stores in PostgreSQL naics_data table
- No manual updates needed

**Data Retrieved**:
- Establishments count (number of businesses in this industry)
- Employment count (total employees across all establishments)
- Annual payroll (total compensation)
- Data year (which year this data represents)

**Calculations**:
- **Market Coverage**: "Monitoring 8 of ~1,234 establishments (0.6%)"
- **Year-over-Year Growth**: Compare current year to previous year employment/establishments
- **Competitive Density**: Establishments per capita in US

### 9.5 Dashboard Display

**Market Size Widget** (Dashboard Tab 1):
```
┌─────────────────────────────────────────────────┐
│ Market Size (NAICS 312112)                      │
├─────────────────────────────────────────────────┤
│ Total Establishments:        1,234              │
│ Total Employment:            45,678             │
│ Annual Payroll:              $2.1B              │
│ Monitoring Coverage:         8 / 1,234 (0.6%)  │
│ YoY Employment Growth:       +3.2%              │
│ Data Year:                   2023               │
└─────────────────────────────────────────────────┘
```

**Competitive Context**:
- Show how many total competitors exist (establishments)
- Show what percentage we're monitoring
- Highlight if we're missing major players

**Email Inclusion**:
- Footer of daily digest: "Market Size (NAICS 312112): 1,234 establishments, 45,678 employees"
- Weekly summary: Expanded market stats with growth trends

**Trend Tracking**:
- Store historical NAICS data
- Chart growth over time
- Compare competitor activity to market growth

### 9.6 NAICS Browser (Setup Wizard Feature)

**Purpose**: Help users find correct NAICS code for their domain

**Features**:
- Keyword search (e.g., "hydration" returns relevant codes)
- Hierarchical browse (drill down from 2-digit to 6-digit)
- Preview market size data before selection
- "Similar industries" suggestions
- Save primary + multiple secondary codes

---

## 10. Audience Segmentation Tracking

### 10.1 Overview

Track which customer segments competitors are targeting based on content analysis. This is NEW functionality not in the original system.

### 10.2 Audience Definition

**Profile Configuration**:
Each audience segment includes:
- **id**: Unique identifier (e.g., "athletes-fitness")
- **name**: Display name (e.g., "Athletes and Fitness Enthusiasts")
- **description**: Who this audience is
- **keywords[]**: Keywords indicating targeting (e.g., "performance", "recovery", "training")
- **channels[]**: Marketing channels for this audience (e.g., "gym partnerships", "sports sponsorships")
- **priority**: 1-10 importance to track
- **businessValue**: high/medium/low strategic value
- **color**: Hex color for visualization

**Example Audiences for Different Domains**:

**Hydration Drinks**:
1. Athletes and Fitness Enthusiasts
2. Health-Conscious Consumers
3. Busy Professionals
4. Parents
5. Travelers
6. College Students

**SaaS Companies**:
1. Enterprise IT Teams
2. Small Business Owners
3. Developers
4. Marketing Teams
5. Sales Organizations

**Automobiles**:
1. Families
2. Luxury Buyers
3. Eco-Conscious Consumers
4. Young Professionals
5. Commercial/Fleet Buyers

### 10.3 Detection Logic

**For Each Detected Change**:
1. For each audience in profile:
   - Count keyword matches in new content
   - Count channel mentions in new content
   - Calculate base confidence: (matched keywords / total keywords) × 100
   - Add channel boost: +10% for each channel mentioned
   - Clamp confidence to 0-100%
2. If confidence ≥ 70% (configurable threshold):
   - Record audience detection
   - Get LLM reasoning (why does this content target this audience?)
   - Store detection with confidence score

**LLM Enhancement**:
Send to Claude:
"Does this webpage content target [Audience Name]? Explain in 1-2 sentences why or why not."

Response stored as "reasoning" in detection record.

### 10.4 Dashboard Display

**Audience Filter** (Extracted Data Tab):
- Dropdown with all audiences from profile
- Shows count of changes targeting each audience
- Select audience → filters to only those changes

**Audience Tags**:
- On each change card/row
- Color-coded badges
- Show confidence % on hover
- Example: "Athletes (87%) Health-Conscious (72%)"

**Audience Panel Widget**:
```
┌──────────────────────────────────────────────┐
│ Audience Targeting This Week                 │
├──────────────────────────────────────────────┤
│ Athletes & Fitness:      8 companies (67%)   │
│ ████████████████                             │
│                                              │
│ Health-Conscious:        6 companies (50%)   │
│ ████████████                                 │
│                                              │
│ Busy Professionals:      4 companies (33%)   │
│ ████████                                     │
└──────────────────────────────────────────────┘
```

**Audience Trends**:
- "Athletes segment increasingly targeted - 5 competitors added athlete-focused content this month"
- "Parents segment underserved - opportunity for differentiation"

### 10.5 Competitive Intelligence Insights

**Audience Gap Analysis**:
- Show which audiences are heavily targeted vs underserved
- Identify opportunities: "Only 2 competitors target Parents segment"

**Audience Overlap**:
- Which competitors target the same audiences?
- Potential for market crowding vs diversification

**Messaging Analysis**:
- What keywords/themes are used for each audience?
- "Athletes: Emphasis on 'performance' and 'recovery'"
- "Parents: Emphasis on 'safe' and 'pediatrician recommended'"

**Channel Strategy**:
- Which channels are competitors using for each audience?
- "Athletes: 7 companies sponsor marathons, 5 have gym partnerships"

---

## 11. Database Architecture

### 11.1 PostgreSQL Schema

**Key Design Principles**:
- Single instance per domain (no profile_id columns)
- Normalized structure
- JSON columns for flexible data (AI analysis, mentions)
- Indexes on frequently queried fields
- Timestamps on all tables

### 11.2 Core Tables

**companies**
- id (UUID, primary key)
- name (VARCHAR 255)
- category (VARCHAR 100)
- description (TEXT)
- keywords (TEXT[])
- color (VARCHAR 7)
- technologies (TEXT[])
- products (TEXT[])
- interest_level (INTEGER 1-10)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

**urls**
- id (UUID, primary key)
- company_id (UUID, foreign key)
- url (TEXT)
- url_type (VARCHAR 50)
- weight (DECIMAL 3,2)
- check_frequency (VARCHAR 20)
- css_selector (TEXT)
- enabled (BOOLEAN)
- created_at (TIMESTAMPTZ)

**scraped_pages**
- id (UUID, primary key)
- url_id (UUID, foreign key)
- content_hash (VARCHAR 64)
- content (TEXT)
- content_length (INTEGER)
- title (TEXT)
- meta_description (TEXT)
- scraped_at (TIMESTAMPTZ)
- http_status (INTEGER)

**change_detection**
- id (UUID, primary key)
- url_id (UUID, foreign key)
- company_id (UUID, foreign key)
- detected_at (TIMESTAMPTZ)
- previous_hash (VARCHAR 64)
- current_hash (VARCHAR 64)
- change_type (VARCHAR 50)
- magnitude_percent (INTEGER)
- importance_score (INTEGER 0-10)
- importance_band (VARCHAR 50)
- category (VARCHAR 50)
- matched_keywords (TEXT[])
- ai_summary (TEXT)
- ai_key_changes (JSONB)
- ai_insights (JSONB)
- ai_recommendations (JSONB)
- sentiment (VARCHAR 20)
- urgency (VARCHAR 20)
- processed (BOOLEAN)
- created_at (TIMESTAMPTZ)

**kwic_snippets**
- id (UUID, primary key)
- change_id (UUID, foreign key)
- keyword (VARCHAR 255)
- before_text (TEXT)
- after_text (TEXT)
- position (INTEGER)
- relevance_score (INTEGER 1-10)
- created_at (TIMESTAMPTZ)

**competitor_mentions**
- id (UUID, primary key)
- change_id (UUID, foreign key)
- mentioning_company_id (UUID, foreign key)
- mentioned_competitor (VARCHAR 255)
- mention_count (INTEGER)
- context_snippets (JSONB)
- mention_type (VARCHAR 50)
- sentiment (VARCHAR 20)
- detected_at (TIMESTAMPTZ)

**audience_detections**
- id (UUID, primary key)
- change_id (UUID, foreign key)
- audience_id (VARCHAR 50)
- audience_name (VARCHAR 255)
- confidence_score (DECIMAL 5,2)
- matched_keywords (TEXT[])
- matched_channels (TEXT[])
- reasoning (TEXT)
- detected_at (TIMESTAMPTZ)

**naics_data**
- code (VARCHAR 6, primary key)
- title (VARCHAR 255)
- establishments (INTEGER)
- employment (INTEGER)
- annual_payroll (BIGINT)
- data_year (INTEGER)
- synced_at (TIMESTAMPTZ)

**email_log**
- id (UUID, primary key)
- sent_at (TIMESTAMPTZ)
- email_type (VARCHAR 50)
- recipient_email (VARCHAR 255)
- changes_included (INTEGER)
- status (VARCHAR 20)
- error_message (TEXT)

### 11.3 Data Retention

**Scraped Content**: Keep 30 days of history per URL
**Changes**: Keep indefinitely (or configurable, e.g., 1 year)
**KWIC Snippets**: Keep with associated change
**Mentions**: Keep indefinitely
**Audience Detections**: Keep indefinitely
**Email Logs**: Keep 90 days

**Cleanup Job**: Monthly cron deletes old scraped_pages records

---

## 12. GitHub Actions Workflows

### 12.1 Scrape Workflow

**File**: `.github/workflows/scrape-postgres.yml`

**Trigger**:
- Schedule: Every 6 hours (configurable in profile)
- Manual dispatch: Button in dashboard

**Steps**:
1. Load profile from `profiles/active-profile.json`
2. Validate profile against schema
3. For each company and URL (if enabled and due for check):
   - Fetch URL with timeout and retries
   - Extract content using CSS selector
   - Calculate SHA-256 hash
   - Compare to previous hash
   - If different: Store new content and create change record
4. Trigger analyze workflow if changes detected

**Environment Variables**:
- `DATABASE_URL`
- `USER_AGENT`

### 12.2 Analyze Workflow

**File**: `.github/workflows/analyze-postgres.yml`

**Trigger**:
- After scrape workflow with changes
- Manual dispatch

**Steps**:
1. For each unprocessed change:
   - Perform rule-based scoring
   - Categorize using profile categories
   - Extract KWIC snippets
   - Detect competitor mentions
   - Call LLM if enabled
   - Detect audience targeting
   - Map to importance band
   - Mark as processed

**Environment Variables**:
- `DATABASE_URL`
- `CLAUDE_API_KEY` or `GROQ_API_KEY`

### 12.3 Deploy Workflow

**File**: `.github/workflows/sync-deploy-postgres.yml`

**Trigger**:
- After analyze workflow
- Push to main
- Manual dispatch

**Steps**:
1. Query database for latest data
2. Generate JSON files for GitHub Pages
3. Generate force graph data
4. Deploy to gh-pages branch

### 12.4 Daily Digest Workflow

**File**: `.github/workflows/daily-digest-postgres.yml`

**Trigger**:
- After analyze workflow
- Scheduled time from profile
- Manual dispatch

**Steps**:
1. Load profile
2. Query changes in last 24 hours
3. Filter by importance/category
4. Generate HTML email
5. Send via SMTP
6. Log delivery status

**Environment Variables**:
- `DATABASE_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### 12.5 NAICS Sync Workflow

**File**: `.github/workflows/naics-data-sync.yml`

**Trigger**:
- Monthly on 1st
- Manual dispatch

**Steps**:
1. Load profile NAICS codes
2. Call Census Bureau API for each code
3. Upsert into naics_data table

**Environment Variables**:
- `DATABASE_URL`

---

## 13. User Interfaces

### 13.1 Interface Principles

- **No-code configuration**: Non-technical users never edit JSON
- **Immediate validation**: Form validation before saving
- **Preview before commit**: Show what will change
- **Undo capability**: Revert changes
- **Mobile-friendly**: Responsive design

### 13.2 Setup Wizard Features

**8-Step Wizard**:
1. Domain Selection (with templates)
2. Add Competitors
3. Define Importance Bands
4. Keywords
5. Audiences (optional)
6. NAICS (optional)
7. Notifications
8. Review & Save

**Key Features**:
- Progress indicator
- "Save & Continue Later"
- Auto-save to localStorage
- Template selection
- AI-assisted suggestions
- Validation at each step
- "Test Configuration" button
- "Commit & Deploy" button

### 13.3 Profile Editor Features

**Inline Editing**:
- Click field → editable
- Save/Cancel buttons
- Validation on blur
- Immediate save to JSON

**Bulk Operations**:
- Multi-select for bulk edit
- Import URLs from CSV

**Version Control**:
- View change history (git log)
- Revert to previous version
- Diff view

**Export/Import**:
- Export as JSON
- Import from JSON with validation

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- Repository setup
- Profile system
- Basic scraping
- Basic dashboard

### Phase 2: Intelligence & Analysis (Weeks 4-5)
- LLM integration
- KWIC extraction
- Competitor mentions
- Smart categorization
- Importance bands

### Phase 3: Email & NAICS (Week 6)
- Email templates
- Email workflow
- NAICS integration

### Phase 4: Audience & 3D Graph (Weeks 7-8)
- Audience segmentation
- 3D force graph (5 view modes)
- Advanced dashboard

### Phase 5: UI Tools & Polish (Weeks 9-10)
- Setup wizard
- Profile editor
- Management interface
- Testing & documentation

---

## 15. Testing Strategy

### 15.1 Test Types

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: End-to-end workflows
- **UI Tests**: Playwright/Cypress
- **Load Tests**: 200 URLs, 1000 changes, 5000 dashboard items

### 15.2 Success Metrics

**Performance**:
- Scrape 200 URLs in <10 min
- Analysis <5 sec per change
- Dashboard load <3 sec
- Graph render <5 sec

**Quality**:
- Test coverage >80%
- Zero critical bugs
- Documentation complete

---

## 16. User Stories

### Randy - System Configurator
1. Create new instance in <5 minutes
2. Non-technical configuration via UI
3. Custom importance bands
4. NAICS configuration
5. Testing before live

### Sarah - Competitive Analyst
1. Priority filtering (9-10 first)
2. Audience insights
3. Context understanding (KWIC)
4. Market context (NAICS)
5. Daily digest emails
6. Export to CSV

### Michael - CMO
1. Weekly executive summary
2. Audience strategy view
3. Market opportunity sizing
4. Competitive positioning

### Jennifer - Product Marketing Director
1. Targeted filtering
2. Audience overlap analysis

---

## 17. Success Criteria

### Functional
- ✅ Create instance <5 min
- ✅ Configure without code
- ✅ Detect >90% of changes
- ✅ Scoring accuracy >80%
- ✅ Audience confidence >70%
- ✅ NAICS auto-sync monthly
- ✅ Dashboard <3 sec
- ✅ Emails reliable

### Usability
- ✅ Non-technical users succeed
- ✅ Intuitive interfaces
- ✅ Complete documentation
- ✅ Clear error messages

### Performance
- ✅ 200 URLs <10 min
- ✅ Analysis <5 sec/change
- ✅ 1000+ changes no lag
- ✅ Queries <100ms

### Reliability
- ✅ Workflows >99% success
- ✅ Email delivery >98%
- ✅ Graceful error handling
- ✅ No data loss

---

## Conclusion

This specification transforms the AI Competitor Monitor into a domain-agnostic template repository while preserving ALL sophisticated features including 3D force graph visualization, comprehensive email system, KWIC tracking, competitor mentions, multi-tab dashboard with advanced filtering, and intelligent analysis.

New capabilities add NAICS market sizing, audience segmentation tracking, and human-editable configuration interfaces.

The separate-instance-per-domain architecture keeps the system simple while leveraging GitHub's native isolation and access control.

**Ready for Review**: Please review this specification and provide feedback before implementation begins.
