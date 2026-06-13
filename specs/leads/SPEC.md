# Leads Module — SPEC.md

## 1. What This Module Does

The Leads module manages the top of the sales funnel in FreshCRM. Every lead is linked to an existing contact and carries qualification metadata: status (New → Contacted → Qualified → Lost), a 0–100 integer score, lead source, owner, and free-form notes. Sales reps see a paginated, filterable list of leads; clicking a row opens a slide-over detail panel showing contact info, score, and a tabbed activity timeline. Managers filter by status and owner to monitor pipeline health. When a lead is ready, reps click "Convert to Deal" which stamps `converted_at` on the lead and navigates to deal creation pre-filled with the contact and source. Converted leads are immutable.

---

## 2. Routes

| Path | Page | Access |
|------|------|--------|
| `/leads` | Leads list + slide-over detail panel | Authenticated (all roles) |
| `/leads/new` | Create lead form — contact picker + lead fields | Authenticated (admin, member) |
| `/leads/[id]/edit` | Edit lead form | Authenticated (admin, member) |

The detail panel opens as a slide-over on `/leads` (no separate route). The selected lead id is tracked in query params (`?id=[id]`) so the panel state survives a refresh.

---

## 3. Pages & Components

### `/leads` — Leads List + Slide-Over Detail Panel

- `PageHeader` — title "Leads", right slot: "Add Lead" button (primary indigo)
- Filter bar:
  - Status dropdown — All / New / Contacted / Qualified / Lost
  - Owner dropdown — All / Me / [all org members by name]
- `DataTable` — columns: Name & Company, Status, Score, Source, Owner, Last Activity, Actions
  - **Name & Company** — initials badge (indigo-100/indigo-700) + bold full name + gray company below
  - **Status** — `StatusBadge` — New: blue, Contacted: yellow, Qualified: green, Lost: red
  - **Score** — integer 0–100; ≥70 green bold, 40–69 yellow bold, <40 red bold
  - **Source** — plain text
  - **Owner** — avatar thumbnail + full name
  - **Last Activity** — relative timestamp ("2 hours ago"); blank if no activities
  - **Actions** — `more_vert` icon menu: Edit → `/leads/[id]/edit`, Delete → `ConfirmDialog`
- Row click → opens slide-over detail panel from the right
- `EmptyState` when no leads match filters
- Pagination — "Showing X–Y of Z" with Prev/Next controls (50 per page)

### Detail Panel (slide-over, `w-96 border-l bg-white shadow-xl`)

- Header: close button (X), initials badge, full name, `StatusBadge`, company
- Inline status dropdown — updates lead status immediately (optimistic UI)
- "Convert to Deal" button (`bg-green-600`) — disabled + greyed out when `converted_at` is set
- **Contact Info section**: email with mailto link + mail icon, phone with tel link + call icon, LinkedIn placeholder with external-link icon
- **Score section**: large numeric score + label (`HIGH POTENTIAL` / `MEDIUM` / `LOW`) + description "Based on activity, budget, and authority"
- **Activity Timeline** — tabbed: All / Calls / Emails
  - `ActivityTimeline` component — activities linked to the lead's contact, newest first
  - "Add Note" + "Schedule Task" quick-action buttons below timeline

### `/leads/new` — Create Lead

- `PageHeader` — title "New Lead", back link → `/leads`
- `CrudForm` with fields:
  - Contact (required) — searchable combobox (`OwnerSelect`-pattern) for contacts in the org
  - Status — select, default `new`
  - Score — number input 0–100, default 0
  - Source — select (LEAD_SOURCES enum), optional
  - Owner — `OwnerSelect`, optional
  - Notes — textarea max 5000 chars, optional
- Submit → creates lead → redirects to `/leads?id=[new-lead-id]` (opens detail panel)

### `/leads/[id]/edit` — Edit Lead

- `PageHeader` — title "Edit Lead", back link → `/leads`
- `CrudForm` pre-filled; Contact field shown as read-only text (cannot change linked contact)
- Submit → updates lead → redirects to `/leads?id=[id]`

### Shared loading/error boundaries

- `src/app/(dashboard)/leads/loading.tsx` — skeleton table (5 rows, 7 cols)
- `src/app/(dashboard)/leads/error.tsx` — error boundary with retry button

---

## 4. Files to Create

```
specs/leads/SPEC.md                                           ← this file

src/lib/validations/lead.ts                                  ← Zod schemas
src/lib/actions/leads.ts                                     ← server actions

src/app/(dashboard)/leads/page.tsx                           ← list page (server component)
src/app/(dashboard)/leads/columns.tsx                        ← TanStack column defs
src/app/(dashboard)/leads/loading.tsx                        ← skeleton
src/app/(dashboard)/leads/error.tsx                          ← error boundary
src/app/(dashboard)/leads/new/page.tsx                       ← create form page
src/app/(dashboard)/leads/[id]/edit/page.tsx                 ← edit form page

src/app/(dashboard)/leads/_components/LeadsClient.tsx        ← list + filter + panel orchestrator
src/app/(dashboard)/leads/_components/LeadDetailPanel.tsx    ← slide-over detail panel
src/app/(dashboard)/leads/_components/LeadForm.tsx           ← shared create/edit form

src/app/(dashboard)/leads/__tests__/lead.unit.test.ts        ← Vitest unit tests
src/app/(dashboard)/leads/__tests__/lead.e2e.ts              ← Playwright E2E tests
```

---

## 5. Zod Schemas

### `leadSchema` — create + edit

```typescript
import { z } from 'zod'

const LEAD_DB_STATUSES = ['new', 'contacted', 'qualified', 'lost'] as const
const LEAD_SOURCE_VALUES = [
  'Website', 'Referral', 'Cold Call',
  'Email Campaign', 'Social Media', 'Event', 'Other'
] as const

export const leadSchema = z.object({
  contact_id : z.string().uuid('Contact is required'),
  status     : z.enum(LEAD_DB_STATUSES).default('new'),
  score      : z.coerce.number().int().min(0, 'Score must be between 0 and 100').max(100, 'Score must be between 0 and 100').default(0),
  source     : z.enum(LEAD_SOURCE_VALUES).optional(),
  owner_id   : z.string().uuid().optional(),
  notes      : z.string().max(5000).optional(),
})

export type LeadInput = z.infer<typeof leadSchema>
```

### `leadUpdateSchema` — edit (contact_id excluded)

```typescript
export const leadUpdateSchema = leadSchema.omit({ contact_id: true })
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>
```

### `leadSearchSchema` — list query params

```typescript
export const leadSearchSchema = z.object({
  status   : z.enum(LEAD_DB_STATUSES).optional(),
  owner_id : z.string().uuid().optional(),
  page     : z.coerce.number().int().min(1).default(1),
  per_page : z.coerce.number().int().min(1).max(100).default(50),
})
```

### `leadStatusUpdateSchema` — inline status update from detail panel

```typescript
export const leadStatusUpdateSchema = z.object({
  status: z.enum(LEAD_DB_STATUSES),
})
```

---

## 6. Server Actions

All actions in `src/lib/actions/leads.ts`. Every action:
1. `const user = await getAuthUser()` — throws if unauthenticated
2. Validates input with Zod — throws `ZodError` on failure
3. Queries via `queryForOrg(user.orgId, sql, params)`

### `getLeads(params)`
1. `getAuthUser()` — any role
2. Parse `params` with `leadSearchSchema`
3. SELECT leads JOIN contacts (name, company, email, phone) JOIN users AS owner
   WHERE `leads.org_id = $1`
   - If `status`: add `leads.status = $n`
   - If `owner_id`: add `leads.owner_id = $n`
4. SELECT MAX(activities.created_at) per contact for "Last Activity" calculation
5. ORDER BY `leads.created_at DESC` LIMIT/OFFSET
6. Return `{ leads, total, page, per_page }`

### `getLead(id)`
1. `getAuthUser()` — any role
2. SELECT lead JOIN contact JOIN owner WHERE `leads.id = $1 AND leads.org_id = $2`
3. If not found → throw `NotFoundError`
4. SELECT activities WHERE `contact_id = lead.contact_id` ORDER BY `created_at DESC`
5. Return `{ lead, activities }`

### `createLead(data)`
1. `getAuthUser()` — role must be `admin` or `member`; viewer → throw 403
2. Validate `data` with `leadSchema`
3. SELECT contact WHERE `id = $contact_id AND org_id = $org_id` — throw `NotFoundError` if absent
4. If `owner_id` provided: SELECT user WHERE `id = $owner_id AND org_id = $org_id` — throw 400 if absent
5. SELECT COUNT from leads WHERE `contact_id = $1 AND org_id = $2 AND converted_at IS NULL` — if ≥ 1 → throw `DuplicateLeadError`
6. INSERT into leads; return created lead (joined with contact)

### `updateLead(id, data)`
1. `getAuthUser()` — role must be `admin` or `member`
2. Validate `data` with `leadUpdateSchema`
3. SELECT lead WHERE `id = $1 AND org_id = $2` — throw `NotFoundError` if absent
4. If `lead.converted_at IS NOT NULL` → throw `ConvertedLeadError`
5. If `owner_id` provided: verify it belongs to same org
6. UPDATE leads SET ... WHERE `id = $1 AND org_id = $2`
7. Return updated lead

### `updateLeadStatus(id, status)`
1. `getAuthUser()` — role must be `admin` or `member`
2. Validate `{ status }` with `leadStatusUpdateSchema`
3. SELECT + verify lead belongs to org and is not converted
4. UPDATE leads SET `status = $1` WHERE `id = $2 AND org_id = $3`
5. Return updated lead

### `deleteLead(id)`
1. `getAuthUser()` — role must be `admin` or `member`
2. SELECT lead to verify it belongs to org — throw `NotFoundError` if absent
3. DELETE FROM leads WHERE `id = $1 AND org_id = $2` (hard delete)
4. Return `{ success: true }`

### `convertLeadToDeal(id)`
1. `getAuthUser()` — role must be `admin` or `member`
2. SELECT lead WHERE `id = $1 AND org_id = $2` — throw `NotFoundError` if absent
3. If `lead.converted_at IS NOT NULL` → throw `AlreadyConvertedError`
4. UPDATE leads SET `converted_at = now()` WHERE `id = $1 AND org_id = $2`
5. Return `{ success: true, contactId: lead.contact_id, source: lead.source }`
   — caller redirects to `/deals/new?contact_id=...&source=...`

---

## 7. User Stories

| # | Story |
|---|-------|
| US-01 | As a Sales Rep, I want to see all leads with their status and score so that I can prioritize who to follow up with next. |
| US-02 | As a Sales Rep, I want to create a lead from an existing contact so that I can start tracking it through the sales funnel. |
| US-03 | As a Sales Rep, I want to view a lead's detail panel with contact info and activity history so that I am prepared for the next interaction. |
| US-04 | As a Sales Rep, I want to update a lead's status inline so that the pipeline reflects the latest state without leaving the list. |
| US-05 | As a Sales Rep, I want to convert a qualified lead into a deal so that it moves into the Deals pipeline. |
| US-06 | As a Sales Rep, I want to edit a lead's score, source, owner, and notes so that the record stays current. |
| US-07 | As a Sales Rep, I want to delete a lead that was created in error so that my list stays accurate. |
| US-08 | As a Manager, I want to filter leads by status so that I can review where prospects are in the funnel. |
| US-09 | As a Manager, I want to filter leads by owner so that I can monitor each rep's pipeline health. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-01 | I am authenticated and navigate to `/leads` | The page loads | I see a table with columns: Name & Company, Status, Score, Source, Owner, Last Activity, Actions — sorted by created_at descending, 50 rows per page |
| AC-02 | I am on the leads list | I select "Qualified" from the Status filter | Only leads with status = 'qualified' appear in the table |
| AC-03 | I am on the leads list | I select an owner from the Owner filter | Only leads assigned to that owner appear |
| AC-04 | I am on the leads list | I click a lead row | A detail panel slides in from the right showing the lead's contact info, score, status badge, and activity timeline |
| AC-05 | I am viewing the detail panel | I change the status dropdown | The lead's status is updated immediately and the badge reflects the new value without a full page reload |
| AC-06 | I am viewing the detail panel and `converted_at` is set on the lead | The panel renders | The "Convert to Deal" button is disabled and visually greyed out |
| AC-07 | I am viewing the detail panel for an unconverted lead | I click "Convert to Deal" | `converted_at` is stamped on the lead and I am navigated to `/deals/new` with contact_id and source pre-filled |
| AC-08 | I am on the leads list | I click "Add Lead" | I am navigated to `/leads/new` |
| AC-09 | I am on the create form | I submit with a valid contact selected and status = 'new' | A lead is created and I am redirected to `/leads?id=[new-id]` with the detail panel open |
| AC-10 | I am on the create form | I submit without selecting a contact | I see a field-level validation error "Contact is required" |
| AC-11 | I am on the create form | I enter a score of 150 | I see a validation error "Score must be between 0 and 100" |
| AC-12 | I am on the create form | I select a contact that already has an active lead in this org | I see "This contact already has an active lead" |
| AC-13 | I click "Edit" from the detail panel actions | The edit form loads | All current lead fields are pre-filled; the Contact field is shown read-only |
| AC-14 | I edit a lead's score and save | The form submits successfully | I am redirected to `/leads?id=[id]` and the table and panel show the updated score |
| AC-15 | I click "Delete" from the actions menu and confirm in the dialog | The deletion completes | The lead is permanently removed and no longer appears in the table |
| AC-16 | The leads list has more than 50 leads | I click "Next" | The next page of 50 leads loads and the previous rows are no longer visible |
| AC-17 | I am viewing the detail panel activity timeline | Activities exist on the linked contact | I see entries for calls, emails, notes, tasks, meetings sorted newest first |

---

## 9. Permissions Matrix

| Action | Admin | Member | Viewer |
|--------|-------|--------|--------|
| View leads list | ✅ | ✅ | ✅ |
| View lead detail panel | ✅ | ✅ | ✅ |
| Create lead | ✅ | ✅ | ❌ |
| Edit lead (own) | ✅ | ✅ | ❌ |
| Edit lead (any) | ✅ | ✅ | ❌ |
| Update status inline | ✅ | ✅ | ❌ |
| Delete lead | ✅ | ✅ | ❌ |
| Convert to Deal | ✅ | ✅ | ❌ |

> Role is checked in every server action via `getAuthUser()`. Viewer role receives a 403 on any mutation attempt.

---

## 10. Business Rules

| ID | Rule |
|----|------|
| BR-01 | A lead must be linked to a contact. `contact_id` is required on creation and is immutable after creation. |
| BR-02 | A contact may have at most one active (non-converted) lead per org. Creating a second active lead for the same contact returns a `DuplicateLeadError`. |
| BR-03 | Lead score must be an integer between 0 and 100 inclusive. |
| BR-04 | Once `converted_at` is set, the lead is immutable — `updateLead` and `updateLeadStatus` throw `ConvertedLeadError`. |
| BR-05 | Lead deletion is hard (permanent). Leads have no `deleted_at` column. |
| BR-06 | `owner_id` must reference a user in the same org. Cross-org assignment returns a 400. |
| BR-07 | "Convert to Deal" stamps `converted_at = now()` on the lead and returns `contactId` + `source`. The deal itself is created by the Deals module; this action does not create the deal. |
| BR-08 | Score display labels: ≥ 70 → "HIGH POTENTIAL", 40–69 → "MEDIUM", 0–39 → "LOW". |
| BR-09 | Pagination is page-based (LIMIT/OFFSET). Default page size is 50; max is 100. |
| BR-10 | The activity timeline shows activities linked to the lead's `contact_id` (activities table does not have a `lead_id` column). |

---

## 11. Error Cases

| Scenario | HTTP Equivalent | User-Facing Message |
|----------|----------------|---------------------|
| Lead not found | 404 | Redirect to `/leads` + toast "Lead not found" |
| Contact not in same org | 400 | Inline form error: "Selected contact does not exist in this organisation" |
| Contact already has active lead | 422 | Inline form error: "This contact already has an active lead" |
| Owner not in same org | 400 | Inline form error: "Selected owner is not a member of this organisation" |
| Score out of range | 422 | Inline form error: "Score must be between 0 and 100" |
| Editing a converted lead | 403 | Toast: "This lead has been converted and cannot be edited" |
| Converting an already-converted lead | 409 | Toast: "This lead has already been converted to a deal" |
| Unauthenticated request | 401 | Redirect to `/login` |
| Viewer role attempts mutation | 403 | Toast: "You don't have permission to do that" |
| Unexpected server error | 500 | Toast: "Something went wrong — please try again" |

---

## 12. Design Reference

| Screen | Stitch ID |
|--------|-----------|
| CRM Leads List & Detail | `219d7f6e5ccb4e80864c3ec66dc0743a` |

**Design tokens:**
- Primary: Indigo `#4F46E5`
- Background: `gray-50`
- Surface: white with `rounded-lg shadow-sm`
- Font: Inter (`font-sans`)
- Table header: `text-xs font-medium text-gray-500 uppercase tracking-wider`
- Name cell: initials badge `bg-indigo-100 text-indigo-700 rounded-full w-8 h-8 text-sm font-medium`; bold full name; `text-sm text-gray-500` company
- Status badge colors — New: `bg-blue-100 text-blue-700`, Contacted: `bg-yellow-100 text-yellow-700`, Qualified: `bg-green-100 text-green-700`, Lost: `bg-red-100 text-red-700`
- Score colors — ≥70: `text-green-600 font-semibold`, 40–69: `text-yellow-600 font-semibold`, <40: `text-red-600 font-semibold`
- "Add Lead" CTA: `bg-indigo-600 hover:bg-indigo-700 text-white`
- Detail panel: slide-over `fixed inset-y-0 right-0 w-96 border-l bg-white shadow-xl z-50`
- "Convert to Deal" button: `bg-green-600 hover:bg-green-700 text-white`; when disabled: `opacity-50 cursor-not-allowed`

---

## 13. Unit Test Cases

| Test | Covers |
|------|--------|
| `leadSchema` rejects missing `contact_id` | AC-10 |
| `leadSchema` rejects score > 100 | AC-11, BR-03 |
| `leadSchema` rejects score < 0 | AC-11, BR-03 |
| `leadSchema` coerces string score "85" to number 85 | BR-03 |
| `leadSchema` accepts optional source, owner_id, notes | schema permissiveness |
| `leadSearchSchema` coerces `page` string to number | BR-09 |
| `createLead` returns `DuplicateLeadError` when contact has active lead | AC-12, BR-02 |
| `createLead` rejects `contact_id` from different org | BR-01 |
| `createLead` rejects `owner_id` from different org | BR-06 |
| `updateLead` throws `ConvertedLeadError` for converted lead | BR-04, AC-06 |
| `updateLeadStatus` updates only the status column | AC-05 |
| `updateLeadStatus` throws `ConvertedLeadError` for converted lead | BR-04 |
| `deleteLead` permanently removes the lead row | BR-05 |
| `convertLeadToDeal` sets `converted_at` and returns contactId + source | AC-07, BR-07 |
| `convertLeadToDeal` throws `AlreadyConvertedError` when already converted | AC-06, BR-04 |
| `getLeads` filters by status correctly | AC-02 |
| `getLeads` filters by owner_id correctly | AC-03 |

---

## 14. E2E Test Cases

| Flow | Steps | Expected Outcome |
|------|-------|-----------------|
| Create lead | Navigate to `/leads/new` → select a contact → set status = qualified, score = 85 → submit | Redirected to `/leads`; new lead visible in table with Qualified badge and score "85" in green |
| Duplicate contact lead | Create second lead for the same contact | Stays on form with "This contact already has an active lead" |
| Filter by status | Go to `/leads` → select "Qualified" from Status filter | Table shows only leads with Qualified badge |
| Filter by owner | Select owner from Owner filter | Only that owner's leads appear |
| Open detail panel | Click a lead row | Slide-over panel appears with contact name, status, score label, and activity timeline |
| Inline status update | Open detail panel → change status dropdown to "Contacted" | Status badge updates in panel and table row without full reload |
| Convert to deal | Open detail panel for unconverted lead → click "Convert to Deal" | Navigated to `/deals/new` with contact and source pre-filled; re-opening same lead's panel shows disabled Convert button |
| Edit lead | Click Edit from actions menu → change score to 50 → save | Panel and table row reflect updated score in yellow |
| Delete lead | Click Delete from actions menu → confirm in dialog | Lead removed from table permanently |
| Pagination | With 51+ leads navigate to page 2 | Different 50 rows shown; "Showing 51–100 of X" displayed |
