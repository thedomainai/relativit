# UI References Guide

## How to Add UI References

### Location 1: Project-wide References
**File**: `knowledge/domain/ui-references.json`

Use this for UI patterns that apply across multiple features or the entire project.

### Location 2: Story-specific References
**File**: Individual user story JSON files in `requirements/raw/user-stories/`

Use this when a reference is specific to one user story or feature.

---

## Method 1: Project-wide UI Reference

Add to `knowledge/domain/ui-references.json`:

```json
{
  "references": [
    {
      "id": "UI-REF-001",
      "name": "Notion - Hierarchical Page Tree",
      "url": "https://notion.so",
      "category": "navigation",
      "reference_points": [
        "Collapsible sidebar tree structure",
        "Drag-and-drop page organization",
        "Inline page creation",
        "Breadcrumb navigation at top"
      ],
      "screenshots": [
        {
          "url": "path/to/screenshot.png",
          "description": "Notion's left sidebar showing page hierarchy",
          "highlights": [
            "Smooth expand/collapse animation",
            "Visual depth indication with indentation",
            "Icon and emoji support for pages"
          ]
        }
      ],
      "notes": "Excellent example of intuitive hierarchy navigation. Note the subtle hover states and keyboard shortcuts.",
      "pros": [
        "Very intuitive drag-and-drop",
        "Clean visual design",
        "Fast keyboard navigation"
      ],
      "cons": [
        "Can become cluttered with many pages",
        "Mobile experience needs adaptation"
      ],
      "relevant_to": ["sidebar-navigation", "issue-tree", "content-organization"],
      "tags": ["tree-view", "navigation", "hierarchy", "drag-drop"],
      "related_user_stories": ["US-RELATIVITY-001"],
      "implementation_complexity": "complex",
      "priority": "must-have",
      "metadata": {
        "added_at": "2025-12-17T10:00:00Z",
        "added_by": "product_team"
      }
    }
  ]
}
```

---

## Method 2: Add to User Story

In your user story JSON (e.g., `US-RELATIVITY-001.json`), add a `ui_references` field:

```json
{
  "id": "US-RELATIVITY-001",
  "title": "...",
  "as_a": "...",
  "i_want": "...",
  "so_that": "...",

  "ui_references": [
    {
      "name": "Obsidian - Graph View",
      "url": "https://obsidian.md",
      "reference_points": [
        "Interactive node-based visualization",
        "Real-time graph updates",
        "Zoom and pan interactions",
        "Node clustering and filtering"
      ],
      "screenshots": [
        {
          "url": "https://obsidian.md/images/screenshot.png",
          "description": "Obsidian's graph view showing interconnected notes"
        }
      ],
      "what_to_adopt": "The smooth interaction model and visual clarity of connections",
      "notes": "This is a great reference for our Issue Tree visualization. Focus on the node interaction patterns."
    },
    {
      "name": "Linear - Issue Tree",
      "url": "https://linear.app/features/issues",
      "reference_points": [
        "Clean, minimal tree structure",
        "Current item highlighting",
        "Keyboard navigation shortcuts",
        "Status indicators on nodes"
      ],
      "what_to_adopt": "The 'NOW' badge concept and keyboard shortcuts"
    }
  ],

  "acceptance_criteria": [...]
}
```

---

## Quick Add Template

### Template for `ui-references.json`:

```json
{
  "id": "UI-REF-XXX",
  "name": "Website/App Name - Feature",
  "url": "https://example.com",
  "category": "navigation|data-visualization|forms|layouts|interactions|components",
  "reference_points": [
    "Specific aspect 1",
    "Specific aspect 2",
    "Specific aspect 3"
  ],
  "screenshots": [
    {
      "url": "path or URL",
      "description": "What this shows"
    }
  ],
  "notes": "Why this is a good reference",
  "pros": ["Advantage 1", "Advantage 2"],
  "cons": ["Limitation 1"],
  "relevant_to": ["feature-1", "component-2"],
  "tags": ["tag1", "tag2"],
  "related_user_stories": ["US-XXX"],
  "implementation_complexity": "simple|moderate|complex|very-complex",
  "priority": "must-have|should-have|nice-to-have"
}
```

---

## Examples

### Example 1: Navigation Pattern

```json
{
  "id": "UI-REF-002",
  "name": "GitHub - File Tree Navigation",
  "url": "https://github.com",
  "category": "navigation",
  "reference_points": [
    "File tree with folder collapse/expand",
    "File icons by type",
    "Breadcrumb navigation",
    "Quick file finder (press 't' key)"
  ],
  "notes": "Simple, fast, keyboard-friendly navigation",
  "relevant_to": ["file-explorer", "project-structure"],
  "tags": ["file-tree", "keyboard-shortcuts"],
  "implementation_complexity": "moderate",
  "priority": "should-have"
}
```

### Example 2: Data Visualization

```json
{
  "id": "UI-REF-003",
  "name": "D3.js Examples - Force-Directed Graph",
  "url": "https://observablehq.com/@d3/force-directed-graph",
  "category": "data-visualization",
  "reference_points": [
    "Physics-based node positioning",
    "Interactive dragging of nodes",
    "Link strength visualization",
    "Zoom and pan controls"
  ],
  "interactive_demo": "https://observablehq.com/@d3/force-directed-graph",
  "notes": "Technical reference for graph rendering algorithm",
  "relevant_to": ["issue-tree-visualization"],
  "tags": ["graph", "d3js", "visualization"],
  "implementation_complexity": "very-complex",
  "priority": "nice-to-have"
}
```

---

## Categories

- **navigation**: Menus, sidebars, breadcrumbs, trees
- **data-visualization**: Charts, graphs, diagrams
- **forms**: Input fields, validation, multi-step forms
- **layouts**: Page structure, grids, responsive design
- **interactions**: Animations, hover effects, transitions
- **components**: Buttons, cards, modals, tooltips
- **animations**: Motion design, loading states
- **typography**: Text hierarchy, readability
- **color-scheme**: Color palettes, themes

---

## When to Use Each Method

| Scenario | Use Method |
|----------|------------|
| General design system inspiration | Project-wide (`ui-references.json`) |
| Specific to one user story/feature | User story `ui_references` field |
| Applies to multiple features | Project-wide |
| Detailed mockup/prototype | User story + link to Figma |
| Pattern library reference | Project-wide |

---

## AI Agent Processing

When you add UI references:

1. **Project-wide**: AI reads `knowledge/domain/ui-references.json` when generating UI specs
2. **Story-specific**: AI includes references when processing that user story
3. **Spec Generation**: References are linked to generated UI/UX specifications in `specs/ui-ux/`
4. **Code Generation**: AI considers reference patterns when generating components

---

## Tips

✅ **DO:**
- Be specific about what to reference (not just "look at this site")
- Include screenshots or screen recordings
- Note specific interaction patterns
- Link to live demos when possible
- Update as you discover better examples

❌ **DON'T:**
- Just paste a URL without context
- Reference entire websites without specifics
- Copy designs without understanding why they work
- Ignore accessibility considerations from references
