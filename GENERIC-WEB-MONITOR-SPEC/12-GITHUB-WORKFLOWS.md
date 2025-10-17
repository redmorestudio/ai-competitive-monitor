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

