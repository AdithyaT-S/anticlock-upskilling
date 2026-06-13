# Deals + Kanban — SPEC.md

**Module:** Deals + Kanban  
**Branch:** `feat/deals`  
**Stitch screen:** CRM Deals Pipeline (`49d332b5a2dd4dc4a424a77f4fa75cfe`)  
**Depends on:** Contacts (contact link on deal), Leads (convert-to-deal target)  
**Date:** 2026-06-13

---

## 1. What This Module Does

The Deals module gives sales reps and managers a Kanban-style pipeline view of all active deals in the org. Each org supports multiple named pipelines; a pipeline selector in the page header lets users switch between them, defaulting to the org's default pipeline. Within a pipeline, deals are displayed as draggable cards organised into stage columns (e.g. New → Qualified → Proposal → Negotiation → Closed Won/Closed Lost). Reps can create deals, move them between stages via drag-and-drop or a stage dropdown, edit deal details, and close deals as Won or Lost with an optional lost reason. A deal detail panel slides over from the right and shows full deal info plus an activity timeline. Deals are counted toward the free-plan limit of 100 per org.

---

## 2. Routes

| Path | Page | Access |
|------|------|--------|
| `/deals` | Kanban board — pipeline selector, all stage columns | Authenticated users |
| `/deals/new` | Redirect to `/deals` — new deal opens as slide-over | Authenticated users |
| `/deals/[id]` | Deal detail slide-over (rendered inside `/deals` via URL param) | Authenticated users |
| `/deals/[id]/edit` | Edit deal form page | Admin, Manager, deal owner |

---

## 3. Pages & Components

### `/deals` — Kanban Board (Server + Client)

**Server Component** (`page.tsx`):
- Fetches pipelines for org → passes to `DealsClient`
- Fetches deals for default (or selected) pipeline → passes to `DealsClient`
- Reads `?pipeline=<id>` search param to know which pipeline to load

**Client Component** (`DealsClient.tsx`):
- Pipeline selector `<Select>` in page header — onChange triggers router.push with `?pipeline=<id>`
- "My Deals" filter toggle
- "New Deal" button — opens `DealForm` in a `Sheet` slide-over
- Renders `<KanbanBoard>` with stages + deals data
- Manages optimistic state for drag-drop

**`KanbanBoard.tsx`** (`src/components/modules/deals/`):
- `@dnd-kit/core` `<DndContext>` wrapper
- `onDragEnd` calls `moveDealStage` server action + updates local state optimistically
- Renders a `<KanbanColumn>` per stage, scrollable horizontally

**`KanbanColumn.tsx`** (`src/components/modules/deals/`):
- Column header: stage name, deal count badge, total value sum
- `useDroppable` drop zone
- "Add deal in this stage" `+` icon button → opens `DealForm` pre-filled with stage
- Renders `<KanbanCard>` per deal in column

**`KanbanCard.tsx`** (`src/components/modules/deals/`):
- `useDraggable` drag handle (grip icon top-left)
- Deal name (bold), contact/company name (gray), deal value (indigo)
- Close date with calendar icon — shown in red if overdue
- Owner avatar/initials circle
- Status badge: `Overdue` (red), `High` (orange), `Won` (green) using `<StatusBadge>`
- Click anywhere on card (except drag handle) → opens deal detail panel (push `?deal=<id>` to URL)

**`DealDetailPanel.tsx`** (`_components/`):
- Right-side `Sheet` — opened when `?deal=<id>` present in URL
- Shows: deal name, value, stage dropdown, close date, owner, linked contact
- "Edit Deal" button → navigates to `/deals/[id]/edit`
- "Close as Won" / "Close as Lost" action buttons
- Activity timeline using `<ActivityTimeline>` shared component
- Close button removes `?deal` param from URL

**`DealForm.tsx`** (`_components/`):
- Wraps `<CrudForm>` shared component
- Fields: name, value, currency, close_date, pipeline_id, stage_id, contact_id (optional), owner_id
- Stage select is dependent on selected pipeline (filters stages client-side)
- Uses react-hook-form + Zod resolver
- On submit: calls `createDeal` or `updateDeal` server action

### `/deals/[id]/edit` — Edit Page
- Server Component: fetches deal + pipelines + stages + users
- Renders `<DealForm>` with pre-filled data
- Back button → returns to `/deals`

---

## 4. Files to Create

```
specs/deals/SPEC.md                                          ← this file

src/lib/validations/deal.ts                                  ← Zod schemas
src/lib/actions/deals.ts                                     ← CRUD + stage move + close
src/lib/actions/pipelines.ts                                 ← getPipelines, getStages

src/app/(dashboard)/deals/page.tsx
src/app/(dashboard)/deals/loading.tsx
src/app/(dashboard)/deals/error.tsx
src/app/(dashboard)/deals/[id]/page.tsx                      ← redirects to /deals?deal=[id]
src/app/(dashboard)/deals/[id]/edit/page.tsx
src/app/(dashboard)/deals/_components/DealsClient.tsx
src/app/(dashboard)/deals/_components/DealForm.tsx
src/app/(dashboard)/deals/_components/DealDetailPanel.tsx
src/app/(dashboard)/deals/__tests__/deal.unit.test.ts
src/app/(dashboard)/deals/__tests__/deal.e2e.ts

src/components/modules/deals/KanbanBoard.tsx
src/components/modules/deals/KanbanColumn.tsx
src/components/modules/deals/KanbanCard.tsx
```

---

## 5. Zod Schemas

### `dealSchema` — create / edit deal

```ts
export const dealSchema = z.object({
  name:        z.string().min(1, 'Deal name is required').max(200),
  pipeline_id: z.string().uuid('Invalid pipeline'),
  stage_id:    z.string().uuid('Invalid stage'),
  value:       z.coerce.number().min(0, 'Value must be ≥ 0').max(999_999_999_99, 'Value too large'),
  currency:    z.string().length(3, 'Currency must be 3-letter ISO code').default('INR'),
  close_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional().nullable(),
  contact_id:  z.string().uuid().optional().nullable(),
  owner_id:    z.string().uuid().optional().nullable(),
})
```

### `moveStageSchema` — drag-drop / stage change

```ts
export const moveStageSchema = z.object({
  deal_id:  z.string().uuid('Invalid deal'),
  stage_id: z.string().uuid('Invalid stage'),
})
```

### `closeDealSchema` — close as won or lost

```ts
export const closeDealSchema = z.object({
  deal_id:     z.string().uuid('Invalid deal'),
  status:      z.enum(['won', 'lost']),
  lost_reason: z.string().max(500).optional().nullable(),
}).refine(
  (d) => d.status !== 'lost' || (d.lost_reason && d.lost_reason.length > 0),
  { message: 'Lost reason is required when closing as lost', path: ['lost_reason'] }
)
```

### `pipelineSchema` — create pipeline (used by Settings, referenced here for completeness)

```ts
export const pipelineSchema = z.object({
  name:       z.string().min(1).max(100),
  is_default: z.boolean().default(false),
})
```

---

## 6. Server Actions

All actions live in `src/lib/actions/deals.ts` and `src/lib/actions/pipelines.ts`.  
Every action starts with `const user = await getAuthUser()` before any DB call.

### `pipelines.ts`

#### `getPipelines()`
1. `getAuthUser()` — throws if unauthenticated
2. `db.queryForOrg(user.orgId)` → `SELECT id, name, is_default FROM pipelines WHERE org_id = $1 ORDER BY is_default DESC, name ASC`
3. Return `{ pipelines: Pipeline[] }`

#### `getPipelineWithStages(pipelineId: string)`
1. `getAuthUser()`
2. Validate `pipelineId` is a UUID
3. `SELECT * FROM pipeline_stages WHERE pipeline_id = $1 ORDER BY position ASC`
4. Verify pipeline belongs to user's org
5. Return `{ stages: PipelineStage[] }`

#### `ensureDefaultPipeline(orgId: string)`
Internal helper — called during org creation (or first visit to Deals if no pipeline exists):
1. Check if any pipeline exists for org
2. If none, insert default pipeline with stages: New (pos 0, 10%), Qualified (pos 1, 30%), Proposal (pos 2, 60%), Negotiation (pos 3, 80%), Closed Won (pos 4, 100%), Closed Lost (pos 5, 0%)
3. Return default pipeline id

### `deals.ts`

#### `getDealsForPipeline(pipelineId: string)`
1. `getAuthUser()`
2. Parse + validate `pipelineId` as UUID
3. Verify pipeline.org_id = user.orgId (prevent cross-org leak)
4. `SELECT d.*, c.first_name, c.last_name, c.company, u.full_name as owner_name, u.avatar_url as owner_avatar FROM deals d LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN users u ON d.owner_id = u.id WHERE d.org_id = $1 AND d.pipeline_id = $2 ORDER BY d.created_at ASC`
5. Return `{ deals: DealWithRelations[] }`

#### `getDeal(id: string)`
1. `getAuthUser()`
2. Validate `id` as UUID
3. Fetch deal with contact, owner, stage, pipeline — verify org scope
4. Return `{ deal: DealDetail }`

#### `createDeal(input: unknown)`
1. `getAuthUser()`
2. `dealSchema.parse(input)`
3. Check free-plan deal limit: count open deals for org — if ≥ 100 and plan = 'free', return `{ error: 'Free plan limit of 100 deals reached' }`
4. Verify `pipeline_id` belongs to org
5. Verify `stage_id` belongs to that pipeline
6. `INSERT INTO deals (org_id, name, pipeline_id, stage_id, value, currency, close_date, contact_id, owner_id) VALUES (...) RETURNING *`
7. `revalidatePath('/deals')`
8. Return `{ deal }`

#### `updateDeal(id: string, input: unknown)`
1. `getAuthUser()`
2. `dealSchema.parse(input)`
3. Fetch existing deal — verify org scope and that status = 'open' (closed deals cannot be edited via this action)
4. Verify new `pipeline_id` and `stage_id` belong to org
5. `UPDATE deals SET name=$1, pipeline_id=$2, stage_id=$3, value=$4, currency=$5, close_date=$6, contact_id=$7, owner_id=$8, updated_at=now() WHERE id=$9 AND org_id=$10`
6. `revalidatePath('/deals')` + `revalidatePath('/deals/[id]')`
7. Return `{ deal }`

#### `moveDealStage(input: unknown)`
1. `getAuthUser()`
2. `moveStageSchema.parse(input)`
3. Fetch deal — verify org scope, status must be 'open'
4. Verify new `stage_id` belongs to the same pipeline as the deal
5. `UPDATE deals SET stage_id=$1, updated_at=now() WHERE id=$2 AND org_id=$3`
6. `revalidatePath('/deals')`
7. Return `{ ok: true }`

#### `closeDeal(input: unknown)`
1. `getAuthUser()`
2. `closeDealSchema.parse(input)`
3. Fetch deal — verify org scope, must be currently 'open'
4. `UPDATE deals SET status=$1, lost_reason=$2, updated_at=now() WHERE id=$3 AND org_id=$4`
5. `revalidatePath('/deals')`
6. Return `{ ok: true }`

#### `deleteDeal(id: string)`
1. `getAuthUser()`
2. Validate `id` as UUID
3. Fetch deal — verify org scope
4. Check caller role: only admin or the deal owner may delete
5. `DELETE FROM deals WHERE id=$1 AND org_id=$2`
6. `revalidatePath('/deals')`
7. Return `{ ok: true }`

---

## 7. User Stories

| # | As a… | I want to… | So that… |
|---|-------|-----------|----------|
| US-01 | Sales Rep | see all deals organised in a Kanban board by stage | I can quickly gauge pipeline health at a glance |
| US-02 | Sales Rep | switch between pipelines using a dropdown | I can manage multiple product lines or sales processes |
| US-03 | Sales Rep | drag a deal card from one stage to another | I can update deal progress without opening a form |
| US-04 | Sales Rep | click a deal card to see its full details in a side panel | I can review and act on a deal without leaving the board |
| US-05 | Sales Rep | create a new deal from the Kanban board | I can capture a new opportunity immediately |
| US-06 | Sales Rep | edit deal name, value, close date, and owner | I can keep deal data accurate as the opportunity evolves |
| US-07 | Sales Rep | close a deal as Won or Lost (with a lost reason) | I can record outcomes for reporting and pipeline hygiene |
| US-08 | Sales Rep | filter the board to show only my deals | I can focus on my own pipeline without distraction |
| US-09 | Sales Rep | see an overdue badge on deals past their close date | I can prioritise deals that need attention |
| US-10 | Sales Manager | see deal count and total value per stage column | I can assess pipeline value without running a report |
| US-11 | Sales Manager | delete a deal | I can remove duplicates or invalid entries |
| US-12 | Sales Rep | link a deal to an existing contact | I can trace deals back to the right contact record |

---

## 8. Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-01 | User is authenticated | They visit `/deals` | The Kanban board loads with the org's default pipeline and its stage columns |
| AC-02 | Org has multiple pipelines | User selects a different pipeline from the selector | The board re-renders showing only deals belonging to the selected pipeline |
| AC-03 | Kanban board is displayed | User drags a deal card to a different stage column | The deal's stage updates instantly (optimistic) and is persisted via server action |
| AC-04 | A deal is in a closed state (won/lost) | Any user tries to move it via drag-drop | The move is rejected and the card stays in its column |
| AC-05 | User clicks a deal card | The detail panel opens | The panel shows deal name, value, stage, close date, owner, linked contact, and activity timeline |
| AC-06 | User clicks "New Deal" | The create form slide-over opens | The form has all required fields; submit creates the deal and it appears in the correct stage column |
| AC-07 | User submits the create deal form with an empty name | Form validates | An inline error "Deal name is required" appears and no server request is made |
| AC-08 | Org is on the free plan and has 100 open deals | User tries to create a deal | Server returns error "Free plan limit of 100 deals reached" and no deal is created |
| AC-09 | Deal is open | User clicks "Close as Won" | Deal status becomes 'won', card shows a Won badge, and the deal moves to the Closed Won column |
| AC-10 | Deal is open | User clicks "Close as Lost" without providing a reason | Validation error "Lost reason is required when closing as lost" shown; deal remains open |
| AC-11 | Deal is open | User clicks "Close as Lost" with a reason | Deal status becomes 'lost', reason is stored, card moves to Closed Lost column |
| AC-12 | User is on the board | They toggle "My Deals" filter | Only deals where `owner_id = current user id` are shown |
| AC-13 | A deal's close date is in the past | The card is rendered | An "Overdue" badge appears on the card |
| AC-14 | Each stage column is rendered | Column header is visible | It shows stage name, deal count, and the sum of deal values for that stage |
| AC-15 | User navigates to `/deals/[id]/edit` | The edit form loads | All existing deal fields are pre-filled and can be updated |
| AC-16 | User (admin or owner) clicks Delete on a deal | Confirmation dialog appears and user confirms | Deal is permanently deleted and removed from the board |
| AC-17 | User (non-owner, non-admin) tries to delete another user's deal | Delete action is triggered | Server returns a 403-equivalent error; deal is not deleted |
| AC-18 | No pipeline exists for the org | User visits `/deals` for the first time | A default pipeline with 6 stages (New, Qualified, Proposal, Negotiation, Closed Won, Closed Lost) is auto-created |

---

## 9. Permissions Matrix

| Action | Admin | Manager (member) | Sales Rep (member) | Viewer |
|--------|-------|-------------------|--------------------|--------|
| View board | ✅ | ✅ | ✅ | ✅ |
| View deal detail | ✅ | ✅ | ✅ | ✅ |
| Create deal | ✅ | ✅ | ✅ | ❌ |
| Edit any deal | ✅ | ✅ | ❌ | ❌ |
| Edit own deal | ✅ | ✅ | ✅ | ❌ |
| Move stage (drag-drop) | ✅ | ✅ | ✅ (own deals only)* | ❌ |
| Close deal (won/lost) | ✅ | ✅ | ✅ (own deals only)* | ❌ |
| Delete deal | ✅ | ❌ | ❌ | ❌ |

*For v1 simplicity, stage move and close are allowed for any rep on any open deal (consistent with Contacts/Leads pattern where members can edit any record). Only delete is restricted to admin.

---

## 10. Business Rules

| # | Rule |
|---|------|
| BR-01 | Every deal must belong to a pipeline and a stage that belongs to that pipeline — `stage_id` must be a child of `pipeline_id` |
| BR-02 | Free plan orgs may not have more than 100 open deals; the check is enforced in `createDeal` |
| BR-03 | Closed deals (status = 'won' or 'lost') cannot be moved to a different stage or edited via `updateDeal` — they are read-only |
| BR-04 | `lost_reason` is required when closing a deal as 'lost'; it is ignored (set to null) when closing as 'won' |
| BR-05 | Deleting a deal is a hard delete (no `deleted_at` column); only admins may delete |
| BR-06 | `currency` must be a valid 3-letter ISO 4217 code; the default is `'INR'` as set in the DB schema |
| BR-07 | If an org has no pipeline, a default pipeline with 6 stages is auto-created on the first visit to `/deals` |
| BR-08 | Exactly one pipeline per org must have `is_default = true`; the pipeline selector defaults to this pipeline |
| BR-09 | Drag-drop stage moves are only valid within the same pipeline; cross-pipeline drops are rejected |
| BR-10 | Deal `value` must be ≥ 0; negative values are rejected by Zod validation |

---

## 11. Error Cases

| Trigger | User-facing message | Handling |
|---------|---------------------|----------|
| Create deal when free plan limit reached | "Your org has reached the 100-deal limit on the free plan. Upgrade to Pro to add more deals." | Returned from server action, shown as toast |
| `stage_id` does not belong to the deal's `pipeline_id` | "Invalid stage for this pipeline." | Returned from `moveDealStage` / `createDeal`; shown as toast |
| Attempt to edit or move a closed deal | "This deal is closed and cannot be modified." | Returned from server action; shown as toast |
| Attempt to close as lost with no reason | "Please provide a reason for losing this deal." | Zod validation; shown as inline form error |
| Deleting a deal as a non-admin | "You don't have permission to delete deals." | Returned from `deleteDeal`; shown as toast |
| Pipeline fetch fails (network/DB error) | "Failed to load pipelines. Please refresh." | Caught in error.tsx; shown as error boundary |
| Board fetch fails | "Failed to load deals. Please refresh." | Caught in error.tsx; shown as error boundary |
| `deal_id` or `stage_id` not found in org | "Deal not found." | 404-equivalent returned from action; shown as toast |

---

## 12. Design Reference

**Stitch Screen:** CRM Deals Pipeline  
**Screen ID:** `49d332b5a2dd4dc4a424a77f4fa75cfe`  
**Project ID:** `10851584638320860726`

### Key design notes from Stitch

- **Background:** `gray-50` (`bg-gray-50`) for the page; white (`bg-white`) surfaces for cards and columns
- **Primary colour:** Indigo `#4F46E5` for "New Deal" button, selected pipeline name, active nav
- **Column headers:** Stage name in `text-sm font-semibold text-gray-700`, count badge in `bg-gray-100 text-gray-600 rounded-full px-2`, total value in `text-xs text-gray-500`
- **Cards:** `bg-white rounded-lg border border-gray-200 shadow-sm p-4` with `hover:shadow-md` on hover
- **Card deal name:** `text-sm font-medium text-gray-900`
- **Card company/contact:** `text-xs text-gray-500`
- **Card value:** `text-sm font-semibold text-indigo-600`
- **Overdue badge:** red `bg-red-100 text-red-700`
- **Won badge:** green `bg-green-100 text-green-700`
- **Pipeline selector:** shadcn `<Select>` in page header, left of filter/search area
- **Filter toggle "My Deals":** small chip/toggle button in header
- **"New Deal" button:** `bg-indigo-600 text-white` with `+` icon, top-right of header
- **Stage columns:** `min-w-[280px] max-w-[280px]` horizontally scrollable flex row
- **Add deal per column:** small `+` icon button in column header, `text-gray-400 hover:text-indigo-600`
- **Drag handle:** `GripVertical` icon, `text-gray-300`, positioned top-left of card

---

## 13. Unit Test Cases

| Test | Maps to |
|------|---------|
| `dealSchema` rejects empty name | AC-07 |
| `dealSchema` rejects negative value | BR-10 |
| `dealSchema` rejects currency != 3 chars | BR-06 |
| `dealSchema` accepts valid complete input | AC-06 |
| `moveStageSchema` rejects non-UUID stage_id | BR-01 |
| `closeDealSchema` rejects 'lost' status with no reason | AC-10 / BR-04 |
| `closeDealSchema` accepts 'won' status with no reason | BR-04 |
| `createDeal` — returns error when free plan deal count ≥ 100 | AC-08 / BR-02 |
| `createDeal` — rejects stage_id that doesn't belong to pipeline_id | BR-01 |
| `createDeal` — inserts deal with correct org_id scope | AC-06 |
| `updateDeal` — rejects update on closed (won/lost) deal | BR-03 |
| `moveDealStage` — rejects closed deal | AC-04 / BR-03 |
| `moveDealStage` — rejects stage from a different pipeline | BR-09 |
| `moveDealStage` — updates stage_id correctly for open deal | AC-03 |
| `closeDeal` — sets status='won' and clears lost_reason | AC-09 |
| `closeDeal` — sets status='lost' and stores lost_reason | AC-11 |
| `deleteDeal` — returns permission error for non-admin | AC-17 / BR-05 |
| `deleteDeal` — hard deletes deal for admin | AC-16 |
| `getDealsForPipeline` — returns only deals for requested pipeline | AC-02 |
| `getDealsForPipeline` — does not return deals from another org | BR-01 (multi-tenant) |
| `getPipelines` — returns pipelines sorted default-first | AC-01 |
| `ensureDefaultPipeline` — creates 6-stage pipeline when none exist | AC-18 / BR-07 |

---

## 14. E2E Test Cases

| Flow | Steps | Maps to |
|------|-------|---------|
| Load default pipeline | Visit `/deals` → board renders with default pipeline columns | AC-01 |
| Switch pipeline | Open pipeline selector → select a different pipeline → board re-renders with new stages | AC-02 |
| Create a deal | Click "New Deal" → fill name, value, close date → submit → card appears in first stage column | AC-06 |
| Drag deal to next stage | Drag a card from "New" column to "Qualified" column → card moves, server persists | AC-03 |
| View deal detail | Click deal card → side panel opens with correct name, value, stage, and contact | AC-05 |
| Edit a deal | Open deal panel → click "Edit Deal" → change value → save → panel shows updated value | AC-15 |
| Close deal as Won | Open deal panel → click "Close as Won" → deal moves to Closed Won column, shows Won badge | AC-09 |
| Close deal as Lost | Open deal panel → click "Close as Lost" → leave reason blank → error shown; fill reason → submit → deal moves to Closed Lost | AC-10, AC-11 |
| My Deals filter | Toggle "My Deals" → only deals owned by current user remain visible | AC-12 |
| Delete deal (admin) | Open deal panel as admin → click Delete → confirm dialog → deal removed from board | AC-16 |
