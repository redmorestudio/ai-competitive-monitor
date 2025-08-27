---
title: AI Monitor Company Extraction Issue - Too Many Companies Extracted
type: note
permalink: project-documentation/ai-competitive-monitor/ai-monitor-company-extraction-issue-too-many-companies-extracted
---

# AI Monitor Company Extraction Issue - Too Many Companies Being Extracted

**Date**: August 5, 2025
**Issue**: The system is extracting hundreds of companies instead of just monitored ones
**Location**: `ai-analyzer-baseline-enhanced-postgres.js`
**Severity**: High - causing dashboard performance issues and confusion

## Problem Description

The enhanced baseline analyzer is extracting ALL companies mentioned in content, including:
- Partners
- Competitors  
- Customers
- Investors
- Acquisitions
- Technology providers

This results in hundreds of non-monitored companies being added to the system.

## Root Cause

In `ai-analyzer-baseline-enhanced-postgres.js`, the `DYNAMIC_EXTRACTION_PROMPT` includes:

```javascript
**COMPANIES** - Extract ALL mentioned:
- The company being analyzed
- Partners, competitors, customers
- Investors, acquisitions
- Technology providers
```

This causes the AI to extract every company name it finds, not just the ones we're monitoring.

## Proposed Solution

1. **Filter extracted companies** - Only include companies that appear 2+ times across all pages
2. **Add per-page limit** - If a page yields 20+ companies, flag it as suspicious and exclude those companies
3. **Separate monitored vs mentioned** - Track which companies are monitored vs just mentioned
4. **Update the extraction prompt** - Be more selective about which companies to extract

## Implementation Steps

1. Modify `ai-analyzer-baseline-enhanced-postgres.js`:
   - Change prompt to only extract significant company relationships
   - Add "is_monitored" flag to distinguish our tracked companies

2. Add post-processing filter in `generate-static-data-three-db-postgres-with-contexts.js`:
   - Count company occurrences across all pages
   - Only include companies with 2+ mentions
   - Flag and exclude pages with 20+ companies

3. Update database schema:
   - Add `mention_count` field to track occurrences
   - Add `extraction_source` to identify where entities came from
   - Add `is_suspicious` flag for pages with too many entities

## Code Changes Needed

### 1. Update the extraction prompt
```javascript
// Change from "Extract ALL mentioned" to:
**COMPANIES** - Extract only significant mentions:
- The company being analyzed (primary)
- Major partnerships or acquisitions (if central to content)
- Direct competitors discussed in detail (not just listed)
- Limit to 10-15 most relevant companies per page
```

### 2. Add filtering logic
```javascript
// In generate-static-data-three-db-postgres-with-contexts.js
async function filterExtractedCompanies(entities) {
  const companyCounts = {};
  const suspiciousPages = [];
  
  // Count occurrences
  for (const [page, pageEntities] of Object.entries(entities)) {
    if (pageEntities.companies?.length > 20) {
      suspiciousPages.push(page);
      console.warn(`Suspicious: ${page} has ${pageEntities.companies.length} companies`);
      continue;
    }
    
    for (const company of pageEntities.companies || []) {
      companyCounts[company] = (companyCounts[company] || 0) + 1;
    }
  }
  
  // Filter to 2+ mentions
  const validCompanies = Object.entries(companyCounts)
    .filter(([name, count]) => count >= 2)
    .map(([name]) => name);
    
  return {
    companies: validCompanies,
    suspicious: suspiciousPages
  };
}
```

### 3. Track monitored vs mentioned
```javascript
// Maintain list of our 52 monitored companies
const MONITORED_COMPANIES = new Set([
  'OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Meta',
  // ... rest of the 52 companies
]);

// Tag companies appropriately
function categorizeCompany(name) {
  return {
    name,
    is_monitored: MONITORED_COMPANIES.has(name),
    source: 'extraction'
  };
}
```

## Expected Outcome

After implementing these changes:
- Company count should drop from hundreds to ~50-100
- Dashboard performance will improve
- Only relevant companies will appear in the graph
- Suspicious extractions will be logged for review

## Testing Plan

1. Run extraction on a few sample pages
2. Verify company counts are reasonable (< 20 per page)
3. Check that 2+ mention filter works correctly
4. Confirm monitored companies are properly tagged
5. Test dashboard performance with reduced dataset