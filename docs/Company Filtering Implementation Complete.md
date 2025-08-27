---
title: Company Filtering Implementation Complete
type: note
permalink: project-documentation/ai-competitive-monitor/company-filtering-implementation-complete
---

# Company Filtering Implementation Complete

**Date**: August 5, 2025  
**Status**: READY TO DEPLOY

## What Was Done

Successfully implemented company extraction filtering to reduce the number from 378 to 144 companies.

### 1. Modified AI Extraction Prompt
**File**: `ai-analyzer-baseline-enhanced-postgres.js`
- Changed from "Extract ALL mentioned" to "Extract only the most significant companies"
- Added limit of 15 companies per page maximum
- Specified to exclude companies only mentioned in passing

### 2. Created Filtering Analysis Tool
**File**: `filter-company-extractions.js`
- Analyzes all company extractions from database
- Identifies suspicious pages (20+ companies extracted)
- Filters to companies mentioned 2+ times
- Always includes our 49 monitored companies

### 3. Created Filtering Wrapper
**File**: `generate-static-data-with-filtering.js`
- Runs filtering analysis first
- Saves filtered companies list
- Passes filtered list to static data generator

### 4. Updated Static Data Generator
**File**: `generate-static-data-three-db-postgres-with-contexts.js`
- Checks for filtered companies list
- Only includes companies in the filtered list
- Reduces graph complexity significantly

## Results

### Before Filtering
- **378** unique companies extracted
- Many pages with 20-40+ companies
- Dashboard performance issues
- Graph too complex to navigate

### After Filtering
- **144** companies total
  - 119 companies with 2+ mentions
  - 49 monitored companies always included
- **259** single-mention companies removed (69% reduction)
- **29** suspicious pages identified

### Top Extracted Companies
1. Microsoft (44 mentions)
2. Google (42 mentions)  
3. OpenAI (19 mentions)
4. Twitter (19 mentions)
5. AWS (16 mentions)
6. GitHub (15 mentions)
7. NVIDIA (15 mentions)
8. Anthropic (11 mentions)

## Deployment Instructions

### Option 1: Update Workflow (Recommended)
In `.github/workflows/sync-deploy-postgres.yml`, replace:
```bash
node generate-static-data-three-db-postgres-with-contexts.js
```
With:
```bash
node generate-static-data-with-filtering.js
```

### Option 2: Run Manually First
```bash
cd github-actions-backend
node filter-company-extractions.js  # Analyze current state
node generate-static-data-with-filtering.js  # Generate with filtering
```

## Configuration

Thresholds can be adjusted in `filter-company-extractions.js`:
- `MIN_MENTIONS_THRESHOLD = 2` - Minimum times a company must appear
- `MAX_COMPANIES_PER_PAGE = 15` - Pages with more are suspicious

## Next Steps

1. Deploy to production via GitHub Actions
2. Monitor dashboard performance improvement
3. Review suspicious pages to understand why so many companies were extracted
4. Consider further prompt refinement if needed
5. Add entity grouping for other entity types (technologies, products)