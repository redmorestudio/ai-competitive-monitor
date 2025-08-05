# GitHub Actions Workflow Update Summary

## File Updated
- .github/workflows/sync-deploy-postgres.yml

## Changes Made
1. Added "Apply entity groupings" step before static data generation
2. Step checks if entity groups already exist (avoids re-running)
3. Runs three entity grouping scripts in sequence:
   - apply-entity-groupings.js
   - handle-company-entities.js
   - update-entity-group-types.js
4. Generates entity-groups.json for dashboard
5. Updated static data generation to use grouped contexts

## Benefits
- Reduces entity processing from 3,260 to ~800
- Faster context generation
- Better dashboard and 3D graph performance
- Smart filtering for visualizations

## Next Steps
1. Commit and push workflow changes
2. Run workflow manually to test
3. Monitor for any issues
4. Verify entity-groups.json is created in api-data/
