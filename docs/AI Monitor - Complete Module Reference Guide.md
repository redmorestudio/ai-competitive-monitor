---
title: AI Monitor - Complete Module Reference Guide
type: note
permalink: project-documentation/ai-competitive-monitor/ai-monitor-complete-module-reference-guide
---

# AI Monitor - Complete Module Reference Guide
**Last Updated**: August 1, 2025  
**Total Modules**: 22 JavaScript modules + 3 CSS files

## Module Directory Structure
```
ai-competitive-monitor/
├── index.html (main dashboard)
├── 3d-force-graph-fixed.html (modularized 3D graph)
├── js/modules/
│   ├── [Core Modules - 5 files]
│   ├── [UI Modules - 4 files]
│   ├── [3D Graph Modules - 11 files]
│   └── version.js
└── css/
    ├── main.css
    ├── controls.css
    └── graph.css
```

## Detailed Module Breakdown

### Core Modules (Foundation Layer)

#### 1. **main.js** (279 lines)
- **Purpose**: Application coordinator and entry point
- **Key Functions**:
  - `initializeApp()` - Main initialization sequence
  - `refreshData()` - Coordinate data refresh across modules
  - `handleError()` - Global error handling
  - `scheduleAutoRefresh()` - Auto-refresh timer management
- **Dependencies**: All other modules
- **Exports**: `window.app` global object

#### 2. **config.js** (109 lines)
- **Purpose**: Centralized configuration management
- **Key Features**:
  - API endpoints configuration
  - Feature flags (PostgreSQL vs SQLite)
  - Update intervals and timing
  - Debug mode settings
  - Dashboard preferences
- **Exports**: `CONFIG` object

#### 3. **data.js** (247 lines)
- **Purpose**: State management and data orchestration
- **Key Functions**:
  - `loadData()` - Fetch all dashboard data
  - `subscribeToChanges()` - State subscription system
  - `updateState()` - Centralized state updates
  - `getCompanyData()` - Company-specific data access
  - `cacheManager` - Data caching logic
- **State Structure**:
  - Companies list
  - Recent changes
  - Statistics
  - Filter states
- **Exports**: `dataManager` object

#### 4. **api.js** (203 lines)
- **Purpose**: HTTP client with retry logic and error handling
- **Key Functions**:
  - `fetchJSON()` - Fetch with automatic retry
  - `fetchWithTimeout()` - Timeout protection
  - `retryFetch()` - Exponential backoff retry
  - `buildURL()` - URL construction with params
- **Features**:
  - 3 retry attempts with exponential backoff
  - Request timeout (30s default)
  - Error normalization
  - CORS handling
- **Exports**: `api` object

#### 5. **utils.js** (217 lines)
- **Purpose**: Shared utility functions
- **Key Functions**:
  - `formatDate()` - Date formatting
  - `escapeHTML()` - XSS prevention
  - `debounce()` - Function debouncing
  - `throttle()` - Function throttling
  - `deepMerge()` - Object merging
  - `calculateRelativeTime()` - "2 hours ago" formatting
  - `getColorForCategory()` - Category color mapping
  - `normalizeCompanyName()` - Name standardization
- **Exports**: Individual utility functions

### UI Modules (Interface Layer)

#### 6. **ui.js** (155 lines)
- **Purpose**: Core UI utilities and notifications
- **Key Functions**:
  - `showNotification()` - Toast notifications
  - `showLoading()` - Loading states
  - `hideLoading()` - Remove loading states
  - `updateBadge()` - Update count badges
  - `animateUpdate()` - Smooth transitions
- **Features**:
  - Success/error/info notifications
  - Loading spinner management
  - Animation utilities
- **Exports**: `ui` object

#### 7. **dashboard.js** (294 lines)
- **Purpose**: Main dashboard component management
- **Key Functions**:
  - `renderCompanyCards()` - Company card grid
  - `renderRecentChanges()` - Changes timeline
  - `updateStatistics()` - Dashboard statistics
  - `handleCardClick()` - Company detail modals
  - `setupEventListeners()` - Dashboard interactions
- **Features**:
  - Company card rendering
  - Change feed updates
  - Real-time statistics
  - Responsive grid layout
- **Exports**: `dashboard` object

#### 8. **controls.js** (529 lines)
- **Purpose**: UI controls, modals, and settings
- **Key Functions**:
  - `initializeControls()` - Set up all controls
  - `showModal()` - Modal management
  - `setupTabs()` - Tab navigation
  - `handleSettings()` - Settings panel
  - `manageSorting()` - Sort controls
  - `handleViewModes()` - View mode switching
- **Features**:
  - Modal system (company details, settings)
  - Tab management
  - Settings persistence
  - View mode controls
- **Exports**: `controls` object

#### 9. **filters.js** (568 lines)
- **Purpose**: Search and filtering functionality
- **Key Functions**:
  - `initializeFilters()` - Set up filter system
  - `performSearch()` - Real-time search
  - `applyFilters()` - Multi-criteria filtering
  - `updateFilterUI()` - Filter state display
  - `clearFilters()` - Reset filters
  - `saveFilterPreset()` - Filter persistence
- **Features**:
  - Real-time search (debounced)
  - Multi-select filters
  - Interest level filtering
  - Category filtering
  - Date range filtering
  - Filter presets
- **Exports**: `filters` object

### 3D Graph Modules (Visualization Layer)

#### 10. **graph-3d.js** (480 lines)
- **Purpose**: Main 3D graph coordinator
- **Key Functions**:
  - `initializeGraph()` - Graph setup
  - `loadGraphData()` - Data loading
  - `updateGraph()` - Graph updates
  - `coordinateModules()` - Module orchestration
- **Coordinates**:
  - All graph sub-modules
  - Data flow between modules
  - Event handling
- **Exports**: `graph3D` object

#### 11. **graph-3d-core.js** (256 lines)
- **Purpose**: Core Three.js engine and rendering
- **Key Functions**:
  - `createScene()` - Three.js scene setup
  - `createRenderer()` - WebGL renderer
  - `animate()` - Render loop
  - `handleResize()` - Responsive sizing
- **Features**:
  - WebGL rendering
  - Camera controls
  - Scene management
  - Performance optimization
- **Exports**: `graphCore` object

#### 12. **graph-3d-data.js** (455 lines)
- **Purpose**: Graph data management and processing
- **Key Functions**:
  - `processGraphData()` - Data transformation
  - `createNodes()` - Node generation
  - `createLinks()` - Link generation
  - `calculateNodeSizes()` - Size calculations
  - `extractIntelligence()` - Entity extraction
- **Features**:
  - Node creation (companies, tech, concepts)
  - Link relationship mapping
  - Intelligence extraction
  - Data normalization
- **Exports**: `graphData` object

#### 13. **graph-3d-physics.js** (261 lines)
- **Purpose**: Force simulation and physics
- **Key Functions**:
  - `initializeForces()` - Force setup
  - `updateSimulation()` - Physics tick
  - `adjustForceStrength()` - Dynamic forces
  - `handleCollisions()` - Collision detection
- **Features**:
  - D3 force simulation
  - Collision detection
  - Force strength controls
  - Center gravity
- **Exports**: `graphPhysics` object

#### 14. **graph-3d-visuals.js** (326 lines)
- **Purpose**: Visual effects and styling
- **Key Functions**:
  - `applyNodeColors()` - Color mapping
  - `updateLinkStyles()` - Link styling
  - `createParticles()` - Particle effects
  - `animateChanges()` - Change animations
- **Features**:
  - Dynamic coloring
  - Particle systems
  - Glow effects
  - Animation management
- **Exports**: `graphVisuals` object

#### 15. **graph-3d-filters.js** (438 lines)
- **Purpose**: Graph-specific filtering
- **Key Functions**:
  - `filterNodes()` - Node filtering
  - `filterLinks()` - Link filtering
  - `applySearchDepth()` - BFS search
  - `updateVisibility()` - Show/hide elements
- **Features**:
  - Multi-criteria filtering
  - Search with depth
  - Type filtering
  - Threshold filtering
- **Exports**: `graphFilters` object

#### 16. **graph-3d-ui.js** (720 lines)
- **Purpose**: Graph UI controls (40+ controls)
- **Key Functions**:
  - `createControlPanel()` - Control panel setup
  - `bindControlEvents()` - Event binding
  - `updateControlStates()` - State sync
  - `handleModeSwitch()` - Simple/Advanced modes
- **Controls**:
  - Draw modes
  - View modes
  - Visual settings
  - Physics controls
  - Filter controls
- **Exports**: `graphUI` object

#### 17. **graph-3d-context.js** (319 lines)
- **Purpose**: Right-click context menus
- **Key Functions**:
  - `showContextMenu()` - Display menu
  - `createMenuItems()` - Dynamic items
  - `handleMenuClick()` - Action handling
  - `positionMenu()` - Smart positioning
- **Menu Options**:
  - Show only connected
  - Center camera
  - Fit to window
  - Reset filters
- **Exports**: `graphContext` object

#### 18. **graph-3d-tooltip.js** (248 lines)
- **Purpose**: Hover tooltip system
- **Key Functions**:
  - `showTooltip()` - Display tooltip
  - `updateTooltipContent()` - Content generation
  - `positionTooltip()` - Smart positioning
  - `createClickableTags()` - Interactive tags
- **Features**:
  - Floating tooltips
  - Rich content display
  - Clickable technology/concept tags
  - Auto-positioning
- **Exports**: `graphTooltip` object

#### 19. **graph-3d-mobile.js** (398 lines)
- **Purpose**: Mobile optimizations and touch controls
- **Key Functions**:
  - `detectMobile()` - Device detection
  - `setupTouchControls()` - Touch handlers
  - `createMobileDrawer()` - Bottom drawer
  - `optimizeForMobile()` - Performance tweaks
- **Features**:
  - Touch gestures
  - Bottom drawer UI
  - Reduced particle counts
  - Simplified controls
- **Exports**: `graphMobile` object

#### 20. **graph-3d-simplified.js** (legacy)
- **Purpose**: Legacy simplified view (being phased out)
- **Status**: Deprecated, kept for compatibility
- **Note**: Functionality merged into main graph modules

### Utility Modules

#### 21. **version.js** (auto-generated)
- **Purpose**: Version information
- **Content**: Build version and timestamp
- **Usage**: Cache busting and debugging

## Module Dependencies

### Dependency Graph
```
main.js
├── config.js
├── data.js
│   └── api.js
├── ui.js
├── dashboard.js
├── controls.js
├── filters.js
└── utils.js

graph-3d.js (separate entry point)
├── graph-3d-core.js
├── graph-3d-data.js
├── graph-3d-physics.js
├── graph-3d-visuals.js
├── graph-3d-filters.js
├── graph-3d-ui.js
├── graph-3d-context.js
├── graph-3d-tooltip.js
└── graph-3d-mobile.js
```

## CSS File Organization

### main.css
- Core layout and typography
- Grid system
- Base component styles
- Responsive breakpoints
- CSS variables for theming

### controls.css
- Modal styles
- Form controls
- Buttons and inputs
- Settings panel
- Tab navigation

### graph.css
- 3D graph container
- Control panel styles
- Tooltip styles
- Context menu styles
- Mobile drawer

## Communication Patterns

### Event System
- Custom events for module communication
- Event bubbling through main.js
- Subscription pattern for state changes

### State Management
- Centralized state in data.js
- Immutable updates
- Subscriber notifications
- Local storage persistence

### API Communication
- All API calls through api.js
- Automatic retry on failure
- Error propagation to UI
- Loading state management

## Performance Considerations

### Module Loading
- ES6 modules with lazy loading
- 3D graph loads on demand
- Critical path optimization
- Async initialization

### Memory Management
- Cleanup on module unload
- Event listener management
- WebGL resource disposal
- State cleanup

### Optimization Strategies
- Debounced search (300ms)
- Throttled scroll handlers
- Cached calculations
- Virtual scrolling for large lists

## Development Workflow

### Adding Features
1. Identify target module
2. Add functions following pattern
3. Update exports if needed
4. Add event handlers
5. Update documentation

### Debugging
- Each module has debug flag
- Console groups for module output
- Performance timing markers
- State inspection tools

### Testing Approach
- Unit tests per module
- Integration tests for workflows
- E2E tests for user journeys
- Performance benchmarks

## Future Module Plans

### Proposed Modules
- **export.js** - Data export functionality
- **notifications.js** - Advanced notification system
- **analytics.js** - Usage analytics
- **themes.js** - Theme management
- **shortcuts.js** - Keyboard shortcuts
- **comparison.js** - Company comparison tools

### Refactoring Targets
- Split graph-3d-ui.js (720 lines)
- Extract modal system from controls.js
- Create dedicated animation module
- Separate search from filters.js

## Module Quality Metrics

### Current Status
- Average module size: 350 lines
- Largest module: graph-3d-ui.js (720 lines)
- Smallest module: config.js (109 lines)
- Total code: ~7,500 lines
- JSDoc coverage: 100%

### Health Indicators
- ✅ No circular dependencies
- ✅ Clear separation of concerns
- ✅ Consistent naming patterns
- ✅ Comprehensive error handling
- ✅ Performance optimized

---

This reference guide provides a complete map of the modular architecture. Each module has a specific purpose and clear boundaries, making the system maintainable and extensible.