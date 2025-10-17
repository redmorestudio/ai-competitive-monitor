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

