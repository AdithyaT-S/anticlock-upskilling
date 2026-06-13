# SPEC: Shared Components

**Module:** SharedComponents  
**Branch:** `feat/shared-components`  
**Depends on:** Auth (Layer 1), Layout Shell (Layer 2)  
**Blocks:** Contacts, Leads, Deals, Tickets, Activities, Reports, Settings  

---

## 1. What This Module Does

Shared Components are the design-system-level building blocks used across every CRM module. They are pure UI components — no DB access, no server actions, no Zod schemas. Each component is built once in `src/components/shared/` and imported by every module that needs it. They enforce visual consistency (Indigo #4F46E5, Inter font, white surfaces, gray-50 backgrounds) across all list pages, detail pages, forms, and timelines. No module may duplicate these components — they must import from `src/components/shared/` only.

---

## 2. Routes

No routes. Shared components are imported by other modules — they do not own any pages or routes.

---

## 3. Pages & Components

### 3.1 DataTable

A generic, headless-friendly data table with column sorting, server-side pagination, and an integrated search bar. Used on every list page (Contacts, Leads, Deals list view, Tickets).

**Props:**
- `columns: ColumnDef<T>[]` — TanStack Table column definitions
- `data: T[]` — rows for the current page
- `pageCount: number` — total pages for pagination
- `page: number` — current page (1-indexed)
- `onPageChange: (page: number) => void`
- `onSortChange?: (column: string, dir: "asc" | "desc") => void`
- `isLoading?: boolean` — shows skeleton rows when true
- `emptyState?: ReactNode` — rendered when data is empty

**Behaviour:**
- Column headers are clickable to toggle sort asc/desc; active column shows sort arrow
- Pagination: Prev / page numbers / Next — always visible below the table
- While `isLoading` is true, render 5 skeleton rows matching the column count
- When `data` is empty and not loading, render `emptyState` prop (defaults to `<EmptyState />`)
- Table scrolls horizontally on viewports narrower than content

**Stitch reference:** CRM Contacts List (`c744ca79a3b14fb49ca284b552f1c7f0`) — the contacts table defines the row height (52px), header style (text-xs uppercase gray-500), and row hover (gray-50)

---

### 3.2 CrudForm

A generic form shell that wraps `react-hook-form` + `shadcn/ui Form`. Used for every create and edit form (new contact, edit lead, etc.).

**Props:**
- `title: string` — form heading shown at top
- `description?: string` — subtext below heading
- `form: UseFormReturn<T>` — the caller's react-hook-form instance
- `onSubmit: (values: T) => Promise<void>`
- `isPending?: boolean` — disables submit + shows spinner
- `submitLabel?: string` — defaults to "Save"
- `cancelHref?: string` — renders a Cancel link that navigates back
- `children: ReactNode` — the form fields

**Behaviour:**
- Renders a white Card with `p-6` padding
- Submit button is full-width at the bottom, indigo, disabled + shows spinner when `isPending`
- Cancel link is a text link to the left of submit; absent when `cancelHref` is not provided
- Field error messages rendered beneath each input via `FormMessage`

---

### 3.3 ActivityTimeline

A vertical timeline of CRM activity items for a contact, deal, or ticket. Renders each activity as a row with an icon, description, timestamp, and owner avatar.

**Props:**
- `activities: Activity[]` — see `src/types/crm.ts` `Activity` type
- `isLoading?: boolean` — shows 3 skeleton timeline items

**Activity item layout (per Stitch Contact Detail screen `b2ac0c027cd748b19c899e117c670912`):**
- Left: circular icon in indigo/gray tint per activity type
- Icon map: Call → Phone, Email → Mail, Note → FileText, Task → CheckSquare, Meeting → Calendar (all from `lucide-react`)
- Center: activity description (bold), owner name + timestamp (gray-500 text-sm)
- Right: nothing (timeline is left-to-right read)
- Connector: 1px left border on icon column connecting items

**Activity types:** `call | email | note | task | meeting`

---

### 3.4 StatusBadge

A pill badge that renders a status string in a colour-coded variant. Used for lead status, deal stage, and ticket status.

**Props:**
- `status: string` — the raw status value from DB
- `variant?: "lead" | "deal" | "ticket"` — determines colour mapping

**Colour mapping:**

| Status | Color |
|--------|-------|
| New / Open | indigo bg-indigo-100 text-indigo-700 |
| Contacted / In Progress / Pending | blue bg-blue-100 text-blue-700 |
| Qualified / Proposal / Resolved | green bg-green-100 text-green-700 |
| Negotiation | amber bg-amber-100 text-amber-700 |
| Closed Won / Won | emerald bg-emerald-100 text-emerald-700 |
| Closed Lost / Lost / Closed | red bg-red-100 text-red-700 |

Renders as `<span>` with `rounded-full px-2.5 py-0.5 text-xs font-medium`. Uses shadcn `Badge` as base.

---

### 3.5 PriorityDot

A small coloured dot + optional label indicating ticket priority. Used in the Tickets list.

**Props:**
- `priority: "low" | "medium" | "high" | "urgent"`
- `showLabel?: boolean` — default false; when true renders the label text beside the dot

**Colour map:**
- `low` → gray-400
- `medium` → amber-400
- `high` → orange-500
- `urgent` → red-600

Rendered as a flex row with a `w-2 h-2 rounded-full` dot + optional `text-sm` label.

---

### 3.6 OwnerSelect

A combobox (shadcn `Command` inside a `Popover`) for selecting a team member as owner/assignee.

**Props:**
- `value: string | null` — selected user ID
- `onChange: (userId: string | null) => void`
- `users: { id: string; name: string; email: string; avatarUrl?: string }[]`
- `placeholder?: string` — defaults to "Assign owner"
- `disabled?: boolean`

**Behaviour:**
- Trigger renders selected user's avatar + name, or placeholder text when empty
- Popover opens a searchable list of users (Command component)
- Each option shows avatar (or initials fallback) + name + email
- "Unassign" option at top clears selection
- Closes on selection

---

### 3.7 TagInput

A multi-tag freeform input that lets users type and add string tags. Used in Contact create/edit.

**Props:**
- `value: string[]` — current tags
- `onChange: (tags: string[]) => void`
- `placeholder?: string` — defaults to "Add tag..."
- `maxTags?: number` — defaults to 20

**Behaviour:**
- Renders existing tags as chips (rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs) with an ✕ remove button
- Pressing Enter or comma after typing adds a tag (trimmed, lowercase, deduplicated)
- Pressing Backspace on empty input removes the last tag
- When `maxTags` is reached, input is hidden

---

### 3.8 EmptyState

A centered empty-state illustration block for empty list pages or empty sections.

**Props:**
- `icon?: LucideIcon` — default: `InboxIcon`
- `title: string`
- `description?: string`
- `action?: { label: string; href?: string; onClick?: () => void }` — optional CTA button

**Layout:**
- Centered in its container, `py-16`
- Icon rendered at `w-12 h-12 text-gray-300 mx-auto mb-4`
- Title in `text-lg font-semibold text-gray-900`
- Description in `text-sm text-gray-500 mt-1`
- CTA as indigo `Button` variant="default" `mt-6`

---

### 3.9 PageHeader

The top bar of every list page showing the page title, optional subtitle, and primary action buttons.

**Props:**
- `title: string`
- `subtitle?: string`
- `actions?: ReactNode` — rendered right-aligned (e.g. "New Contact" button)

**Layout (from CRM Contacts List screen):**
- `flex items-center justify-between mb-6`
- Left: title in `text-2xl font-bold text-gray-900` + subtitle `text-sm text-gray-500 mt-0.5`
- Right: `actions` slot — typically one or two `<Button>` components

---

### 3.10 ConfirmDialog

A modal confirmation dialog for destructive actions (delete contact, remove team member).

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `title: string`
- `description: string`
- `confirmLabel?: string` — defaults to "Delete"
- `onConfirm: () => Promise<void>`
- `isPending?: boolean` — disables buttons + shows spinner on confirm

**Layout:**
- Uses shadcn `Dialog`
- Confirm button is `variant="destructive"`, disabled + spinner when `isPending`
- Cancel button is `variant="outline"`, always enabled

---

### 3.11 SearchInput

A debounced search input with a Search icon prefix. Used in every list page.

**Props:**
- `value: string`
- `onChange: (value: string) => void`
- `placeholder?: string` — defaults to "Search..."
- `debounceMs?: number` — defaults to 300
- `className?: string`

**Behaviour:**
- Renders a `<div>` with `relative` positioning; Search icon (`lucide-react`) at left inside input
- Input value is debounced before calling `onChange` — component manages internal state
- Clear (✕) button appears when value is non-empty; clicking resets to ""
- `w-64` default width; caller can override via `className`

---

## 4. Files to Create

```
src/components/shared/
├── DataTable.tsx
├── CrudForm.tsx
├── ActivityTimeline.tsx
├── StatusBadge.tsx
├── PriorityDot.tsx
├── OwnerSelect.tsx
├── TagInput.tsx
├── EmptyState.tsx
├── PageHeader.tsx
├── ConfirmDialog.tsx
├── SearchInput.tsx
└── __tests__/
    ├── DataTable.unit.test.tsx
    ├── CrudForm.unit.test.tsx
    ├── ActivityTimeline.unit.test.tsx
    ├── StatusBadge.unit.test.tsx
    ├── PriorityDot.unit.test.tsx
    ├── OwnerSelect.unit.test.tsx
    ├── TagInput.unit.test.tsx
    ├── EmptyState.unit.test.tsx
    ├── PageHeader.unit.test.tsx
    ├── ConfirmDialog.unit.test.tsx
    └── SearchInput.unit.test.tsx
```

---

## 5. Zod Schemas

No Zod schemas are defined in this module. Shared components are pure UI components with no server-side validation. Their prop contracts are enforced by TypeScript interfaces only.

---

## 6. Server Actions

No server actions. Shared components are stateless UI primitives. All data fetching and mutations happen in the module-specific actions that use these components.

---

## 7. User Stories

**US-01** — As a Sales Rep, I want a consistent data table with sorting and pagination so that I can browse large lists without losing my place.

**US-02** — As a Sales Rep, I want to search any list with a debounced input so that results update without hammering the server.

**US-03** — As a Sales Manager, I want status badges to be colour-coded consistently so that I can scan pipeline health at a glance.

**US-04** — As a Sales Rep, I want a reusable form shell so that every create/edit form looks and behaves identically.

**US-05** — As a Support Agent, I want a priority dot on every ticket row so that I can immediately spot urgent issues.

**US-06** — As an Org Admin, I want a confirm dialog before any delete so that I cannot accidentally destroy data.

**US-07** — As a Sales Rep, I want to assign an owner via a searchable combobox so that I can find team members quickly in large orgs.

**US-08** — As a Sales Rep, I want to add and remove tags freely with a tag-chip input so that I can categorise contacts without a fixed list.

**US-09** — As any user, I want to see a descriptive empty state when a list has no data so that I know the page is working and what to do next.

**US-10** — As any user, I want a uniform page header with title and action buttons so that every list page feels consistent.

**US-11** — As a Sales Rep, I want to see a chronological activity timeline on any detail page so that I can follow the full history of a contact or deal.

---

## 8. Acceptance Criteria

**AC-01** — DataTable renders skeleton rows while loading  
Given the `isLoading` prop is true,  
When the DataTable is mounted,  
Then 5 skeleton rows are shown matching the column count, and no data rows are visible.

**AC-02** — DataTable renders empty state when data is empty  
Given `data` is an empty array and `isLoading` is false,  
When the DataTable renders,  
Then the `emptyState` node (or default `<EmptyState />`) is displayed.

**AC-03** — DataTable sort triggers callback  
Given the DataTable has columns with `enableSorting: true`,  
When the user clicks a column header,  
Then `onSortChange` is called with the column id and direction ("asc" then "desc" on second click).

**AC-04** — DataTable pagination triggers callback  
Given `pageCount > 1`,  
When the user clicks "Next",  
Then `onPageChange` is called with `page + 1`.

**AC-05** — CrudForm disables submit while pending  
Given `isPending` is true,  
When the CrudForm renders,  
Then the submit button is disabled and shows a loading spinner.

**AC-06** — CrudForm calls onSubmit with form values  
Given a valid form state,  
When the user submits the form,  
Then `onSubmit` is called exactly once with the form values.

**AC-07** — ActivityTimeline renders correct icon per type  
Given an activity of type "call",  
When ActivityTimeline renders,  
Then a Phone icon appears for that item.

**AC-08** — ActivityTimeline shows skeleton when loading  
Given `isLoading` is true,  
When ActivityTimeline renders,  
Then 3 skeleton timeline items are visible.

**AC-09** — StatusBadge renders correct colour for "Closed Won"  
Given `status="Closed Won"`,  
When StatusBadge renders,  
Then the badge has emerald background and emerald text classes.

**AC-10** — PriorityDot renders correct colour for "urgent"  
Given `priority="urgent"`,  
When PriorityDot renders,  
Then the dot has `bg-red-600`.

**AC-11** — PriorityDot shows label when showLabel is true  
Given `priority="high"` and `showLabel={true}`,  
When PriorityDot renders,  
Then the text "high" is visible beside the dot.

**AC-12** — OwnerSelect calls onChange with selected user id  
Given a list of users in the dropdown,  
When the user selects a user,  
Then `onChange` is called with that user's id.

**AC-13** — OwnerSelect "Unassign" clears selection  
Given a user is currently selected,  
When the user clicks "Unassign",  
Then `onChange` is called with `null`.

**AC-14** — TagInput adds tag on Enter  
Given the input has value "enterprise",  
When the user presses Enter,  
Then "enterprise" is added to the tags array and the input clears.

**AC-15** — TagInput removes tag on ✕  
Given the tag "enterprise" is present,  
When the user clicks its ✕ button,  
Then the tag is removed from the array.

**AC-16** — TagInput does not add duplicate tags  
Given "enterprise" is already in the tag list,  
When the user types "enterprise" and presses Enter,  
Then no duplicate is added.

**AC-17** — TagInput hides input at maxTags  
Given `maxTags={3}` and 3 tags are already present,  
When TagInput renders,  
Then the text input is not visible.

**AC-18** — EmptyState renders action CTA when action prop is provided  
Given `action={{ label: "New Contact", href: "/contacts/new" }}`,  
When EmptyState renders,  
Then a "New Contact" button is visible.

**AC-19** — PageHeader renders title and actions  
Given `title="Contacts"` and an actions slot with a Button,  
When PageHeader renders,  
Then the title text and action button are both visible.

**AC-20** — ConfirmDialog calls onConfirm when confirmed  
Given the dialog is open,  
When the user clicks the confirm button,  
Then `onConfirm` is called.

**AC-21** — ConfirmDialog disables buttons while pending  
Given `isPending` is true,  
When ConfirmDialog renders,  
Then both the confirm and cancel buttons are disabled.

**AC-22** — SearchInput debounces onChange  
Given `debounceMs={300}`,  
When the user types "foo",  
Then `onChange` is not called immediately but is called after 300ms with "foo".

**AC-23** — SearchInput clear button resets value  
Given the input has value "foo",  
When the user clicks the ✕ clear button,  
Then `onChange` is called with "" and the input displays empty.

---

## 9. Permissions Matrix

Shared components themselves are not access-controlled — they are UI primitives. Access is enforced by the module pages that use them. No permission gates exist inside these components.

| Component | Who can see it |
|-----------|---------------|
| All shared components | Any authenticated user (enforced by dashboard layout middleware) |

---

## 10. Business Rules

**BR-01** — No DB calls inside shared components. Data must be passed in via props from server components or TanStack Query hooks in the parent module.

**BR-02** — No shared component may import from `src/lib/db/`, `src/lib/actions/`, or any provider SDK.

**BR-03** — StatusBadge must handle unknown status values gracefully — render a gray badge with the raw value rather than throwing.

**BR-04** — TagInput values must be trimmed and lowercased before adding to the array.

**BR-05** — SearchInput must debounce — it must never call `onChange` on every keystroke. Default debounce is 300ms.

**BR-06** — DataTable pagination must always be 1-indexed (page 1 = first page).

**BR-07** — ConfirmDialog confirm button must be `variant="destructive"` — never indigo primary.

**BR-08** — All components must be accessible: interactive elements need `aria-label`, dialogs trap focus, keyboard navigation works on all interactive components.

---

## 11. Error Cases

| Component | Error Case | Behaviour |
|-----------|-----------|-----------|
| DataTable | `data` is undefined | Treat as empty, show empty state |
| DataTable | `pageCount` is 0 | Hide pagination controls |
| StatusBadge | Unknown status string | Render gray badge with raw value |
| OwnerSelect | `users` is empty array | Show "No team members found" in dropdown |
| TagInput | Tag exceeds 50 chars | Silently truncate to 50 chars |
| ActivityTimeline | `activities` is empty | Render a plain "No activity yet" message |
| ConfirmDialog | `onConfirm` throws | Error propagates — caller handles via toast |

---

## 12. Design Reference

| Screen | ID | Used for |
|--------|----|---------|
| CRM Contacts List | `c744ca79a3b14fb49ca284b552f1c7f0` | DataTable, SearchInput, PageHeader, StatusBadge |
| CRM Contact Detail | `b2ac0c027cd748b19c899e117c670912` | ActivityTimeline, TagInput, OwnerSelect |
| CRM Sales Dashboard | `e960e51133dd4a189eec69ab8a3c317c` | Overall color/typography/spacing system |

**Design tokens (all screens):**
- Primary: Indigo `#4F46E5`
- Background: `gray-50`
- Surfaces: white
- Font: Inter (`font-sans`)
- Border radius: `rounded-lg` (8px) for cards, `rounded-full` for badges/dots/tags

---

## 13. Unit Test Cases

Each test lives in `src/components/shared/__tests__/`.

| Test File | AC | What to test |
|-----------|-----|-------------|
| `DataTable.unit.test.tsx` | AC-01 | Skeleton rows render when `isLoading=true` |
| `DataTable.unit.test.tsx` | AC-02 | EmptyState renders when `data=[]` |
| `DataTable.unit.test.tsx` | AC-03 | `onSortChange` called on header click |
| `DataTable.unit.test.tsx` | AC-04 | `onPageChange` called on Next click |
| `CrudForm.unit.test.tsx` | AC-05 | Submit disabled + spinner when `isPending=true` |
| `CrudForm.unit.test.tsx` | AC-06 | `onSubmit` called with form values |
| `ActivityTimeline.unit.test.tsx` | AC-07 | Phone icon for call activity |
| `ActivityTimeline.unit.test.tsx` | AC-08 | Skeleton items when `isLoading=true` |
| `StatusBadge.unit.test.tsx` | AC-09 | Emerald classes for "Closed Won" |
| `PriorityDot.unit.test.tsx` | AC-10 | `bg-red-600` class for "urgent" |
| `PriorityDot.unit.test.tsx` | AC-11 | Label text visible when `showLabel=true` |
| `OwnerSelect.unit.test.tsx` | AC-12 | `onChange` called with user id on select |
| `OwnerSelect.unit.test.tsx` | AC-13 | `onChange(null)` called on Unassign |
| `TagInput.unit.test.tsx` | AC-14 | Tag added on Enter |
| `TagInput.unit.test.tsx` | AC-15 | Tag removed on ✕ click |
| `TagInput.unit.test.tsx` | AC-16 | Duplicate tag not added |
| `TagInput.unit.test.tsx` | AC-17 | Input hidden at maxTags |
| `EmptyState.unit.test.tsx` | AC-18 | Action button rendered when action prop given |
| `PageHeader.unit.test.tsx` | AC-19 | Title and actions slot both visible |
| `ConfirmDialog.unit.test.tsx` | AC-20 | `onConfirm` called on confirm click |
| `ConfirmDialog.unit.test.tsx` | AC-21 | Buttons disabled when `isPending=true` |
| `SearchInput.unit.test.tsx` | AC-22 | `onChange` debounced by 300ms |
| `SearchInput.unit.test.tsx` | AC-23 | Clear button calls `onChange("")` |

---

## 14. E2E Test Cases

No standalone E2E tests for shared components — they are headless primitives. E2E coverage is provided by the Contacts and Leads modules, which exercise DataTable, SearchInput, PageHeader, StatusBadge, CrudForm, ConfirmDialog, and ActivityTimeline in real user flows.

> Note: If the team wants isolated component E2E tests in future, use Storybook + Playwright component testing. Out of scope for v1.
