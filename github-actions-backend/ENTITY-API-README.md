# Entity Management API

This API provides endpoints for managing entity groups in the AI Competitive Monitor system.

## Overview

The entity management system allows you to:
- Group similar entities (e.g., "AI", "artificial intelligence", "a.i.") into canonical groups
- Reduce fragmentation in entity analysis
- Improve visualization performance
- Track entity relationships across companies

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database with the intelligence schema
- Environment variables configured

### Installation

```bash
cd github-actions-backend
npm install express cors pg dotenv
```

### Environment Variables

Create a `.env` file in the `github-actions-backend` directory:

```
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
```

### Running the Server

```bash
node entity-api-server.js
```

The server will run on port 3001 by default.

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and database connection info.

### Statistics

```
GET /api/entities/stats
```

Returns entity statistics:
- Total entities
- Grouped entities
- Ungrouped entities  
- Total groups

### Entity Groups

#### List All Groups
```
GET /api/entity-groups
Query params:
  - search: Filter by name or variation
  - type: Filter by group type
```

#### Get Specific Group
```
GET /api/entity-groups/:id
```

Returns group details including:
- Canonical name
- Type
- All variations
- Companies that mention it

#### Create New Group
```
POST /api/entity-groups
Body:
{
  "name": "Machine Learning",
  "type": "technology",
  "variations": ["ML", "machine-learning"],
  "is_monitored": false
}
```

#### Update Group
```
PUT /api/entity-groups/:id
Body:
{
  "name": "New Name",
  "type": "concept",
  "is_monitored": true
}
```

#### Delete Group
```
DELETE /api/entity-groups/:id
```

### Group Members

#### Add Entity to Group
```
POST /api/entity-groups/:id/members
Body:
{
  "entity_name": "artificial intelligence"
}
```

#### Remove Entity from Group
```
DELETE /api/entity-groups/:id/members/:entity
```

### Ungrouped Entities

```
GET /api/entities/ungrouped
Query params:
  - limit: Max results (default: 100)
  - offset: Pagination offset
```

Returns entities not yet assigned to any group.

### Auto-Grouping

```
POST /api/entities/auto-group
Body:
{
  "threshold": 0.8
}
```

Suggests potential groupings based on string similarity.

### Export

```
GET /api/entity-groups/export
```

Downloads all entity groups as JSON.

## Database Schema

The API works with these PostgreSQL tables in the `intelligence` schema:

### entity_groups
- id (primary key)
- canonical_name
- group_type (company, product, technology, concept, person)
- is_monitored
- created_at
- updated_at

### entity_group_members
- group_id (foreign key)
- entity_name
- UNIQUE constraint on LOWER(entity_name)

### baseline_analysis_entities
- Source of raw entity data
- Contains entity_name and entity_type

### baseline_analysis_entity_refs
- Links entities to their mentions in analyses
- Has entity_group_id field for grouped entities

## Frontend Integration

The `manage-entities.html` file provides a drag-and-drop UI for:
- Viewing entity groups
- Dragging ungrouped entities into groups
- Creating new groups
- Searching and filtering

## Production Deployment

1. Set DATABASE_URL to production PostgreSQL
2. Consider using PM2 or similar for process management
3. Add to GitHub Actions workflow if needed
4. Use nginx or similar for reverse proxy

## Security Notes

- Add authentication middleware for production
- Use HTTPS in production
- Validate all inputs
- Consider rate limiting
- Add CORS restrictions for production

## Performance Considerations

- Uses PostgreSQL connection pooling
- Indexes on entity names for fast lookups
- Pagination for large result sets
- Similarity search uses PostgreSQL's built-in functions

## Future Enhancements

- Machine learning-based entity grouping
- Bulk import/export functionality
- Change tracking (new/removed entities)
- API key authentication
- WebSocket support for real-time updates
