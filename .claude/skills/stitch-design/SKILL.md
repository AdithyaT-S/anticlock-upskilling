# Skill: stitch-design

How to use the Stitch MCP when building any frontend page or component.
Always read this before implementing any UI.

## Stitch Project Reference

Project: "Indigo B2B CRM Dashboard"
Project ID: `10851584638320860726`

| Screen | ID |
|--------|----|
| Design System | `asset-stub-assets_0c364825aa6640ddb1dd32c3ab87ab81` |
| CRM Sales Dashboard | `e960e51133dd4a189eec69ab8a3c317c` |
| CRM Contacts List | `c744ca79a3b14fb49ca284b552f1c7f0` |
| CRM Contact Detail | `b2ac0c027cd748b19c899e117c670912` |
| CRM Deals Pipeline | `49d332b5a2dd4dc4a424a77f4fa75cfe` |
| CRM Support Tickets | `fbfaee3f845f4b8596df70cce1f169ae` |
| CRM Leads List & Detail | `219d7f6e5ccb4e80864c3ec66dc0743a` |
| CRM Reports Dashboard | `0a01fa82d8544dd99680ec001f253fb3` |

## How to fetch a screen before building

Before writing any UI code, call the Stitch MCP to get the screen:

```
Use the stitch MCP tool get_screen with:
  project_id: "10851584638320860726"
  screen_id: "<screen id from table above>"
```

Then implement the UI to match — layout, spacing, colors, component names.

## Design System (always fetch first for any new component)

Always fetch the Design System screen before building new shared components.
It defines: color tokens, typography scale, spacing, button variants, badge styles.

## Rules

- Always fetch the relevant Stitch screen before writing a page or component
- Match layout exactly — don't approximate
- Color: Indigo `#4F46E5` primary, `gray-50` background, white surfaces
- Font: Inter (all weights via Tailwind `font-sans`)
- Component names in code must match Stitch: `DataTable`, `KanbanCard`, `StatusBadge`, `ActivityTimeline`
- If a screen exists in Stitch for this feature — use it. Never design from scratch.
- For Auth pages (no Stitch screen): use shadcn Card, centered layout, `max-w-md mx-auto mt-24`
