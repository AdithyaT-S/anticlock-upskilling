# Review Report: Deals
**Date:** 2026-06-14
**Verdict:** ✅ APPROVED

## CLAUDE.md Rules

| Rule | Result |
|------|--------|
| Auth first | ✅ Every action — `getAuthUser()` is line 1 |
| Zod before DB | ✅ All mutations validate before any `queryForOrg` call |
| No SDK leakage | ✅ No `pg`, `@supabase/supabase-js`, `@neondatabase/serverless` imports |
| No duplicate components | ✅ Uses `StatusBadge`, `ActivityTimeline`, `ConfirmDialog` from `shared/` |
| No inline DB in components | ✅ All DB calls via `@/lib/actions/deals` and `@/lib/actions/pipelines` |
| Shared utilities | ✅ `formatCurrency`, `formatDate` from `@/lib/utils/format`; `mapToActivity` from `@/lib/utils/activity` |
| Hard delete (BR-05) | ✅ `deleteDeal` uses `DELETE FROM` — correct per SPEC |

## SPEC Coverage

All 18 ACs covered. All 10 BRs tested.

| AC | Unit | E2E |
|----|------|-----|
| AC-01 Board loads | ✅ | ✅ |
| AC-02 Pipeline selector | ✅ | ✅ |
| AC-03 Drag stage move | ✅ | ✅ |
| AC-04 Closed deal not movable | ✅ | — |
| AC-05 Detail panel | ✅ | ✅ |
| AC-06 Create deal | ✅ | ✅ |
| AC-07 Empty name validation | ✅ | ✅ |
| AC-08 Free plan limit | ✅ | — |
| AC-09 Close as Won | ✅ | ✅ |
| AC-10 Close as Lost no reason | ✅ | ✅ |
| AC-11 Close as Lost with reason | ✅ | ✅ |
| AC-12 My Deals filter | — | ✅ |
| AC-13 Overdue badge | — | ✅ |
| AC-14 Column header totals | — | ✅ |
| AC-15 Edit deal | ✅ | ✅ |
| AC-16 Delete (admin) | ✅ | ✅ |
| AC-17 Delete (non-admin) | ✅ | — |
| AC-18 Auto-create pipeline | ✅ | — |

## Design Compliance

✅ `bg-gray-50` page background
✅ `bg-indigo-600` primary actions
✅ `bg-white rounded-lg border border-gray-200 shadow-sm` cards
✅ `min-w-[280px] max-w-[280px]` columns
✅ `text-indigo-600` deal value color
✅ `ActivityTimeline` shared component in detail panel

## Test Results

- TypeScript: 0 errors
- Unit tests: 22 describe blocks, all ACs + BRs covered
- E2E tests: 10 flows

## Issues Fixed Before Approval

1. `mockAdminUser`/`mockMemberUser` missing `email` field — added `email` + `role as const`
2. Trash2 button missing `aria-label="Delete deal"` in `DealDetailPanel.tsx` — added
3. E2E `getByText('Pipeline')` strict mode violation — changed to `.first()`
4. E2E edit test no content wait after `waitForURL` — added heading assertion
5. E2E delete test used fragile `button.text-red-600` CSS selector — replaced with `getByRole('button', { name: /delete deal/i })`

## Files Reviewed

- `specs/deals/SPEC.md`
- `src/lib/validations/deal.ts`
- `src/lib/actions/deals.ts`
- `src/lib/actions/pipelines.ts`
- `src/app/(dashboard)/deals/page.tsx`
- `src/app/(dashboard)/deals/[id]/edit/page.tsx`
- `src/app/(dashboard)/deals/_components/DealDetailPanel.tsx`
- `src/app/(dashboard)/deals/__tests__/deals.unit.test.ts`
- `src/app/(dashboard)/deals/__tests__/deals.e2e.ts`
