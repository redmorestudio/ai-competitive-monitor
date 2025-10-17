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

