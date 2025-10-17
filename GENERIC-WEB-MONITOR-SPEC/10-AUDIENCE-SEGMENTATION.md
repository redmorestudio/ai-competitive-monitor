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

