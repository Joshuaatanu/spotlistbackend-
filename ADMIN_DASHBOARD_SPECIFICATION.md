# Administrative Dashboard Design Specification
## Spotlist Double-Booking Checker

**Design Philosophy**: Apple Human Interface Guidelines adapted for web  
**Core Principle**: Every pixel must earn its place. Clarity over features. Action over information.

---

## 1. INFORMATION ARCHITECTURE

### 1.1 Administrator Context

**Data the administrator manages:**
- TV spotlist files (CSV/Excel) containing ad schedules
- Analysis results identifying potential double bookings
- Configuration settings (match modes, keywords, time windows)
- Historical analysis runs and comparisons
- Metrics: spend, spot counts, double-booking percentages

**Frequent actions (Top 5):**
1. **Upload and analyze** a new spotlist file
2. **Review critical metrics** (total spend, double-booking spend, affected spots)
3. **Investigate specific double bookings** by filtering and drilling down
4. **Adjust analysis parameters** and re-run analysis
5. **Export annotated results** for reporting or correction

**Administrator expertise level:** Non-technical. Must never write code, run queries, or understand database structures.

---

### 1.2 Primary Navigation

**Single-level navigation** (no nested menus to reduce cognitive load):

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Spotlist Checker          [Search] [Settings]   │
├─────────────────────────────────────────────────────────┤
│  [Analyze] [Results] [History] [Configuration]          │
└─────────────────────────────────────────────────────────┘
```

**Navigation rationale:**
- **Analyze**: Primary action—upload and run analysis (most frequent task)
- **Results**: Current analysis results (if available)
- **History**: Past analyses for comparison and reference
- **Configuration**: Saved analysis presets and default settings

**Navigation behavior:**
- Active section highlighted with subtle background
- Breadcrumbs only appear when drilling into details (progressive disclosure)
- No dropdown menus—direct access to all primary sections

---

### 1.3 Secondary Navigation (Contextual)

**Within Results section:**
- Tab-based navigation for different views:
  - **Overview** (default): Key metrics and summary charts
  - **Double Bookings**: Detailed table of flagged spots
  - **Channels**: Breakdown by TV channel
  - **Timeline**: Chronological view of conflicts

**Within History section:**
- Filter bar: Date range, file name search, status (completed/failed)
- Sort: Most recent first (default), by spend, by double-booking count

---

### 1.4 Hierarchy and Grouping Rationale

**Information hierarchy (top to bottom):**
1. **Critical actions** (upload, analyze) — always visible
2. **Critical metrics** (spend at risk, double-booking count) — immediate visibility
3. **Supporting context** (charts, trends) — below metrics
4. **Detailed data** (tables, individual spots) — on demand

**Grouping principles:**
- Group by **task**, not by data type
- Related actions appear together
- Progressive disclosure: summary → detail → drill-down
- Visual grouping through spacing, not borders (reduces visual noise)

---

## 2. COMPONENT SPECIFICATIONS

### 2.1 Data Tables

**Design principles:**
- Maximum 7 columns visible (cognitive limit)
- Row height: 48px (comfortable touch target)
- Alternating row backgrounds: transparent / subtle (5% opacity)
- Hover state: subtle highlight (10% opacity)
- Selected rows: clear visual indicator (accent color, 15% opacity)

**Required features:**
- **Inline sorting**: Click column header to sort (ascending → descending → none)
- **Column filtering**: Filter icon appears on hover; click to reveal filter input
- **Row selection**: Checkbox column (leftmost) for bulk actions
- **Inline editing**: Double-click editable cells (e.g., notes, tags)
- **Pagination**: 25 rows per page (default), configurable (25/50/100)

**Table structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ [☐] Channel │ Date      │ Time  │ Spend │ Status │ Actions │
├─────────────────────────────────────────────────────────────┤
│ [☐] RTL     │ 2025-11-30│ 10:00 │ €500  │ ⚠️      │ [View]  │
│ [☐] RTL     │ 2025-11-30│ 10:30 │ €500  │ ⚠️      │ [View]  │
└─────────────────────────────────────────────────────────────┘
```

**Sorting indicators:**
- Unsorted: No indicator
- Ascending: ↑ (subtle gray)
- Descending: ↓ (subtle gray)
- Active sort: Accent color indicator

**Filtering:**
- Filter icon appears on column header hover
- Click reveals inline filter input (text, date range, or dropdown)
- Active filters show badge count on filter icon
- "Clear all filters" button appears when filters are active

**Bulk actions:**
- Appear in fixed bar above table when rows are selected
- Actions: Export selected, Add note, Mark reviewed, Delete
- Selection count: "3 spots selected"

---

### 2.2 Charts and Visualizations

**Chart types:**
1. **Spend by Channel** (horizontal bar chart)
   - Purpose: Identify channels with highest risk spend
   - Action: Click bar to filter table by channel
   - Y-axis: Channel names
   - X-axis: Spend amount (€)
   - Color: Accent color for double-booking spend, muted for total

2. **Double Bookings Over Time** (line chart)
   - Purpose: Identify temporal patterns
   - Action: Click point to filter table by date range
   - X-axis: Date
   - Y-axis: Count of double bookings
   - Anomaly detection: Highlight spikes with subtle alert color

3. **Spend Distribution** (donut chart)
   - Purpose: Quick visual of risk percentage
   - Center: Total spend
   - Segments: Double-booking spend vs. normal spend
   - Action: Click segment to filter

**Chart interaction:**
- Hover: Tooltip with exact values
- Click: Filter related table/data
- Zoom: Pinch/scroll on touch, drag on desktop
- Export: Right-click context menu → "Export as PNG"

**Chart design:**
- Minimal grid lines (subtle, 5% opacity)
- No unnecessary decorations
- Clear axis labels
- Accessible color palette (WCAG AA compliant)

---

### 2.3 Forms and Inputs

**Form principles:**
- Single-column layout (reduces eye movement)
- Labels above inputs (not beside)
- Real-time validation (show errors immediately, inline)
- Help text appears below input (not as placeholder)
- Required fields: Subtle asterisk (*) after label

**Input types:**

**File Upload:**
- Drag-and-drop zone: Large, clear visual target
- File preview: Show filename, size, last modified
- Validation: File type, size limits shown before upload
- Progress: Animated progress bar during upload

**Text Inputs:**
- Height: 40px
- Border: 1px solid (subtle)
- Focus: Accent color border, subtle shadow
- Error state: Red border, error message below

**Select/Dropdown:**
- Native select styling (customized for consistency)
- Searchable for long lists (>10 items)
- Clear selected value indicator

**Slider (Time Window):**
- Visual: Track with handle
- Value display: Number shown next to slider
- Increments: 5-minute steps
- Range: 5-120 minutes

**Checkbox/Radio:**
- Large touch targets (44x44px minimum)
- Clear labels
- Grouped visually with spacing

**Form validation:**
- Real-time: Validate on blur
- Error messages: Specific, actionable ("File must be CSV or Excel" not "Invalid file")
- Success indicators: Subtle checkmark on valid fields
- Prevent submission: Disable submit until all required fields valid

---

### 2.4 Modals and Overlays

**Modal principles:**
- Maximum width: 600px (maintains focus)
- Backdrop: Dark overlay (40% opacity)
- Close: X button (top-right), ESC key, click outside
- Focus trap: Keyboard navigation stays within modal
- Animation: Subtle fade-in (200ms)

**Modal types:**

**Confirmation Modal:**
- Purpose: Confirm destructive actions
- Structure: Icon, title, message, action buttons
- Buttons: Primary action (destructive color), Cancel
- Example: "Delete Analysis?" → "This cannot be undone" → [Cancel] [Delete]

**Detail Modal:**
- Purpose: Show full details of a spot or analysis
- Structure: Header with title, scrollable content, footer with actions
- Actions: Edit, Export, Close

**Filter Modal:**
- Purpose: Advanced filtering options
- Structure: Multiple filter groups, Apply/Clear buttons
- Behavior: Apply filters immediately, modal closes on Apply

---

### 2.5 Global Search

**Search behavior:**
- Scope: All spotlists, analysis results, file names
- Trigger: Search icon in header, or Cmd/Ctrl+K
- Results: Grouped by type (Files, Analyses, Spots)
- Highlight: Matching terms highlighted in results
- Keyboard: Arrow keys to navigate, Enter to select

**Search UI:**
```
┌─────────────────────────────────────┐
│ 🔍 Search spotlists, files...      │
├─────────────────────────────────────┤
│ Files                               │
│   📄 spotlist_company_ebay.csv     │
│   📄 test_spotlist.csv              │
│                                     │
│ Analyses                            │
│   📊 Analysis from Nov 30, 2025    │
│   📊 Analysis from Nov 29, 2025    │
└─────────────────────────────────────┘
```

---

### 2.6 Metrics Cards

**Design:**
- Size: Consistent card height (120px)
- Layout: Value (large), label (small), trend (optional)
- Visual hierarchy: Value is 2x label size
- Color: Accent color for critical metrics (double-booking spend)

**Card structure:**
```
┌─────────────────────┐
│ €12,450.00          │  ← Large, bold
│ Double Booking Spend│  ← Small, muted
│ 8.2% of total       │  ← Sub-value, subtle
└─────────────────────┘
```

**Interactive:**
- Click card to filter related data
- Hover: Subtle elevation (shadow)
- Loading state: Skeleton animation

---

## 3. INTERACTION PATTERNS

### 3.1 Primary Workflow: Upload and Analyze

**Step 1: Upload File**
- User lands on "Analyze" page (default)
- Large drag-and-drop zone visible
- File selection: Click or drag
- Validation: Immediate feedback on file type/size
- Preview: Show filename, row count, date range

**Step 2: Configure Analysis**
- Configuration panel visible (right sidebar on desktop, below on mobile)
- Default values pre-filled (from last analysis or saved preset)
- Real-time validation: Disable "Run Analysis" if invalid
- Help text: Explain each setting in plain language

**Step 3: Run Analysis**
- Single "Run Analysis" button (primary action, prominent)
- Loading state: Progress indicator, disable form
- Success: Automatically navigate to Results page
- Error: Inline error message, allow retry

**Step 4: Review Results**
- Results page loads with Overview tab active
- Critical metrics visible immediately (above fold)
- Charts load below metrics
- Detailed table: Click "View Double Bookings" to see table

**Total steps: 4 clicks** (upload → configure → analyze → review)

---

### 3.2 Secondary Workflow: Investigate Double Booking

**Step 1: Identify Issue**
- User sees metric card: "12 double bookings"
- Card is clickable (subtle hover indication)

**Step 2: View Details**
- Click metric card → Filter table to show only double bookings
- Table shows: Channel, Date, Time, Spend, Matched Spot

**Step 3: Drill Down**
- Click row → Detail modal opens
- Shows: Full spot details, matched spot details, time difference
- Actions: Add note, Export, Mark reviewed

**Step 4: Take Action**
- Bulk select: Check multiple rows
- Bulk actions bar appears: Export, Add note, Mark reviewed
- Or individual: Click "Actions" dropdown on row

**Total steps: 2-3 clicks** (metric → table → detail)

---

### 3.3 Navigation Flows

**Breadcrumb pattern:**
- Only shown when drilling into details
- Format: Home > Results > Channel: RTL
- Click breadcrumb to navigate back

**Back button:**
- Browser back button works as expected
- In-app back button (if needed) appears in detail views

**Deep linking:**
- URLs support direct links to specific analyses, filters
- Share button generates shareable link
- Bookmarkable states

---

### 3.4 Error Handling Patterns

**Error prevention:**
- Validate inputs before submission
- Disable invalid actions (gray out button)
- Show helpful hints (e.g., "File must be CSV or Excel")

**Error recovery:**
- Clear error messages: "Unable to upload file. Please check file format and try again."
- Retry actions: "Retry" button next to error message
- Partial failures: Show what succeeded, what failed
- Graceful degradation: If chart fails, show table instead

**Error states:**
- Empty state: "No analyses yet. Upload a spotlist to get started."
- Loading state: Skeleton screens (not spinners)
- Error state: Icon + message + action
- Success state: Subtle confirmation (toast notification)

---

## 4. VISUAL HIERARCHY GUIDELINES

### 4.1 Typography

**Font system:**
- Primary: System font stack (San Francisco on macOS, Segoe UI on Windows)
- Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Monospace: For data/code (channel names, file paths)

**Type scale:**
- **H1 (Page title)**: 32px, 700 weight, -0.5px letter-spacing
- **H2 (Section title)**: 24px, 600 weight
- **H3 (Subsection)**: 20px, 600 weight
- **Body**: 16px, 400 weight, 1.5 line-height
- **Small**: 14px, 400 weight
- **Caption**: 12px, 400 weight, uppercase, letter-spacing

**Color hierarchy:**
- Primary text: 95% white/black (high contrast)
- Secondary text: 60% opacity (muted)
- Tertiary text: 40% opacity (subtle)
- Accent text: Accent color (blue)

---

### 4.2 Spacing

**Spacing system (8px base unit):**
- XS: 4px (tight grouping)
- S: 8px (related elements)
- M: 16px (default spacing)
- L: 24px (section separation)
- XL: 32px (major sections)
- XXL: 48px (page-level separation)

**Component spacing:**
- Card padding: 24px
- Table cell padding: 12px vertical, 16px horizontal
- Button padding: 12px vertical, 24px horizontal
- Input padding: 12px vertical, 16px horizontal

---

### 4.3 Color Emphasis

**Color palette:**
- **Background**: Dark theme (reduces eye strain)
  - Primary: #1a1a1a (near black)
  - Secondary: #2a2a2a (cards, elevated surfaces)
  - Tertiary: #3a3a3a (borders, dividers)

- **Text**: 
  - Primary: #ffffff (95% opacity)
  - Secondary: #b0b0b0 (60% opacity)
  - Tertiary: #707070 (40% opacity)

- **Accent**: 
  - Primary: #007AFF (Apple blue)
  - Success: #34C759 (green)
  - Warning: #FF9500 (orange)
  - Error: #FF3B30 (red)

**Usage:**
- Accent color: Primary actions, active states, links
- Success: Completed states, positive metrics
- Warning: Double bookings, attention needed
- Error: Failures, destructive actions

**Contrast:**
- All text meets WCAG AA (4.5:1 minimum)
- Interactive elements: Clear hover/focus states

---

### 4.4 Above the Fold

**Analyze page (default):**
```
┌─────────────────────────────────────────────────────────┐
│ [Header: Logo, Search, Settings]                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Upload Spotlist                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │     Drag and drop CSV or Excel file here         │  │
│  │     or click to browse                            │  │
│  │                                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Configuration                                          │
│  [Creative Match Mode] [Time Window] [Keywords]        │
│                                                          │
│  [Run Analysis] ← Primary action                        │
└─────────────────────────────────────────────────────────┘
```

**Results page:**
```
┌─────────────────────────────────────────────────────────┐
│ [Header]                                                 │
├─────────────────────────────────────────────────────────┤
│  Critical Metrics (4 cards)                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ €12K │ │ 12   │ │ 150  │ │ 8.2% │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│                                                          │
│  Charts (2 side-by-side)                                │
│  [Spend by Channel] [Double Bookings Over Time]          │
│                                                          │
│  [Scroll for detailed table...]                         │
└─────────────────────────────────────────────────────────┘
```

---

### 4.5 Progressive Disclosure

**Level 1: Summary (always visible)**
- Key metrics
- High-level charts
- Summary statistics

**Level 2: Details (on demand)**
- Detailed table (click "View Details")
- Filter options (click "Filter")
- Export options (click "Export")

**Level 3: Drill-down (modal/overlay)**
- Individual spot details
- Comparison view
- Advanced settings

**Progressive disclosure triggers:**
- "Show more" links (not "Show less" — collapses on scroll away)
- Tabs for different views
- Modals for detailed views
- Expandable rows in tables

---

## 5. RESPONSIVE BEHAVIOR

### 5.1 Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

---

### 5.2 Mobile (< 768px)

**Layout changes:**
- Single column layout
- Navigation: Hamburger menu (slide-out drawer)
- Metrics: Stack vertically (1 per row)
- Charts: Full width, stack vertically
- Tables: Horizontal scroll with sticky first column
- Configuration: Collapsible accordion below upload

**Touch optimizations:**
- Minimum touch target: 44x44px
- Increased spacing between interactive elements
- Swipe gestures: Swipe table rows for actions
- Pull-to-refresh: On results page

**Simplifications:**
- Hide secondary actions (show in "More" menu)
- Reduce chart complexity (fewer data points)
- Simplified filters (dropdowns instead of multi-select)

**Mobile-specific patterns:**
- Bottom sheet for filters/modals (easier thumb reach)
- Sticky action bar at bottom (primary action always accessible)
- Tab bar navigation (if multiple primary sections)

---

### 5.3 Tablet (768px - 1024px)

**Layout changes:**
- Two-column layout where appropriate
- Metrics: 2x2 grid
- Charts: Side-by-side if space allows
- Tables: Full width with all columns visible
- Configuration: Sidebar (collapsible)

**Optimizations:**
- Maintain desktop functionality
- Touch-friendly but supports mouse
- Optimized for portrait and landscape

---

### 5.4 Desktop (> 1024px)

**Layout changes:**
- Three-column layout (main content, sidebar, optional detail panel)
- Metrics: 4-column grid
- Charts: Side-by-side
- Tables: All columns visible, no horizontal scroll
- Configuration: Persistent sidebar

**Desktop-specific features:**
- Keyboard shortcuts (Cmd/Ctrl+K for search, etc.)
- Right-click context menus
- Hover states (tooltips, previews)
- Multi-select with Shift+Click, Cmd/Ctrl+Click

---

### 5.5 Component Adaptations

**Tables:**
- Mobile: Horizontal scroll, first column sticky
- Tablet: All columns visible, reduced padding
- Desktop: Full table with hover states

**Charts:**
- Mobile: Simplified (fewer data points, larger touch targets)
- Tablet: Standard charts
- Desktop: Interactive charts with hover tooltips

**Forms:**
- Mobile: Full-width inputs, stacked vertically
- Tablet: Two-column where appropriate
- Desktop: Optimal width (max 600px), centered

**Navigation:**
- Mobile: Hamburger menu
- Tablet: Horizontal tabs
- Desktop: Full horizontal navigation

---

## 6. EXAMPLE SCREEN LAYOUTS

### 6.1 Analyze Page (Default Landing)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [📺 Spotlist Checker]                    [🔍] [⚙️]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [Analyze] [Results] [History] [Configuration]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Upload Spotlist                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │          📄 Drag and drop CSV or Excel file here            │  │
│  │              or click to browse                              │  │
│  │                                                               │  │
│  │          Accepted: .csv, .xlsx (max 10MB)                    │  │
│  │                                                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [File: spotlist_company_ebay.csv] [Remove]                         │
│                                                                      │
│  Configuration                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Creative Match Mode                                          │  │
│  │ [Exact Match] [Contains Text] ← Selected                    │  │
│  │                                                               │  │
│  │ Match Text                                                    │  │
│  │ [buy                    ]                                    │  │
│  │ Both creatives must contain this text.                       │  │
│  │                                                               │  │
│  │ Time Window                                                  │  │
│  │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] │  │
│  │ 60 minutes                                                    │  │
│  │                                                               │  │
│  │ Selling Keywords                                              │  │
│  │ [verkaufen, sell          ]                                   │  │
│  │                                                               │  │
│  │ Buying Keywords                                               │  │
│  │ [kaufen, buy, shop        ]                                   │  │
│  │                                                               │  │
│  │ [Run Analysis] ← Primary button                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Results Page (Overview Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [📺 Spotlist Checker]                    [🔍] [⚙️]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [Analyze] [Results] [History] [Configuration]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Analysis: spotlist_company_ebay.csv                                │
│  Completed: Nov 30, 2025 at 2:45 PM                                │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ €125,450.00  │ │ €12,450.00   │ │ 1,250        │ │ 125      │ │
│  │ Total Spend  │ │ Double Book. │ │ Total Spots  │ │ Double   │ │
│  │              │ │ Spend        │ │              │ │ Spots    │ │
│  │              │ │ 8.2% of total│ │              │ │ 10.0%    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │
│                                                                      │
│  ┌────────────────────────────────┐ ┌────────────────────────────┐ │
│  │ Spend in Double Bookings       │ │ Double Bookings Over Time  │ │
│  │ by Channel                     │ │                            │ │
│  │                                │ │                            │ │
│  │ RTL        ████████████ €8K   │ │      ●                     │ │
│  │ SAT1       ████ €4K            │ │     ● ●                   │ │
│  │ PRO7       ██ €2K              │ │    ●   ●                  │ │
│  │                                │ │   ●     ●                 │ │
│  └────────────────────────────────┘ └────────────────────────────┘ │
│                                                                      │
│  [Overview] [Double Bookings] [Channels] [Timeline]                │
│                                                                      │
│  Double Bookings by Time Window                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Time Window │ Spots │ Spots % │ Budget    │ Budget % │       │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ Within 5 min│ 25    │ 2.0%    │ €2,500.00 │ 2.0%     │ [View]│  │
│  │ Within 15min│ 50    │ 4.0%    │ €5,000.00 │ 4.0%     │ [View]│  │
│  │ Within 30min│ 75    │ 6.0%    │ €7,500.00 │ 6.0%     │ [View]│  │
│  │ Within 60min│ 125   │ 10.0%   │ €12,450.00│ 8.2%     │ [View]│  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Export Annotated CSV] [Share Analysis]                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6.3 Results Page (Double Bookings Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [📺 Spotlist Checker]                    [🔍] [⚙️]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [Analyze] [Results] [History] [Configuration]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Overview] [Double Bookings] [Channels] [Timeline]                │
│                                                                      │
│  [☐ All] [Filter: Channel ▼] [Filter: Date ▼] [Search...]         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │[☐] Channel │ Date      │ Time  │ Spend │ Matched Spot │ ⚠️ │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │[☐] RTL     │ 2025-11-30│ 10:00 │ €500  │ RTL 10:30    │ ⚠️ │  │
│  │[☐] RTL     │ 2025-11-30│ 10:30 │ €500  │ RTL 10:00    │ ⚠️ │  │
│  │[☐] SAT1    │ 2025-11-30│ 11:00 │ €400  │ SAT1 11:15   │ ⚠️ │  │
│  │[☐] RTL     │ 2025-11-30│ 12:00 │ €600  │ RTL 12:15    │ ⚠️ │  │
│  │[☐] RTL     │ 2025-11-30│ 12:15 │ €600  │ RTL 12:00    │ ⚠️ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Showing 5 of 125 double bookings                                  │
│  [← Previous] [1] [2] [3] ... [13] [Next →]                       │
│                                                                      │
│  [3 spots selected] [Export Selected] [Add Note] [Mark Reviewed]   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6.4 History Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ [📺 Spotlist Checker]                    [🔍] [⚙️]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [Analyze] [Results] [History] [Configuration]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Analysis History                                                   │
│                                                                      │
│  [Filter: Date range ▼] [Filter: File name ▼] [Search...]          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ File Name              │ Date       │ Spots │ Double │ Spend│  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ spotlist_company_ebay  │ Nov 30, 25 │ 1,250 │ 125    │ €125K│  │
│  │                        │ 2:45 PM    │       │ (10%)  │      │  │
│  │                        │            │       │        │      │  │
│  │                        │ [View] [Export] [Delete]          │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ test_spotlist.csv      │ Nov 29, 25 │ 6     │ 2      │ €3K  │  │
│  │                        │ 10:15 AM   │       │ (33%)  │      │  │
│  │                        │            │       │        │      │  │
│  │                        │ [View] [Export] [Delete]          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6.5 Configuration Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ [📺 Spotlist Checker]                    [🔍] [⚙️]                 │
├─────────────────────────────────────────────────────────────────────┤
│ [Analyze] [Results] [History] [Configuration]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Default Analysis Settings                                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Creative Match Mode                                          │  │
│  │ [Exact Match] [Contains Text] ← Selected                    │  │
│  │                                                               │  │
│  │ Default Match Text                                            │  │
│  │ [buy                    ]                                    │  │
│  │                                                               │  │
│  │ Default Time Window                                           │  │
│  │ [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] │  │
│  │ 60 minutes                                                    │  │
│  │                                                               │  │
│  │ Default Selling Keywords                                      │  │
│  │ [verkaufen, sell          ]                                   │  │
│  │                                                               │  │
│  │ Default Buying Keywords                                       │  │
│  │ [kaufen, buy, shop        ]                                   │  │
│  │                                                               │  │
│  │ [Save as Default]                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Saved Presets                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [Standard Analysis] [Strict Analysis] [Quick Check]           │  │
│  │                                                               │  │
│  │ [Create New Preset]                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. ACCESSIBILITY AND NON-TECHNICAL USABILITY

### 7.1 Keyboard Navigation

**Tab order:**
- Logical flow: Top to bottom, left to right
- Skip links: Jump to main content
- Focus indicators: Clear outline (2px, accent color)

**Keyboard shortcuts:**
- `Cmd/Ctrl + K`: Open search
- `Esc`: Close modal/overlay
- `Enter`: Submit form, activate button
- `Arrow keys`: Navigate tables, dropdowns
- `Space`: Toggle checkbox, scroll

---

### 7.2 Screen Reader Support

**ARIA labels:**
- All interactive elements have descriptive labels
- Tables: Row and column headers properly marked
- Buttons: Descriptive text ("Delete analysis" not "Delete")
- Forms: Error messages associated with inputs

**Semantic HTML:**
- Use proper heading hierarchy (h1 → h2 → h3)
- Lists: Use `<ul>`, `<ol>` for lists
- Landmarks: `<nav>`, `<main>`, `<aside>`, `<footer>`

---

### 7.3 Error Prevention

**Input validation:**
- Real-time validation (not just on submit)
- Clear error messages ("File must be CSV or Excel" not "Invalid file")
- Prevent invalid submissions (disable button)

**Confirmation for destructive actions:**
- "Delete analysis?" modal with explanation
- Undo option (if possible) for 5 seconds after action

**Help and guidance:**
- Tooltips for complex settings
- Help text below inputs
- "Learn more" links to documentation
- Empty states with guidance

---

### 7.4 Performance

**Loading states:**
- Skeleton screens (not spinners) for better perceived performance
- Progressive loading: Show metrics first, then charts, then table
- Optimistic updates: Show success immediately, sync in background

**Optimizations:**
- Lazy load charts (load when visible)
- Virtual scrolling for large tables (>100 rows)
- Debounce search/filter inputs (300ms delay)

---

## 8. IMPLEMENTATION NOTES

### 8.1 Design System

**Component library:**
- Build reusable components (Button, Input, Table, Card, etc.)
- Consistent spacing, typography, colors
- Theme support (dark mode default, light mode optional)

**State management:**
- Centralized state for analysis results
- URL state for filters, current page (shareable/bookmarkable)
- Local storage for user preferences, saved presets

---

### 8.2 Technical Considerations

**Data handling:**
- Client-side filtering/sorting for tables (<1000 rows)
- Server-side pagination for large datasets
- Optimistic updates with rollback on error

**File handling:**
- Client-side CSV parsing (for preview)
- Server-side validation and processing
- Progress indicators for large file uploads

**Charts:**
- Use lightweight charting library (Chart.js, Recharts)
- Responsive charts (resize on window resize)
- Accessible charts (ARIA labels, keyboard navigation)

---

## 9. SUCCESS METRICS

**Usability goals:**
- **Task completion**: 95% of users complete analysis in < 2 minutes
- **Error rate**: < 5% of analyses fail due to user error
- **Learnability**: New users complete first analysis without help
- **Efficiency**: Experienced users complete analysis in < 30 seconds

**Design goals:**
- **Cognitive load**: Users can understand interface without training
- **Clarity**: All actions are discoverable and clear
- **Efficiency**: Common tasks require < 3 clicks
- **Satisfaction**: Users prefer this dashboard over previous versions

---

## 10. ITERATION PLAN

**Phase 1: Core functionality**
- Upload and analyze
- Basic results view
- Export functionality

**Phase 2: Enhanced features**
- History page
- Advanced filtering
- Saved presets

**Phase 3: Polish**
- Animations and transitions
- Performance optimizations
- Accessibility refinements

**Phase 4: Advanced features**
- Comparison view (compare two analyses)
- Scheduled analyses
- Email notifications

---

**End of Specification**

This specification serves as the foundation for building an administrative dashboard that prioritizes clarity, efficiency, and human-centered design. Every component and interaction should be evaluated against the core principle: "Does this reduce cognitive load and enable action?"


