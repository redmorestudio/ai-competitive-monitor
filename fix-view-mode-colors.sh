#!/bin/bash

# Fix View Mode/Color By issue in 3D Force Graph
# August 2, 2025

echo "Fixing View Mode/Color By issue in 3D Force Graph..."

# Backup current files
echo "Creating backups..."
cp js/modules/graph-3d-core.js js/modules/graph-3d-core.js.backup-2025-08-02
cp js/modules/graph-3d-visuals.js js/modules/graph-3d-visuals.js.backup-2025-08-02

# Copy fixed files
echo "Applying fixes..."
cp js/modules/graph-3d-core-fixed.js js/modules/graph-3d-core.js
cp js/modules/graph-3d-visuals-fixed.js js/modules/graph-3d-visuals.js

# Commit changes
echo "Committing changes..."
git add js/modules/graph-3d-core.js js/modules/graph-3d-visuals.js
git commit -m "Fix view mode/color by functionality in 3D force graph

- Fixed updateNodeColors in graph-3d-core.js to properly update node colors and refresh graph
- Added proper handling for 'all', 'technology', and 'concept' view modes in graph-3d-visuals.js
- Added debug logging to track view mode changes
- Ensured graph.refresh() is called after color updates"

echo "Fix applied successfully!"
echo ""
echo "To push changes to GitHub:"
echo "git push origin main"
echo ""
echo "To test locally:"
echo "1. Open 3d-force-graph-modular.html in a browser"
echo "2. Change the View Mode dropdown"
echo "3. Verify colors update immediately"
