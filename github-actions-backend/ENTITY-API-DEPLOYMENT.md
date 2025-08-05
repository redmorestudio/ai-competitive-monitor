# Entity API Server Deployment Guide

## Overview
The Entity API Server provides a RESTful API for managing entity groups in the AI Competitive Monitor system. It connects to the PostgreSQL database and serves as the backend for the entity management UI.

## Local Development

```bash
cd github-actions-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your DATABASE_URL

# Run the server
npm run start:entity-api

# Or with auto-reload
npm run dev:entity-api
```

## Deployment Options

### 1. Deploy to Heroku

```bash
# Install Heroku CLI
# Create a new Heroku app
heroku create your-app-name

# Add PostgreSQL addon (or use existing DATABASE_URL)
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Or deploy subfolder
git subtree push --prefix github-actions-backend heroku main
```

### 2. Deploy to Railway

1. Connect your GitHub repository to Railway
2. Add PostgreSQL service
3. Set root directory to `github-actions-backend`
4. Set start command: `node entity-api-server.js`
5. Deploy

### 3. Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - Root Directory: `github-actions-backend`
   - Build Command: `npm install`
   - Start Command: `node entity-api-server.js`
4. Add PostgreSQL database
5. Set DATABASE_URL environment variable
6. Deploy

### 4. Deploy with Docker

```dockerfile
# Create Dockerfile in github-actions-backend
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "entity-api-server.js"]
```

```bash
# Build and run
docker build -t entity-api .
docker run -p 3001:3001 -e DATABASE_URL=your_postgres_url entity-api
```

## Environment Variables

- `DATABASE_URL` or `POSTGRES_CONNECTION_STRING`: PostgreSQL connection string (required)
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Set to 'production' for SSL database connections

## GitHub Actions Integration

The entity API server can be tested in GitHub Actions using the `test-entity-api.yml` workflow:

```bash
# Trigger the test workflow
gh workflow run test-entity-api.yml
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/entities/stats` - Entity statistics
- `GET /api/entity-groups` - List all groups
- `POST /api/entity-groups` - Create new group
- `PUT /api/entity-groups/:id` - Update group
- `DELETE /api/entity-groups/:id` - Delete group
- `GET /api/entities/ungrouped` - List ungrouped entities
- `POST /api/entities/auto-group` - Auto-group suggestions
- `GET /api/entity-groups/export` - Export all groups

## CORS Configuration

The server is configured to accept requests from:
- `http://localhost:*` (development)
- `https://redmorestudio.github.io` (GitHub Pages)

To add custom domains, update the CORS configuration in `entity-api-server.js`.

## Production Considerations

1. **Authentication**: Add API key or JWT authentication
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **Monitoring**: Set up logging and monitoring (e.g., Sentry)
4. **Backup**: Regular PostgreSQL backups
5. **SSL**: Ensure HTTPS in production

## Connecting the UI

Update `manage-entities.html` to point to your deployed API:

```javascript
// In production
const API_BASE_URL = 'https://your-deployed-api.herokuapp.com';

// Or use environment-based configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : 'https://your-deployed-api.herokuapp.com';
```

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is set correctly
- Check SSL settings for production databases
- Ensure PostgreSQL server allows connections

### CORS Errors
- Verify the origin is allowed in CORS configuration
- Check that preflight requests are handled

### Port Issues
- Ensure PORT environment variable is used
- Check if port is already in use

## Support

For issues or questions:
- Check server logs: `heroku logs --tail`
- Review PostgreSQL connection settings
- Verify environment variables are set correctly
