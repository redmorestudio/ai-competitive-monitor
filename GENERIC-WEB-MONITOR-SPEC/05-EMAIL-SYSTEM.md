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

