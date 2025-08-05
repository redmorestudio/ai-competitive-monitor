# Entity Management UI - Backend Connection Guide

## Current Status
- ✅ UI exists at /manage-entities.html
- ✅ Backend entity grouping implemented
- ❌ UI not yet connected to backend

## To Connect the UI

### 1. Create API Endpoints in server.js
```javascript
// GET /api/entity-groups
app.get('/api/entity-groups', async (req, res) => {
    const groups = await db.all(`
        SELECT eg.*, COUNT(ev.id) as variation_count
        FROM intelligence.entity_groups eg
        LEFT JOIN intelligence.entity_variations ev ON eg.id = ev.group_id
        GROUP BY eg.id
    `);
    res.json(groups);
});

// POST /api/entity-groups/:groupId/variations
app.post('/api/entity-groups/:groupId/variations', async (req, res) => {
    const { variation } = req.body;
    // Add variation to group
});
```

### 2. Update manage-entities.html JavaScript
Replace the mock data loading with:
```javascript
async function loadGroups() {
    const response = await fetch('/api/entity-groups');
    const groups = await response.json();
    // Render groups
}
```

### 3. Alternative: Use Existing Scripts
The automated grouping is already working:
- `node apply-entity-groupings.js` - Creates groups from rules
- `node update-entity-group-types.js` - Assigns types
- `node generate-entity-contexts-grouped.js` - Generates contexts

## Database Schema Available
- `intelligence.entity_groups` - Canonical entities
- `intelligence.entity_variations` - All variations
- `intelligence.entity_relationships` - Hierarchies
