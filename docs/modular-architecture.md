# AI Monitor - Modular Architecture Documentation

## Overview
The AI Monitor has been refactored from a 4000+ line monolithic `index.html` into a clean, modular architecture with 22 specialized JavaScript modules and 3 CSS files.

## Architecture Benefits
- **Maintainability**: Each module has a single responsibility
- **Testability**: Modules can be tested independently
- **Scalability**: New features can be added as new modules
- **Performance**: Lazy loading and optimized initialization
- **Developer Experience**: Clear separation of concerns

## Module Structure

### Core Modules
- **main.js** (279 lines) - Application coordinator and initialization
- **config.js** (109 lines) - Centralized configuration
- **data.js** (247 lines) - State management and API integration
- **api.js** (203 lines) - HTTP client with retry logic
- **utils.js** (217 lines) - Shared utility functions

### UI Modules
- **ui.js** (155 lines) - Core UI utilities (notifications, loading states)
- **dashboard.js** (294 lines) - Main dashboard component
- **controls.js** (529 lines) - UI controls (modals, tabs, settings)
- **filters.js** (568 lines) - Filtering and search functionality

### 3D Graph Modules
- **graph-3d.js** (480 lines) - Graph coordinator
- **graph-3d-core.js** (256 lines) - Core 3D engine
- **graph-3d-data.js** (455 lines) - Graph data management
- **graph-3d-physics.js** (261 lines) - Physics simulation
- **graph-3d-visuals.js** (326 lines) - Visual effects
- **graph-3d-filters.js** (438 lines) - Graph filtering
- **graph-3d-ui.js** (720 lines) - Graph UI controls
- **graph-3d-context.js** (319 lines) - Context menus
- **graph-3d-tooltip.js** (248 lines) - Tooltip system
- **graph-3d-mobile.js** (398 lines) - Mobile optimizations

### CSS Organization
- **main.css** - Core styles and layout
- **controls.css** - UI control styles
- **graph.css** - 3D graph specific styles

## Module Communication

### Event Flow
1. User interaction → UI module
2. UI module → Main coordinator
3. Main coordinator → Data module
4. Data module → API module
5. API response → Data module → UI update

### State Management
- Centralized in `data.js` with subscription pattern
- Modules subscribe to state changes
- Automatic UI updates on state change

### Example Flow
```javascript
// User clicks refresh button
window.app.refreshData()
  → main.js coordinates refresh
  → data.js calls API
  → api.js makes HTTP request
  → data.js updates state
  → subscribed modules update UI
```

## Initialization Sequence

1. **DOM Ready** - Wait for page load
2. **Module Import** - ES6 module loading
3. **Controls Init** - Set up UI handlers
4. **Dashboard Init** - Prepare dashboard UI
5. **UI Init** - Initialize notifications
6. **Filters Init** - Set up filtering
7. **Data Load** - Fetch initial data
8. **Auto-refresh** - Start refresh timer
9. **State Subscriptions** - Connect modules

## Performance Optimizations

- **Lazy Loading**: 3D graph loads on demand
- **Debounced Search**: 300ms delay on typing
- **Cached Calculations**: Store computed values
- **Efficient Updates**: Only update changed DOM
- **Module Bundling**: Single entry point

## Development Guidelines

### Adding New Features
1. Create new module in `/js/modules/`
2. Add JSDoc header with module description
3. Export public interface
4. Import in relevant coordinator
5. Add initialization if needed

### Module Template
```javascript
/**
 * @module my-feature
 * @description Description of what this module does
 * @since 1.0.0
 */

// Private state
const state = {};

// Private functions
function privateHelper() {}

// Public functions
export function publicMethod() {}

// Module interface
export const myFeature = {
    publicMethod
};
```

### Best Practices
- Keep modules under 500 lines
- Single responsibility principle
- Clear public/private separation
- Comprehensive JSDoc comments
- Consistent error handling

## Testing Strategy

### Unit Tests
- Test each module in isolation
- Mock dependencies
- Focus on public interface

### Integration Tests
- Test module interactions
- Verify event flows
- Check state updates

### E2E Tests
- Full user workflows
- Cross-browser testing
- Performance benchmarks

## Deployment

### GitHub Pages
- Static hosting
- Automatic deployment
- No build step required

### Local Development
```bash
python3 -m http.server 8000
# Navigate to http://localhost:8000
```

### Production Checklist
- [ ] Remove console.logs ✓
- [ ] Add JSDoc comments ✓
- [ ] Test all features ✓
- [ ] Update documentation ✓
- [ ] Create pull request
- [ ] Deploy to production

## Future Enhancements

### Planned Improvements
- TypeScript migration
- Webpack bundling
- Component library
- Advanced caching
- PWA support

### Module Candidates
- `notifications.js` - Advanced alerts
- `analytics.js` - Usage tracking
- `export.js` - Data export
- `themes.js` - Theme system
- `shortcuts.js` - Keyboard navigation

## Maintenance

### Regular Tasks
- Update dependencies
- Review module sizes
- Optimize performance
- Refactor large modules
- Update documentation

### Module Health Metrics
- Lines of code < 500
- Cyclomatic complexity < 10
- Test coverage > 80%
- JSDoc coverage 100%
- No circular dependencies

---

Last Updated: August 1, 2025
Version: 1.0.0
