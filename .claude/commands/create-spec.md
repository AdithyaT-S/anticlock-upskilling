# Command: /create-spec

**Usage**: `/create-spec {ModuleName}`
**Example**: `/create-spec Contacts`

---

## What this command does

Generates a complete SPEC.md for a FreshCRM module before any code is written.
Runs the Product Agent, then fetches the Stitch design screen for UI context.
Does NOT generate any code — spec only.

---

## Steps

### Step 0 — Branch setup + pre-flight
Run these git commands before anything else:
```bash
git checkout main
git pull origin main
git checkout -b feat/{module-kebab}
```
Then:
- Read `CLAUDE.md` for stack rules and module build order
- Read `docs/BRD.md` for business requirements and personas
- Read `agents/spec-writer.md` for spec writing rules
- Confirm the module is in the build order and not already built

### Step 1 — Fetch Stitch design
- Read `.claude/skills/stitch-design/SKILL.md`
- Use the Stitch MCP `get_screen` tool to fetch the relevant screen for this module
- Note layout, components, color usage, and interaction patterns from the screen

### Step 2 — Generate SPEC.md
Using the Product Agent rules and Stitch screen context, produce:
`specs/{module-kebab}/SPEC.md`

Never place SPEC.md inside `src/app/` — all specs live under `specs/` at the project root.

The SPEC.md must include all sections — no placeholders:
1. What this module does (1 paragraph)
2. Routes (path, page, access)
3. Pages & components
4. Files to create (exact paths)
5. Zod schemas with field types
6. Server actions with step-by-step logic
7. User stories (`As a {role}, I want to {action} so that {outcome}`)
8. Acceptance criteria (Given/When/Then — numbered AC-01, AC-02...)
9. Permissions matrix (Admin / Manager / Sales Rep)
10. Business rules (BR-01, BR-02...)
11. Error cases
12. Design reference (Stitch screen ID)
13. Unit test cases (maps to each AC)
14. E2E test cases (maps to critical user flows)

### Step 3 — Summary
Print:
```
✅ Spec created: specs/{module}/SPEC.md

Stitch screen used: {screen name} ({screen ID})
Acceptance criteria: {count} ACs defined
User stories: {count} stories

Next step: Review the spec, then run /implement-module {ModuleName}
```

---

## Rules

- Do not create any application code files
- Do not modify existing files outside the module's SPEC.md
- Every AC must be testable (Given/When/Then format)
- Every field in Zod schema must have a type and validation rule
- Stitch screen must be fetched — never design UI from imagination
