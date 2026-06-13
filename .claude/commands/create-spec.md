---
model: sonnet
---

# Command: /create-spec

**Usage**: `/create-spec {ModuleName}`
**Example**: `/create-spec Contacts`

Generates a complete SPEC.md before any code is written. No application code produced here.

---

## Steps

### Step 0 — Branch setup + pre-flight
```bash
git checkout main && git pull origin main && git checkout -b feat/{module-kebab}
```
- Read `docs/BRD.md` — personas, features in scope, business rules
- Read `.claude/skills/stitch-design/SKILL.md`
- Confirm the module is in the build order and not already built

### Step 1 — Fetch Stitch design
Use MCP `get_screen` for this module's screen. Note: layout, components, color, interactions.

### Step 2 — Generate SPEC.md
Produce: `specs/{module-kebab}/SPEC.md` (never inside `src/app/`)

All 14 sections required — no placeholders:
1. What this module does (1 paragraph)
2. Routes (path, page, access)
3. Pages & components
4. Files to create (exact paths)
5. Zod schemas with field types and validation rules
6. Server actions with step-by-step logic
7. User stories — format: `As a {Sales Rep|Manager|Admin}, I want to {action} so that {outcome}`
8. Acceptance criteria — format: `Given {state}, When {action}, Then {response}` — numbered AC-01, AC-02...
9. Permissions matrix (Admin / Manager / Sales Rep) — View list, View detail, Create, Edit own, Edit any, Delete
10. Business rules — format: constraint statement — numbered BR-01, BR-02...
11. Error cases
12. Design reference (Stitch screen ID)
13. Unit test cases (one per AC)
14. E2E test cases (one per critical user flow)

**Standards:**
- ACs must be independently testable — no implementation details ("when the SQL runs" is forbidden)
- Business rules must be enforceable in code
- Every Zod field must have a type and at least one validation rule

### Step 3 — Summary
```
✅ Spec created: specs/{module}/SPEC.md
Stitch screen: {name} ({ID})
ACs: {count} | User stories: {count}
Next: review the spec, then run /implement-module {ModuleName}
```

---

## Rules

- No application code files
- No modifications outside the module's SPEC.md
- Stitch screen must be fetched — never design UI from imagination
