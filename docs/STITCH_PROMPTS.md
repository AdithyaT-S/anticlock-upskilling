# Google Stitch Design Prompts
# FreshCRM — 7 Screens

Go to stitch.withgoogle.com and paste each prompt one at a time.
Export each screen to Figma before moving to the next.

---

## Screen 1 — Dashboard

```
CRM dashboard for a B2B sales team. Left sidebar nav with icons for
Dashboard, Contacts, Leads, Deals, Tickets, Reports, Settings.
Top bar with search, notifications, avatar. Main area shows:
4 KPI cards (Total Contacts, Open Deals, Revenue This Month, Tickets),
a deals pipeline Kanban preview (5 columns), recent activity feed.
Color: Indigo primary (#4F46E5), white surfaces, gray-50 background.
Font: Inter. Style: clean SaaS, similar to Freshworks or Linear.
```

---

## Screen 2 — Contacts List

```
CRM contacts list page. Table with columns: Avatar+Name, Email, Company,
Owner, Lead Source, Last Activity, Tags. Row hover shows quick actions.
Top toolbar: search input, filter dropdown, import CSV button, New Contact
button (indigo). Pagination at bottom. Same sidebar and topbar as dashboard.
```

---

## Screen 3 — Contact Detail

```
CRM contact detail page. Left column (60%): activity timeline showing
calls, emails, notes, tasks with timestamps and icons. Right column (40%):
contact info card (name, email, phone, company, owner), deals associated,
tags, custom fields. Tab bar: Activity | Details | Emails | Files.
Same sidebar and topbar as dashboard. Color: Indigo #4F46E5, Inter font.
```

---

## Screen 4 — Deals Kanban

```
CRM deals pipeline. Pipeline selector dropdown at top. Full-width Kanban
board with 5 columns: New, Qualified, Proposal, Negotiation, Closed Won.
Each card shows deal name, company, value badge, owner avatar, close date.
Drag handle visible on hover. Column header shows deal count and total value.
Add deal button per column. Same sidebar and topbar as dashboard.
Color: Indigo #4F46E5, Inter font.
```

---

## Screen 5 — Tickets Inbox

```
CRM support tickets page. Left panel: list of tickets with status badge
(Open/Pending/Resolved), priority dot, subject, requester, assignee, SLA timer.
Right panel: ticket detail with email thread view, reply composer, sidebar
with ticket metadata. Filter by status/priority/assignee at top.
Same sidebar and topbar as dashboard. Color: Indigo #4F46E5, Inter font.
```

---

## Screen 6 — Leads

```
CRM leads list page. Table with columns: Avatar+Name, Company, Status badge
(New/Contacted/Qualified/Lost), Lead Score (number with color indicator),
Lead Source, Owner, Last Activity, Converted date. Top toolbar: search input,
filter by status dropdown, filter by owner dropdown, New Lead button (indigo).
Row click opens lead detail side panel (60% width): contact info, status
dropdown, score editor, activity timeline, Convert to Deal button.
Same sidebar and topbar as dashboard. Color: Indigo #4F46E5, Inter font.
```

---

## Screen 7 — Reports

```
CRM reports dashboard. Top row: date range picker + pipeline selector filter.
5 report cards in a 2-column grid:
1. Total Contacts over time — line chart
2. Open Deals by Stage — horizontal bar chart (funnel shape)
3. Revenue This Month vs Last Month — bar chart with delta badge
4. Tickets by Status — donut chart (Open/Pending/Resolved/Closed)
5. Activities Completed by Owner — stacked bar chart per team member.
Each card has a title, metric summary, and chart. Export CSV button per card.
Same sidebar and topbar as dashboard. Color: Indigo #4F46E5, Inter font.
```

---

## After Stitch — Figma Setup

1. Export all 7 screens → "Export to Figma"
2. In Figma, apply design system:
   - Color variable: `--color-primary: #4F46E5`
   - Font: Inter (all weights)
   - Name components to match code: `DataTable`, `KanbanCard`, `StatusBadge`, `ActivityTimeline`, `CrudForm`
3. Enable Dev Mode: Figma menu → Preferences → Enable Dev Mode MCP Server
4. Connect to Claude Code:
   ```bash
   claude mcp add figma
   ```
5. Verify connection — run `/mcp` in Claude Code, `figma` must appear as connected
