## 4. 3D Force Graph Visualization

### 4.1 Overview

Interactive, physics-based 3D visualization of competitive landscape using Three.js and 3d-force-graph library. **This is a CRITICAL feature that required extensive work to perfect in the original system and MUST be preserved fully with ALL filtering, rendering, and interaction features.**

### 4.2 Technical Components

**Core Libraries**:
- **Three.js (0.152.0)** - 3D rendering engine with WebGL
- **three-spritetext (1.8.0)** - Text labels in 3D space
- **3d-force-graph (1.73.0)** - Force-directed graph with physics simulation
- **D3.js (7.8.5)** - D3-force simulation for physics

**Modular Architecture** (ES6 modules):
- `graph-3d-core.js` - Core rendering engine and graph initialization
- `graph-3d-visuals.js` - Visual rendering (colors, sizes, effects)
- `graph-3d-filters.js` - Complete filtering system
- `graph-3d-data.js` - Data loading and processing
- `graph-3d-ui.js` - Control panel generation
- `graph-3d-physics.js` - Force simulation controls
- `graph-3d-tooltip.js` - Hover tooltips
- `graph-3d-context.js` - Right-click context menu
- `graph-3d-config.js` - Configuration constants

**Data Sources**:
- Profile configuration (competitors, technologies, products, concepts)
- Change detection database (recent changes with timestamps)
- Intelligence data (technologies, concepts, products per company)
- NAICS data (optional market relationships)

### 4.3 Eight View Modes

The graph supports 8 distinct coloring/filtering modes for different analysis perspectives:

#### Mode 1: Entity Type (Default)
**What It Shows**: Colors nodes by their entity type with full relationship visualization

**Color Scheme**:
- **Company nodes**: Colored by company category:
  - LLM Providers: #ff5722 (red-orange)
  - AI Hardware: #4caf50 (green)
  - AI Infrastructure: #9c27b0 (purple)
  - AI Search: #f44336 (red)
  - AI Voice/Audio: #ff9800 (orange)
  - Enterprise AI: #d32f2f (dark red)
  - Image Generation: #e91e63 (pink)
  - Video AI: #3f51b5 (blue)
  - AI Consulting: #808080 (gray)
- **Technology nodes**: #00ff88 (bright green)
- **Concept nodes**: #00ffff (cyan)
- **Product nodes**: #ff00ff (magenta)

#### Mode 2: Interest Level
**What It Shows**: Heat map visualization based on strategic importance (interestLevel field in profile)
- **Color Gradient**: Green (level 1) → Yellow (level 5) → Red (level 10)
- **Formula**: `rgb(255 * (level/10), 255 * (1 - level/10), 0)`

#### Mode 3: Number of Connections
**What It Shows**: Activity level based on relationship count
- **Color Gradient**: Blue (few connections) → Purple (medium) → Red (many connections)
- **Formula**: `rgb(255 * ratio, 0, 255 * (1-ratio))` where ratio = connections/50

#### Mode 4: All Connections
**What It Shows**: Full relationship graph with all link types visible
- Same colors as Entity Type mode
- Shows technology, concept, shared-technology, and product links simultaneously

#### Mode 5: Technology Links Only
**What It Shows**: Filters to show only company ↔ technology relationships
- Hides concept and product links
- Useful for understanding technology adoption patterns

#### Mode 6: Concept Links Only
**What It Shows**: Filters to show only company ↔ AI/ML concept relationships
- Hides technology and product links
- Useful for understanding capability patterns

#### Mode 7: Recent Activity
**What It Shows**: Heat map based on change timestamps
- **Red**: Changed in last 24 hours
- **Orange**: Changed in last 48 hours
- **Yellow**: Changed in last 7 days
- **Dark gray**: No recent changes

#### Mode 8: High Interest Only
**What It Shows**: Simplified view showing only high-priority entities
- Shows only companies with interestLevel >= 7
- Hides low-priority nodes for focused analysis

### 4.4 Link Properties (Complete Specification)

**THIS SECTION CAPTURES ALL THE SOPHISTICATED LINK RENDERING THAT WAS EXTENSIVELY DEVELOPED**

#### 4.4.1 Link Width Calculation
Links have dynamic widths based on connection strength:

**Base Formula**:
```
width = 0.1 + (strength × 0.1)
Capped at maximum: 5.0
```

**Strength Calculation by Link Type**:
1. **Concept Links** (`linkType: 'concept'`):
   - `strength = linkWidthMultiplier` (full multiplier, default 12)
   - These are the strongest visual connections

2. **Technology Links** (`linkType: 'technology'`):
   - `strength = linkWidthMultiplier × min(connectionCount / 10, 1)`
   - Scales based on how many companies share this technology
   - Example: If 5 companies use same tech, strength = 12 × 0.5 = 6

3. **Shared-Technology Links** (`linkType: 'shared-technology'`):
   - `strength = linkWidthMultiplier × min(sharedCount / 5, 1)`
   - Based on number of technologies shared between two companies
   - Example: If companies share 3 techs, strength = 12 × 0.6 = 7.2

**Link Width Multiplier Control**:
- UI slider range: 1 to 50
- Default value: 12
- User-adjustable in real-time

**Thin Lines Mode**:
- When enabled: `width = 0.05 + (width × 0.1)` (much thinner but maintains relative differences)
- Useful for dense graphs with many connections

#### 4.4.2 Link Opacity
Links have configurable opacity for visual clarity:

**Opacity Settings**:
- Range: 0.1 to 1.0
- Default: 0.5
- UI slider for real-time adjustment
- Applied to all link colors as alpha channel

**Color with Opacity Formula**:
```
rgba(R, G, B, opacity)
```

#### 4.4.3 Link Colors by Type

**Technology Links**:
- Color: `rgba(0, 255, 136, opacity)` (bright green)
- Indicates company uses this technology

**Concept Links**:
- Color: `rgba(78, 205, 196, opacity)` (teal/cyan)
- Indicates company employs this AI/ML concept

**Shared-Technology Links**:
- Color: `rgba(255, 215, 0, opacity × 0.8)` (gold, slightly more transparent)
- Connects two companies that use same technologies

**Default Links**:
- Color: `rgba(150, 150, 150, opacity)` (gray)
- Fallback for other relationship types

**Monochrome Mode**:
- When enabled, all links become: `rgba(0, 255, 255, opacity)` (cyan)

#### 4.4.4 Animated Link Particles ("The Little Thingies")

**THIS IS THE ANIMATED PARTICLE SYSTEM THAT TRAVELS ALONG LINKS**

**Particle Configuration**:
- **Count per Link**: 2 particles (default, user-configurable)
- **Speed**: 0.002 (default), equivalent to 0.2× speed multiplier
- **Width**: 2 pixels
- **Color**: Inherits from link color
- **Direction**: Flows from source → target along link path

**Speed Control**:
- Base speed: 0.01
- Multiplier range: 0.5× (slow) to 3.0× (fast)
- Formula: `linkDirectionalParticleSpeed(0.01 × speedMultiplier)`

**Particle Toggle**:
- UI checkbox: "Show Particles"
- When disabled: `linkDirectionalParticles(0)` (removes all particles)
- When enabled: `linkDirectionalParticles(particleCount)` (default 2)

**Visual Effect**: Particles create a "flow" effect showing relationship direction and strength, making the graph feel alive

**Performance Note**: Particles are automatically reduced when >100 links are visible to maintain 60 FPS

### 4.5 Node Properties (Complete Specification)

#### 4.5.1 Node Rendering
Nodes are rendered as 3D spheres using THREE.js:

**Geometry**:
- Shape: `THREE.SphereGeometry(size, 16, 16)`
- 16 segments for smooth appearance
- Size range: 2 to 30 (based on sizing mode)

**Material**:
- Type: `THREE.MeshPhongMaterial`
- Properties:
  - `color`: Base node color
  - `emissive`: Same as color for glow effect
  - `emissiveIntensity`: 0.3 (subtle internal glow)
  - `shininess`: 100 (gives metallic appearance)

#### 4.5.2 Node Size Modes
Four different sizing algorithms:

**Mode 1: Uniform (Default)**
- All nodes: size = 8
- Clean, simple visualization
- Best for focus on connections rather than metrics

**Mode 2: By URL Count** (`url-count`)
- Formula: `size = max(2, min(20, urlCount × 0.5))`
- Companies with more monitored URLs appear larger
- Example: 10 URLs → size = 5, 40 URLs → size = 20 (capped)

**Mode 3: By Connections** (`connections`)
- Formula: `size = max(2, min(30, connectionCount × 0.3))`
- Nodes with more relationships appear larger
- Shows network centrality visually

**Mode 4: By Interest Level** (`interest-level`)
- Formula: `size = max(2, interestLevel × 2)`
- Strategic importance shown through size
- Example: interest 5 → size = 10, interest 10 → size = 20

#### 4.5.3 Node Glow Effect (High Interest Indicator)
Nodes with `interestLevel >= 7` automatically get a glow effect:

**Glow Implementation**:
- Additional `SphereGeometry(size × 1.5)` added as child object
- Material: `THREE.MeshBasicMaterial`
  - `color`: Same as node color
  - `transparent`: true
  - `opacity`: 0.3
- Creates an aura around high-priority nodes
- Makes strategically important entities stand out visually

#### 4.5.4 Node Labels (Text Sprites)
Labels are rendered using `SpriteText`:

**Label Configuration**:
- Font: System default, sans-serif
- Height calculation: `max(4, min(40, size × 2 × fontScale × companyMultiplier))`
- Position: `y = size + (size × 2)` (above the sphere)
- Color: Inherits from node color
- `depthWrite: false` (prevents z-fighting)

**Font Size Control**:
- UI slider range: 4 to 16
- Default: 12
- `fontScale = fontSize / 12` (proportional scaling)

**Company Label Scale**:
- Additional multiplier for company nodes: 1.0 to 3.0
- Tech/concept nodes use scale 1.0
- Allows emphasizing company names while keeping tech labels smaller

**Label Toggle**:
- UI checkbox: "Show Labels"
- When disabled: Labels removed, only spheres visible
- Improves performance with many nodes

### 4.6 Complete Filtering System

**THE FILTERING SYSTEM REQUIRED EXTENSIVE THOUGHT AND DEVELOPMENT - ALL 10 FILTER TYPES MUST BE PRESERVED**

#### 4.6.1 Entity Type Filter
**Location**: "Filter by Type" section
**UI**: Checkboxes with Select All / Select None buttons

**Functionality**:
- Dynamically populated from actual company types in data
- Each checkbox shows: `[Type Name] (count)`
- Filters affect both companies and their connected entities
- Example: Unchecking "LLM Providers" hides those companies AND orphaned tech nodes

**Filter Logic**:
```javascript
filteredNodes = nodes.filter(node =>
  node.nodeType !== 'company' || entityTypeFilters.has(node.companyType)
)
```

#### 4.6.2 Technology Filter (Advanced Mode Only)
**Location**: "Filter by Technology" section
**UI**: Scrollable checkbox list with search box

**Functionality**:
- Shows all unique technologies from intelligence data
- Search box filters checkbox list in real-time
- When technology selected: Show only companies using that tech + the tech node
- BFS algorithm includes connected nodes

**Search Implementation**:
- Case-insensitive substring match
- Updates checkbox visibility dynamically
- Preserves checked state when searching

#### 4.6.3 AI Concepts Filter (Advanced Mode Only)
**Location**: "Filter by AI Concepts" section
**UI**: Scrollable checkbox list with search box

**Functionality**:
- Shows all unique AI/ML concepts from intelligence data
- Same search/filter behavior as technology filter
- Useful for finding companies with specific capabilities

#### 4.6.4 Product Filter (Advanced Mode Only)
**Location**: "Filter by Products" section
**UI**: Scrollable checkbox list

**Functionality**:
- Shows detected products from company intelligence
- When selected: Shows companies offering that product + product node

#### 4.6.5 Search Filter with Depth
**Location**: "Search" section (both Simple and Advanced)
**UI**: Text input + Depth dropdown

**Search Query**:
- Case-insensitive substring match on node names
- Updates in real-time as user types

**Depth Options**:
1. **Match Only** (depth = 0): Shows only nodes matching search term
2. **1 Level Out** (depth = 1, default): Includes direct connections
3. **2 Levels Out** (depth = 2): Includes connections of connections

**Implementation**: Breadth-First Search (BFS) algorithm
```javascript
// BFS to find nodes within depth levels
visited = matchingNodes
for (depth iterations) {
  for (each node in current level) {
    find all connected nodes via links
    add to visited set
    add to queue for next level
  }
}
```

**Use Case**: Search "GPT" with depth=1 shows GPT-4 node + all companies using it

#### 4.6.6 Link Strength Threshold Filter
**Location**: "Link Strength Filter" section
**UI**: Slider (0 to 10)

**Functionality**:
- Hides links with `strength < threshold`
- Reduces visual clutter in dense graphs
- Orphaned nodes automatically removed after link filtering

**Example**: Setting threshold to 3 hides weak connections, showing only strong relationships

#### 4.6.7 Entity Limit Filter
**Location**: "Number of Entities" section
**UI**: Slider (10 to 500)

**Functionality**:
- Limits total nodes displayed
- Default: 200
- Takes first N nodes after other filters applied
- Prevents performance issues with massive graphs

#### 4.6.8 Node Type Visibility Toggles
**Location**: "Node Visibility" section
**UI**: 4 checkboxes

**Options**:
1. **Show Technology Nodes** - Toggle tech nodes on/off
2. **Show Concept Nodes** - Toggle concept nodes on/off
3. **Show Product Nodes** - Toggle product nodes on/off
4. **Show Company Nodes** - Toggle company nodes on/off

**Logic**: Applied BEFORE other filters as base visibility layer

#### 4.6.9 Flatten Graph Toggle (2D/3D Mode)
**Location**: "View Mode" section
**UI**: Checkbox

**Functionality**:
- **2D Mode** (`numDimensions(2)`): Flattens Z-axis, creates 2D layout
- **3D Mode** (`numDimensions(3)`): Full 3D physics simulation

**Transition Behavior**:
- When switching from 2D → 3D: Randomizes Z positions to break out of plane
- Applies temporary strong repulsion force for 2 seconds
- Reheats simulation to redistribute nodes

**Use Case**: 2D mode useful for presentations, 3D mode for exploration

#### 4.6.10 Custom Tag Filter (Click-to-Filter)
**Location**: Triggered by clicking technology/concept tags in tooltips
**UI**: No direct control (activated programmatically)

**Functionality**:
- When user clicks a tech/concept tag: `filterByTag(tagName)`
- Shows only companies using that tag + the tag node
- Info panel shows: "Filtered by: [Tag Name]" with Clear button
- Overrides other filters temporarily

**Clear Filter**: Returns to previous filter state

### 4.7 Draw Modes (Layout Algorithms)

#### Mode 1: Normal
**Layout**: Standard force-directed 3D distribution
- D3-force simulation with charge, link, and center forces
- Nodes naturally cluster based on connections
- No special positioning

#### Mode 2: Group by Type
**Layout**: Companies clustered by category
- Force simulation with additional category-based attraction
- Creates distinct clusters for each company type
- Technologies/concepts positioned between relevant clusters

#### Mode 3: Changes Past 24 Hours
**Layout**: Recent activity highlighted and positioned forward
- Companies changed <24h positioned closer to camera (Z+)
- Unchanged companies pushed back (Z-)
- Highlight color: Red for changed nodes

#### Mode 4: Changes Past 48 Hours
- Same as above but 48-hour window
- Highlight color: Orange

#### Mode 5: Changes Past Week
- Same as above but 7-day window
- Highlight color: Yellow

### 4.8 UI Control Panel (Simple vs Advanced Modes)

**THE UI HAS TWO COMPLEXITY MODES WITH EXTENSIVE CONTROLS**

#### 4.8.1 Mode Toggle
**Location**: Top of control panel
**UI**: Two-button toggle (Simple | Advanced)

**Simple Mode** (Default):
- Shows essential controls only (~10 controls)
- Beginner-friendly
- Faster to navigate

**Advanced Mode**:
- Shows all controls (~25+ controls)
- Full filtering capabilities
- For power users

#### 4.8.2 Simple Mode Controls (Visible by Default)

1. **Draw By** (Layout Mode dropdown)
2. **Legend** (Auto-generated from visible node types)
3. **View Mode** (Color By dropdown)
4. **Node Size** (Size By dropdown)
5. **View Mode** (Flatten Graph checkbox)
6. **Node Visibility** (4 checkboxes for node types)
7. **Graph Physics** (3 sliders: Force, Distance, Gravity)
8. **Link Strength Filter** (Threshold slider)
9. **Number of Entities** (Limit slider)
10. **Filter by Type** (Checkboxes with Select All/None)
11. **Search** (Text input + Depth dropdown)

#### 4.8.3 Advanced Mode Additional Controls

12. **Stats** (Monitoring counts display)
13. **Visual Settings** (8 toggles):
    - Show Links
    - Show Labels
    - Label Font Size (slider 4-16)
    - Show Particles
    - Link Width Multiplier (slider 1-50)
    - Link Opacity (slider 0.1-1.0)
    - Floating Tooltip
    - Monochrome Mode
    - Show Change Rings
14. **Camera Controls** (Center View button)
15. **Filter by Technology** (Checkbox list + search)
16. **Filter by AI Concepts** (Checkbox list + search)
17. **Filter by Products** (Checkbox list)

#### 4.8.4 Collapsible Sections
**All sections are collapsible** to save space:
- Click section header to expand/collapse
- Arrow indicator shows state (▶ collapsed, ▼ expanded)
- State persists during session

#### 4.8.5 Mobile Optimization
**On screens < 768px**:
- Control panel slides up from bottom
- Toggle button: "⚙️ Config" (bottom-right)
- Panel covers bottom 60% of screen when open
- Swipe down to close
- All controls remain functional

### 4.9 Mouse & Keyboard Interactions

#### 4.9.1 Camera Controls
**Left-Click + Drag**:
- Rotates camera around graph center
- Maintains current zoom level
- Smooth orbital rotation

**Right-Click + Drag**:
- Pans camera (translates view)
- Useful for repositioning without rotating

**Middle-Click + Drag** OR **Ctrl + Left-Click + Drag**:
- Zooms camera in/out
- Alternative to scroll wheel for precise control

**Mouse Scroll Wheel**:
- Scroll up: Zoom in
- Scroll down: Zoom out
- Smooth continuous zooming

**Double-Click Empty Space**:
- Centers view on all nodes
- Fits graph to window

#### 4.9.2 Node Interactions
**Hover Over Node**:
- Shows floating tooltip with:
  - Node name (bold, large)
  - Node type (Technology/Concept/Product/Company)
  - Company type (if company node)
  - Interest level (if company)
  - URL count (if company)
  - Connection count
  - Technologies list (if company)
  - Concepts list (if company)
  - Products list (if company)
  - Recent changes count (if any)
- Tooltip follows mouse cursor (when "Floating Tooltip" enabled)
- Tooltip fixed in place (when disabled)
- 500ms delay before showing (prevents flicker)

**Click Node**:
- Centers camera on node with smooth animation
- Camera distance: 300 units from node
- Animation duration: 1000ms
- Node remains highlighted

**Right-Click Node**:
- Shows context menu with options:
  - **"Show Only This & Connected"**: Filters graph to show only this node + directly connected nodes
  - **"Show All"**: Clears all filters, shows full graph
  - **"Center Camera Here"**: Smoothly moves camera to focus on node
  - **"Fit to Window"**: Zooms to show all visible nodes
  - **"Cancel"**: Closes menu

**Click Technology/Concept/Product Node**:
- Automatically applies `filterByTag()` to show only companies using that entity
- Updates info panel with filter status
- Shows "Clear Filter" button in info panel

#### 4.9.3 Link Interactions
**Hover Over Link**:
- Link opacity increases to 1.0 (full brightness)
- Particles speed up 2× temporarily
- Shows tooltip (if enabled) with:
  - Link type (Technology/Concept/Shared-Tech)
  - Connection strength
  - Source → Target names

**Click Link**:
- Highlights both connected nodes
- Dims all other nodes to opacity 0.3
- Increases link width by 50%
- Click again or click elsewhere to reset

#### 4.9.4 Keyboard Shortcuts
**Escape**:
- Closes context menu
- Clears active filter
- Resets focus

**Space**:
- Toggles physics simulation pause/resume
- Useful for capturing screenshots

**R**:
- Reheats simulation (applies force to redistribute nodes)
- Useful when nodes are stuck in local minima

**C**:
- Centers view on all nodes
- Same as "Center View" button

**F**:
- Fits all visible nodes to window
- Calculates bounding box and adjusts camera

#### 4.9.5 Click-to-Filter Workflow
Example user flow:
1. User hovers over node "OpenAI"
2. Tooltip shows technologies: ["GPT-4", "DALL-E", "Whisper"]
3. User clicks "GPT-4" technology tag in tooltip
4. Graph filters to show only companies using GPT-4
5. Info panel shows: "Filtered by: GPT-4 | Showing 8 companies"
6. User clicks "Clear Filter" button
7. Full graph restored

### 4.10 Physics Simulation

#### 4.10.1 D3-Force Configuration
The graph uses D3-force for physics simulation with three force types:

**Charge Force** (Node Repulsion):
- Default strength: -300
- UI slider range: -1000 to -50
- Formula: All nodes repel each other
- Negative value = repulsion, positive = attraction
- Higher absolute value = stronger force

**Link Force** (Connection Strength):
- Default distance: 30
- UI slider range: 10 to 200
- Formula: Connected nodes try to maintain this distance
- Longer distance = more spread out graph

**Center Force** (Gravity):
- Default strength: 0.3
- UI slider range: 0.0 to 1.0
- Formula: All nodes pulled toward graph center
- Prevents nodes from drifting away
- 0 = no gravity, 1 = strong pull to center

#### 4.10.2 Force Configuration Presets
**Tight Clustering** (for dense data):
- Charge: -200
- Link Distance: 20
- Center Gravity: 0.5

**Spread Out** (for clarity):
- Charge: -500
- Link Distance: 100
- Center Gravity: 0.2

**Balanced** (default):
- Charge: -300
- Link Distance: 30
- Center Gravity: 0.3

#### 4.10.3 Simulation Control
**Reheat Simulation**:
- Increases simulation alpha to 1.0
- Causes nodes to rearrange
- Use when graph looks "stuck"

**Pause/Resume**:
- Space bar toggles
- Paused: Nodes freeze in place
- Useful for screenshots or analysis

**Collision Detection**:
- Prevents node overlap
- Radius: node size + 2
- Applied in all modes

#### 4.10.4 True 3D Physics
**Critical Implementation Details**:
- Must call `numDimensions(3)` IMMEDIATELY after graph creation
- Default is 2D - will collapse to flat plane if not set
- When switching 2D→3D: Randomize Z positions to break out of plane
- Apply strong charge force briefly (2 seconds) to redistribute

**Z-Axis Force**:
- Nodes naturally distribute in 3D space
- No forced layering (organic distribution)
- Initial positions: Random within [-300, +300] cube

### 4.11 Performance Optimization

#### 4.11.1 Limits & Throttling
**Hard Limits**:
- Maximum nodes displayed: 500 (configurable, default 200)
- Maximum links displayed: 1000
- If exceeded: Show only highest-priority entities

**Particle Throttling**:
- >100 links visible: Reduce particles from 2 to 1 per link
- >200 links visible: Disable particles entirely
- Automatic, transparent to user

**Debouncing**:
- Filter changes: 150ms debounce
- Slider adjustments: 100ms debounce
- Search input: 300ms debounce

#### 4.11.2 Rendering Optimization
**Level of Detail (LOD)**:
- Nodes >500 units from camera: Reduced to 8 segments (from 16)
- Nodes >1000 units: No label rendered
- Links >800 units: Width reduced by 50%

**Canvas Rendering**:
- Uses WebGL via Three.js (not Canvas 2D or SVG)
- Hardware accelerated
- 60 FPS target

**Memory Management**:
- Old geometries disposed when filters change
- Textures recycled
- Tooltip DOM elements pooled (not recreated)

#### 4.11.3 Data Loading Strategy
**Progressive Loading**:
1. Load company nodes first (show immediately)
2. Calculate technology/concept nodes (50ms delay)
3. Calculate links (100ms delay)
4. Enable physics simulation (200ms delay)

**Lazy Loading**:
- Technology/concept counts calculated on-demand
- Product nodes only created if products exist in data
- KWIC contexts loaded separately when clicked

### 4.12 Error States & Edge Cases

**No Data Available**:
- Shows message: "No data available. Run scraping workflow first."
- Displays minimal empty graph with loading instructions

**No Nodes Match Filters**:
- Shows message: "No entities match current filters. Try adjusting filter settings."
- "Reset All Filters" button prominently displayed

**All Nodes Orphaned** (no connections):
- Still displays nodes in grid pattern
- Message: "No connections between entities. This may indicate missing intelligence data."

**Graph Too Large** (>500 nodes):
- Automatically applies entity limit to 200
- Shows warning: "Graph limited to 200 entities for performance. Use filters to refine."

**WebGL Not Supported**:
- Graceful fallback message: "3D visualization requires WebGL support. Please use a modern browser."
- Link to 2D table view

---

---

