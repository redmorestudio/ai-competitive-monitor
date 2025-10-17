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

