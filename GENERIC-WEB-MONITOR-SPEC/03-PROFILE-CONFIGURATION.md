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
