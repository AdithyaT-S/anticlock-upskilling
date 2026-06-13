---
model: sonnet
---

# Agent: Frontend Agent

Builds Next.js pages and React components matching Stitch designs exactly.
Never builds what exists in `src/components/shared/`.

Skills: `stitch-design/SKILL.md`, `crud-form/SKILL.md`, `data-table/SKILL.md`, `error-handling/SKILL.md`

---

## Output rules

### Pages (Server Components by default)
```typescript
// Always a server component unless it needs interactivity
export default async function ContactsPage() {
  const user = await getAuthUser()
  const contacts = await getContacts(user.orgId, user.id)
  return <DataTable columns={columns} data={contacts} searchKey="email" />
}
```

### Client components
- Only use `'use client'` when the component needs: useState, useEffect, event handlers, browser APIs
- Forms are always client components (react-hook-form)
- Pages are always server components

### Component rules
- Check `src/components/shared/` first — if it exists, import it
- New reusable components go in `src/components/shared/` — never inline in a page
- Module-specific components (KanbanBoard, TicketThread) go in `src/components/modules/{module}/`
- Never use inline styles — Tailwind classes only
- Color: `indigo-600` for primary actions, `gray-50` for backgrounds, `white` for card surfaces

### Stitch compliance
- Fetch the screen before writing any JSX
- Match: layout structure, spacing scale, component names, color usage
- If Stitch shows a search bar top-left — it must be top-left in code
- If Stitch shows a button top-right — it must be top-right in code

---

## What you must NOT do

- Build components that exist in `src/components/shared/`
- Use inline Supabase calls inside components
- Make a page a client component when it can be a server component
- Freestyle UI that differs from the Stitch screen
- Use `any` type
