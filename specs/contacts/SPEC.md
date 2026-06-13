# Contacts Module — SPEC.md

## 1. What This Module Does

The Contacts module is the core entity store for FreshCRM. It allows sales reps to create, search, view, edit, and soft-delete contact records within their org. Each contact holds personal and professional details (name, email, phone, company, job title), a lead source, owner assignment, free-form tags, and a JSONB custom fields bag. The contact detail page aggregates a unified activity timeline (calls, emails, notes, tasks, meetings) linked to that contact. Managers can filter the list by owner or lead source. Admins and members can bulk-import contacts via server-parsed CSV. Soft deletion ensures no data is permanently lost. The free plan enforces a 500-contact cap per org.

---

## 2. Routes

| Path | Page | Access |
|------|------|--------|
| `/contacts` | Contacts list — table, search, filters, pagination | Authenticated (all roles) |
| `/contacts/new` | Create contact form | Authenticated (admin, member) |
| `/contacts/[id]` | Contact detail — profile + activity timeline | Authenticated (all roles) |
| `/contacts/[id]/edit` | Edit contact form | Authenticated (admin, member) |

---

## 3. Pages & Components

### `/contacts` — Contacts List
- `PageHeader` — title "Contacts", right slot: "Import CSV" + "New Contact" buttons
- `SearchInput` — debounced 300ms, queries name + email + company
- Filter bar — Owner dropdown (org members), Lead Source dropdown (enum values)
- `DataTable` — columns: Name, Email, Company, Owner, Lead Source, Last Activity, Actions
  - Name cell: avatar initials + full name, clickable → detail page
  - Owner cell: avatar + name via `OwnerSelect` display
  - Lead Source cell: `StatusBadge` with lead source label
  - Last Activity cell: relative timestamp (e.g. "2 hours ago")
  - Actions cell: Edit icon → edit page, Delete icon → `ConfirmDialog`
- Pagination — "Showing X–Y of Z" with page controls (50 per page)
- `EmptyState` — shown when no contacts match filters

### `/contacts/new` — Create Contact
- `PageHeader` — title "New Contact", back link to `/contacts`
- `CrudForm` wrapping contact fields (see Zod schema)
- Submit → creates contact → redirects to `/contacts/[id]`

### `/contacts/[id]` — Contact Detail
- Left main panel:
  - Contact header: avatar initials, full name, company + job title, email (mailto link), phone (tel link)
  - `StatusBadge` for lead source
  - Tags rendered as chips (read-only)
  - Action bar: "Edit" button → `/contacts/[id]/edit`, "Delete" → `ConfirmDialog`
  - Tabs: Activity | Emails | Files
  - Active tab: `ActivityTimeline` — all activities linked to this contact, newest first
- Right sidebar ("About Contact"):
  - Owner: `OwnerSelect` (inline update)
  - Lead Source (display)
  - Associated Deals count (linked to deals module — read-only count for now)
  - Tags: `TagInput` (inline update)
  - Custom Fields: key/value pairs from JSONB (display only in v1)

### `/contacts/[id]/edit` — Edit Contact
- `PageHeader` — title "Edit Contact", back link to detail page
- `CrudForm` pre-filled with current contact data
- Submit → updates contact → redirects to `/contacts/[id]`

### Shared loading/error boundaries
- `src/app/(dashboard)/contacts/loading.tsx` — skeleton table
- `src/app/(dashboard)/contacts/error.tsx` — error boundary with retry
- `src/app/(dashboard)/contacts/[id]/loading.tsx` — skeleton detail
- `src/app/(dashboard)/contacts/[id]/error.tsx` — error boundary

---

## 4. Files to Create

```
specs/contacts/SPEC.md                                      ← this file

src/lib/validations/contact.ts                             ← Zod schemas
src/lib/actions/contacts.ts                                ← server actions

src/app/(dashboard)/contacts/page.tsx                      ← list page
src/app/(dashboard)/contacts/columns.tsx                   ← TanStack column defs
src/app/(dashboard)/contacts/loading.tsx                   ← skeleton
src/app/(dashboard)/contacts/error.tsx                     ← error boundary
src/app/(dashboard)/contacts/new/page.tsx                  ← create form
src/app/(dashboard)/contacts/[id]/page.tsx                 ← detail page
src/app/(dashboard)/contacts/[id]/edit/page.tsx            ← edit form
src/app/(dashboard)/contacts/[id]/loading.tsx              ← skeleton
src/app/(dashboard)/contacts/[id]/error.tsx                ← error boundary

src/app/(dashboard)/contacts/__tests__/contact.unit.test.ts   ← unit tests
src/app/(dashboard)/contacts/__tests__/contact.e2e.test.ts    ← E2E tests
```

---

## 5. Zod Schemas

### `contactSchema` — create + edit

```typescript
import { z } from 'zod'

const LEAD_SOURCES = ['website','referral','cold_outreach','social','event','other'] as const

export const contactSchema = z.object({
  first_name : z.string().min(1, 'First name is required').max(100),
  last_name  : z.string().max(100).default(''),
  email      : z.string().email('Invalid email').max(254).optional().or(z.literal('')),
  phone      : z.string().max(30).optional(),
  company    : z.string().max(200).optional(),
  job_title  : z.string().max(200).optional(),
  lead_source: z.enum(LEAD_SOURCES).optional(),
  owner_id   : z.string().uuid('Invalid owner').optional(),
  tags       : z.array(z.string().max(50)).max(20).default([]),
  custom_fields: z.record(z.unknown()).default({}),
})

export type ContactInput = z.infer<typeof contactSchema>
```

### `contactSearchSchema` — list query params

```typescript
export const contactSearchSchema = z.object({
  q          : z.string().max(200).optional(),
  owner_id   : z.string().uuid().optional(),
  lead_source: z.enum(LEAD_SOURCES).optional(),
  page       : z.coerce.number().int().min(1).default(1),
  per_page   : z.coerce.number().int().min(1).max(100).default(50),
})
```

### `csvImportRowSchema` — per-row validation during CSV import

```typescript
export const csvImportRowSchema = z.object({
  first_name : z.string().min(1),
  last_name  : z.string().optional(),
  email      : z.string().email(),
  phone      : z.string().max(30).optional(),
  company    : z.string().max(200).optional(),
  job_title  : z.string().max(200).optional(),
  lead_source: z.enum(LEAD_SOURCES).optional(),
  tags       : z.string().optional(), // comma-separated, parsed server-side
})
```

---

## 6. Server Actions

All actions in `src/lib/actions/contacts.ts`. Every action:
1. Calls `const user = await getAuthUser()` — throws if unauthenticated
2. Validates input with Zod — throws `ZodError` on failure
3. Queries via `queryForOrg(user.orgId, sql, params)` — never raw DB access

### `getContacts(params)`
1. `getAuthUser()` — any role
2. Parse `params` with `contactSearchSchema`
3. Build WHERE: `deleted_at IS NULL AND org_id = $1`
   - If `q`: add `search_vector ILIKE $n` on the gin-indexed computed column
   - If `owner_id`: add `owner_id = $n`
   - If `lead_source`: add `lead_source = $n`
4. SELECT contacts JOIN users (owner) ORDER BY `created_at DESC` LIMIT/OFFSET
5. Return `{ contacts, total, page, per_page }`

### `getContact(id)`
1. `getAuthUser()` — any role
2. SELECT contact WHERE `id = $1 AND org_id = $2 AND deleted_at IS NULL`
3. If not found → throw `NotFoundError`
4. SELECT activities WHERE `contact_id = $1` ORDER BY `created_at DESC`
5. Return `{ contact, activities }`

### `createContact(data)`
1. `getAuthUser()` — role must be `admin` or `member`
2. Validate `data` with `contactSchema`
3. If `owner_id` provided: verify `owner_id` belongs to same `org_id` — throw if not
4. Count active contacts for org; if ≥ 500 and plan = 'free' → throw `PlanLimitError`
5. INSERT contact; on unique violation (org_id + email) → throw `DuplicateEmailError`
6. Return created contact

### `updateContact(id, data)`
1. `getAuthUser()` — role must be `admin` or `member`
2. Validate `data` with `contactSchema`
3. SELECT contact to verify it belongs to org and is not deleted — throw `NotFoundError` if absent
4. If `owner_id` provided: verify it belongs to same org
5. UPDATE contact SET ... WHERE `id = $1 AND org_id = $2`
6. Return updated contact

### `deleteContact(id)`
1. `getAuthUser()` — role must be `admin` or `member`
2. SELECT contact to verify it belongs to org — throw `NotFoundError` if absent
3. UPDATE contacts SET `deleted_at = now()` WHERE `id = $1 AND org_id = $2`
4. Return `{ success: true }`

### `importContactsCSV(formData)`
1. `getAuthUser()` — role must be `admin` or `member`
2. Extract file from `formData`; parse CSV server-side using papaparse
3. Validate each row with `csvImportRowSchema`; collect errors by row number
4. Check plan limit: if existing count + valid rows > 500 and plan = 'free' → truncate import to fit, note in result
5. Batch-INSERT valid rows (ON CONFLICT (org_id, email) DO NOTHING)
6. Return `{ imported: number, skipped: number, errors: { row: number, message: string }[] }`

---

## 7. User Stories

| # | Story |
|---|-------|
| US-01 | As a Sales Rep, I want to search contacts by name, email, or company so that I can quickly find the person I need. |
| US-02 | As a Sales Rep, I want to create a new contact so that I can track a prospect in the CRM. |
| US-03 | As a Sales Rep, I want to view a contact's full profile and activity history so that I am prepared for every interaction. |
| US-04 | As a Sales Rep, I want to edit a contact's details so that the record stays accurate over time. |
| US-05 | As a Sales Rep, I want to delete a stale contact so that my list stays clean without losing audit history. |
| US-06 | As a Manager, I want to filter the contact list by owner so that I can review each team member's portfolio. |
| US-07 | As a Manager, I want to filter by lead source so that I can evaluate which channels are producing contacts. |
| US-08 | As a Manager, I want to import contacts via CSV so that I can bulk-load data from a previous CRM. |
| US-09 | As an Admin, I want to assign or reassign an owner so that workload is distributed correctly. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-01 | I am authenticated and navigate to `/contacts` | The page loads | I see a table with columns: Name, Email, Company, Owner, Lead Source, Last Activity, Actions — sorted by created_at descending, 50 rows per page |
| AC-02 | I am on the contacts list | I type in the search box and wait 300ms | The table updates to show only contacts whose full name, email, or company contains the query (case-insensitive) |
| AC-03 | I am on the contacts list | I click "New Contact" | I am navigated to `/contacts/new` |
| AC-04 | I am on the create form | I submit with a valid first name and a unique email | A contact is created and I am redirected to `/contacts/[id]` |
| AC-05 | I am on the create form | I submit with an email already used by another contact in this org | The form shows "A contact with this email already exists" without leaving the page |
| AC-06 | I am on the create form | I submit with a malformed email (e.g. "notanemail") | I see a field-level validation error "Invalid email" |
| AC-07 | I navigate to `/contacts/[id]` for an existing contact | The page loads | I see the contact's name, company, job title, email, phone, owner, lead source, tags, and custom fields |
| AC-08 | I am on the contact detail page | I click "Edit" | I am navigated to `/contacts/[id]/edit` with all fields pre-filled |
| AC-09 | I am on the edit form | I change a field and submit | The contact is updated and I am redirected to `/contacts/[id]` showing the new data |
| AC-10 | I am on the contact detail page | I click "Delete" and confirm in the dialog | The contact is soft-deleted, I am redirected to `/contacts`, and the deleted contact no longer appears |
| AC-11 | I am on the contacts list | I select an owner from the Owner filter | Only contacts assigned to that owner are shown |
| AC-12 | I am on the contacts list | I select a lead source from the Lead Source filter | Only contacts with that lead source are shown |
| AC-13 | I upload a valid CSV with the required headers (`first_name`, `email`) | I click Import | Contacts are created for each valid row; I see "X imported, Y skipped" |
| AC-14 | I upload a CSV with some invalid rows (missing first_name, bad email) | I click Import | Valid rows are imported; I see a list of invalid rows with their error messages |
| AC-15 | The contacts list has more than 50 contacts | I click "Next" | The next page of 50 contacts loads and the URL or state reflects the new page |
| AC-16 | I am on a contact detail page | I view the Activity tab | I see all activities (calls, emails, notes, tasks, meetings) linked to this contact, sorted newest first |
| AC-17 | My org is on the free plan and already has 500 contacts | I try to create a new contact | I see "Contact limit reached — upgrade to Pro to add more contacts" |

---

## 9. Permissions Matrix

| Action | Admin | Member | Viewer |
|--------|-------|--------|--------|
| View contacts list | ✅ | ✅ | ✅ |
| View contact detail | ✅ | ✅ | ✅ |
| Create contact | ✅ | ✅ | ❌ |
| Edit own contact (owner = self) | ✅ | ✅ | ❌ |
| Edit any contact | ✅ | ✅ | ❌ |
| Delete contact | ✅ | ✅ | ❌ |
| Import CSV | ✅ | ✅ | ❌ |
| Assign/reassign owner | ✅ | ✅ | ❌ |

> Role check is enforced in every server action via `getAuthUser()`. Viewer role receives a 403 on any mutation.

---

## 10. Business Rules

| ID | Rule |
|----|------|
| BR-01 | A contact's email must be unique within an org (`UNIQUE (org_id, email)` enforced at DB level). |
| BR-02 | Contacts are never hard-deleted. Deletion sets `deleted_at = now()`. |
| BR-03 | Soft-deleted contacts are excluded from all list queries, search results, and owner filters. |
| BR-04 | Orgs on the free plan may not exceed 500 active (non-deleted) contacts. Creating or importing beyond this returns a `PlanLimitError`. |
| BR-05 | `owner_id` must reference a user in the same org. Cross-org assignment is rejected with a 400. |
| BR-06 | CSV import is parsed entirely server-side. Client sends raw file bytes via `multipart/form-data`. |
| BR-07 | CSV required headers: `first_name`, `email`. All other columns are optional. Extra columns are ignored. |
| BR-08 | Each tag is max 50 characters; a contact may have at most 20 tags. |
| BR-09 | "Last Activity" in the list is the `created_at` of the most recent activity row linked to `contact_id`. If no activities exist, the cell is blank. |
| BR-10 | Pagination is page-based (LIMIT/OFFSET). Default page size is 50; max is 100. |

---

## 11. Error Cases

| Scenario | HTTP Equivalent | User-Facing Message |
|----------|----------------|---------------------|
| Contact not found (wrong id or deleted) | 404 | Redirect to `/contacts` + toast "Contact not found" |
| Duplicate email within org | 422 | Inline form error: "A contact with this email already exists" |
| Free plan 500-contact limit hit | 403 | Toast: "Contact limit reached — upgrade to Pro to add more contacts" |
| Owner not in same org | 400 | Inline form error: "Selected owner is not a member of this organisation" |
| CSV missing required headers | 400 | Import result: "Invalid CSV — required columns: first_name, email" |
| CSV row validation failure | 400 (per-row) | Import summary table listing row number + error message |
| Unauthenticated request | 401 | Redirect to `/login` |
| Viewer role attempts mutation | 403 | Toast: "You don't have permission to do that" |
| Unexpected DB or server error | 500 | Toast: "Something went wrong — please try again" |

---

## 12. Design Reference

| Screen | Stitch ID |
|--------|-----------|
| CRM Contacts List | `c744ca79a3b14fb49ca284b552f1c7f0` |
| CRM Contact Detail | `b2ac0c027cd748b19c899e117c670912` |

**Design tokens:**
- Primary: Indigo `#4F46E5`
- Background: `gray-50`
- Surface: white with `rounded-lg shadow-sm`
- Font: Inter (`font-sans`)
- Table header: `text-xs font-medium text-gray-500 uppercase tracking-wider`
- Avatar: initials in `bg-indigo-100 text-indigo-700 rounded-full`
- Action buttons in table: icon-only, `text-gray-400 hover:text-indigo-600`
- "New Contact" CTA: `bg-indigo-600 hover:bg-indigo-700 text-white`
- Lead Source badge: `StatusBadge` component
- Last Activity: `text-sm text-gray-500`

---

## 13. Unit Test Cases

| Test | Covers |
|------|--------|
| `contactSchema` rejects empty `first_name` | AC-06, field validation |
| `contactSchema` rejects malformed email | AC-06 |
| `contactSchema` rejects unknown `lead_source` value | BR-07 |
| `contactSchema` accepts optional email (omitted) | contactSchema permissiveness |
| `contactSearchSchema` coerces `page` string to number | Search params parsing |
| `getContacts` excludes soft-deleted contacts | BR-03 |
| `getContacts` returns paginated results up to per_page limit | AC-01, BR-10 |
| `createContact` returns `DuplicateEmailError` when email exists in org | AC-05, BR-01 |
| `createContact` returns `PlanLimitError` when org has 500 contacts on free plan | AC-17, BR-04 |
| `createContact` rejects `owner_id` from a different org | BR-05 |
| `updateContact` returns `NotFoundError` for a deleted contact | AC-09, BR-02 |
| `deleteContact` sets `deleted_at` and does not hard-delete the row | BR-02 |
| `importContactsCSV` returns error list for rows missing `first_name` | AC-14, BR-06 |
| `importContactsCSV` skips rows with duplicate email (ON CONFLICT DO NOTHING) | BR-01 |
| `importContactsCSV` truncates import at free plan limit | BR-04 |

---

## 14. E2E Test Cases

| Flow | Steps | Expected Outcome |
|------|-------|-----------------|
| Create contact | Navigate to `/contacts/new` → fill first name + email → submit | Redirected to `/contacts/[id]`; contact name visible in header |
| Duplicate email | Create two contacts with same email | Second submission stays on form with "A contact with this email already exists" |
| Search contacts | Go to `/contacts` → type partial name in search box → wait 300ms | Table filters to matching contacts only |
| Filter by owner | Select an owner from Owner dropdown | Only that owner's contacts remain in the table |
| Edit contact | Open detail → click Edit → change company → save | Detail page shows updated company name |
| Delete contact | Open detail → click Delete → confirm | Redirected to `/contacts`; deleted contact absent from list |
| Pagination | Navigate to `/contacts` with 51+ contacts → click Next | Page 2 rows differ from page 1 rows |
| CSV import — happy path | Click "Import CSV" → upload valid CSV with 3 rows → confirm | Summary: "3 imported, 0 errors"; contacts appear in list |
| CSV import — partial errors | Upload CSV where row 2 has no email → import | "2 imported, 1 error"; row 2 listed with "Invalid email" |
| Plan limit | Seed 500 contacts on free-plan org → try create one more | Error toast "Contact limit reached" visible; contact count stays at 500 |
