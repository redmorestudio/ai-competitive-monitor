---
title: AI Monitor Complete Recovery Plan
type: note
permalink: project-documentation/ai-competitive-monitor/ai-monitor-complete-recovery-plan
---

# AI Monitor Complete Recovery Plan

**Date**: August 5, 2025  
**Severity**: 🔴 CRITICAL - Multiple System Failures  
**Estimated Recovery Time**: 2-3 hours total

## Current State Assessment

### What's Broken
1. **Company Display**: Only 10 of 54 companies showing (frontend bug)
2. **Entity Contexts**: 0% functional - no KWIC working
3. **Data Quality**: Inconsistent - some companies have data, most don't
4. **Entity Extraction**: Incomplete for many companies
5. **Markdown Conversion**: Partial or missing for many pages

### What's Working
- PostgreSQL database connection ✅
- Basic dashboard loading ✅
- Some companies have entity data ✅
- Workflow infrastructure operational ✅

---

## PHASE 1: Immediate Actions (15 minutes)

### Step 1.1: Trigger Full Pipeline
```bash
# From GitHub Actions page or CLI:
gh workflow run full-monitor-postgres.yml

# This will run:
# 1. Scrape (15-20 min)
# 2. Process/Markdown (10-15 min)
# 3. Analyze/Entities (5-10 min)
# 4. Sync/Context/Deploy (5-10 min)
# Total: ~40-50 minutes
```

### Step 1.2: Monitor Pipeline Start
- Go to: https://github.com/redmorestudio/ai-competitive-monitor/actions
- Verify "Full Monitor Pipeline (PostgreSQL)" is running
- Check each stage initiates properly
- Note any immediate failures

### Step 1.3: Document Pipeline Run ID
- Record the workflow run ID for tracking
- Set timer for 45 minutes
- Prepare to monitor each stage

---

## PHASE 2: Fix Frontend Display Limit (30 minutes)

### Step 2.1: Locate the Bug
The dashboard is showing only 10 companies. Check:

**File**: `index.html` or `js/modules/dashboard.js`
```javascript
// Look for:
.slice(0, 10)  // Remove or increase limit
// OR
for (let i = 0; i < 10; i++)  // Change to companies.length
// OR
limit: 10  // Remove or increase
```

### Step 2.2: Apply Fix
```javascript
// Change from:
const displayCompanies = companies.slice(0, 10);

// To:
const displayCompanies = companies;  // Show all

// OR implement pagination:
const PAGE_SIZE = 20;
const displayCompanies = companies.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
```

### Step 2.3: Test Locally
```bash
# Test the fix locally first
cd /Users/sethredmore/ai-competitive-monitor
python3 -m http.server 8000
# Browse to localhost:8000
# Verify all 54 companies display
```

### Step 2.4: Commit Frontend Fix
```bash
git add index.html  # or whatever file was changed
git commit -m "Fix: Remove 10-company display limit in dashboard"
git push origin main
```

---

## PHASE 3: Monitor Pipeline Execution (45 minutes)

### Step 3.1: Scraping Stage (0-20 min)
Monitor for:
- ✅ All 200+ URLs attempted
- ⚠️ Captcha blocks (expected: 10-20%)
- ❌ Complete failures (should be <5%)

Expected output:
```
Processed 50/54 companies...
Success: 180/210 URLs
Blocked: 25 URLs
Failed: 5 URLs
```

### Step 3.2: Processing Stage (20-30 min)
Monitor for:
- ✅ Markdown conversion running
- ✅ "Converting HTML to markdown..."
- ✅ Change detection working

Critical check:
```
Converted 156 baseline pages to markdown
Processed 180 scraped pages
```

### Step 3.3: Analysis Stage (30-40 min)
Monitor for:
- ✅ Entity extraction for each company
- ✅ "Analyzing company: [name]"
- ⚠️ Any Groq API errors

Should see:
```
Analyzing [1/54] OpenAI...
  Entities extracted: companies: 15, products: 8, technologies: 12
```

### Step 3.4: Sync Stage (40-50 min)
**CRITICAL - NEW CONTEXT GENERATION**
Monitor for:
- ✅ "Generating entity contexts for KWIC feature..."
- ✅ "Running markdown converter..."
- ✅ "Generating contexts for grouped entities..."
- ✅ "Context files generated successfully"

Must see:
```
✅ Context files generated:
-rw-r--r-- 5.2M contexts-companies.json
-rw-r--r-- 3.1M contexts-technologies.json
-rw-r--r-- 2.8M contexts-products.json
```

---

## PHASE 4: Verification (15 minutes)

### Step 4.1: Check Data Files
```bash
# Verify all JSON files updated
curl -s https://redmorestudio.github.io/ai-competitive-monitor/api-data/dashboard.json | jq '.companies | length'
# Should show 54+

curl -s https://redmorestudio.github.io/ai-competitive-monitor/api-data/contexts-companies.json | wc -c
# Should be > 1,000,000 bytes (1MB+)
```

### Step 4.2: Test Dashboard
1. Go to: https://redmorestudio.github.io/ai-competitive-monitor/
2. Verify:
   - [ ] Shows 50+ companies (not just 10)
   - [ ] Each company has entity data
   - [ ] Recent changes display correctly

### Step 4.3: Test KWIC Feature
1. Click "Entity Intelligence"
2. Click any entity (e.g., "OpenAI", "transformer", "ChatGPT")
3. Verify:
   - [ ] Context modal opens
   - [ ] Shows actual text snippets
   - [ ] Multiple contexts displayed
   - [ ] Not showing "No contexts found"

### Step 4.4: Test Multiple Entities
Test at least 5 different entities:
- [ ] Company entity (e.g., "Microsoft")
- [ ] Technology entity (e.g., "transformer")
- [ ] Product entity (e.g., "ChatGPT")
- [ ] Concept entity (e.g., "machine learning")
- [ ] Random entity from list

---

## PHASE 5: Fallback Plans

### If Pipeline Fails at Scraping
```bash
# Run just scraping again
gh workflow run scrape-postgres.yml
```

### If Pipeline Fails at Processing
```bash
# Run process manually with cascade
gh workflow run process-postgres.yml -f cascade=true
```

### If Context Generation Fails
```bash
# Run sync alone
gh workflow run sync-deploy-postgres.yml
```

### If Frontend Fix Doesn't Work
Create emergency pagination:
```javascript
// Add to dashboard.js
const MAX_DISPLAY = 50;  // Temporary limit
const companies = data.companies.slice(0, MAX_DISPLAY);
```

---

## PHASE 6: Post-Recovery Validation

### Success Criteria
- [ ] 50+ companies displayed
- [ ] All entities have contexts (KWIC works)
- [ ] Dashboard loads in <3 seconds
- [ ] No console errors
- [ ] Changes show with proper dates
- [ ] Interest scores display correctly

### Performance Metrics
- Context files: 5-10MB total
- Companies with data: 95%+
- Entities with contexts: 100%
- Page load time: <3s
- API data size: <20MB total

---

## PHASE 7: Documentation & Prevention

### Document What Happened
1. Company filtering reduced entities (good)
2. But context generation was missing from workflow (bad)
3. Frontend had hardcoded limit (bad)
4. No monitoring for data completeness (bad)

### Implement Monitoring
Add to workflow:
```yaml
- name: Validate Data Completeness
  run: |
    COMPANY_COUNT=$(jq '.companies | length' api-data/dashboard.json)
    if [ $COMPANY_COUNT -lt 50 ]; then
      echo "❌ Only $COMPANY_COUNT companies - expected 50+"
      exit 1
    fi
```

### Add Health Checks
Create `health-check.json`:
```json
{
  "companies_expected": 54,
  "companies_found": 54,
  "contexts_size_mb": 8.5,
  "last_successful_run": "2025-08-05T19:00:00Z",
  "all_systems": "operational"
}
```

---

## Timeline Summary

1. **0:00-0:15** - Trigger pipeline, start frontend fix
2. **0:15-0:45** - Apply frontend fix, monitor pipeline
3. **0:45-1:30** - Pipeline completes, verify context generation
4. **1:30-1:45** - Test all features
5. **1:45-2:00** - Document and implement monitoring

## Critical Success Factors

1. **Pipeline completes without errors**
2. **Context generation produces 5MB+ files**
3. **Frontend shows all companies**
4. **KWIC works for all entities**

## Commands Reference

```bash
# Trigger full pipeline
gh workflow run full-monitor-postgres.yml

# Check workflow status
gh run list --workflow=full-monitor-postgres.yml

# Watch specific run
gh run watch [RUN_ID]

# View logs
gh run view [RUN_ID] --log

# Test locally
python3 -m http.server 8000

# Verify data
curl -s [URL] | jq '.' | head -20
```

---

## Emergency Contacts

If multiple failures:
1. Check GitHub Actions status
2. Verify PostgreSQL connection
3. Check Groq API limits
4. Review workflow logs in detail
5. Check GitHub Pages deployment status

## Final Notes

- **DO NOT** run production scripts locally
- **DO NOT** modify database directly
- **DO** monitor each stage carefully
- **DO** document any new issues found
- **DO** test thoroughly before declaring success

Recovery should be complete within 2-3 hours if all steps are followed.