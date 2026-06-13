---
description: >
  Push the current branch, open a GitHub Pull Request with a structured
  description, and print the PR URL. Use when the user says "create PR",
  "open PR", "push and PR", or "raise a pull request".
allowed-tools: Bash(git *), Bash(gh pr *), Bash(gh repo *)
argument-hint: "[target base branch — default: main]"
---

## Context

Current branch:
!`git branch --show-current`

Commits not yet in main:
!`git log main..HEAD --oneline`

Full diff vs main:
!`git diff main...HEAD`

Existing open PRs (duplicate check):
!`gh pr list --state open --limit 10`

## Your task

**Step 1 — Push**
```bash
git push -u origin $(git branch --show-current)
```

**Step 2 — Build PR description** using this exact template — fill EVERY section:

```markdown
## What this PR does
<!-- 2-3 sentence summary of the change -->

## Changes
<!-- bullet list: one line per file group changed -->

## How to test
1. <!-- step -->
2. <!-- step -->

## Screenshots
<!-- delete if no UI changes; note which Figma frame was referenced -->

## Checklist
- [ ] Tests pass (`npx vitest run`)
- [ ] E2E tests pass (`npx playwright test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No duplicate components — only imports from `src/components/shared/`
- [ ] Figma design matched (UI changes only)
- [ ] Auth guard present on every server action
```

**Step 3 — Create the PR**
```bash
gh pr create \
  --base ${ARGUMENTS:-main} \
  --title "<conventional-commit-style title derived from commits above>" \
  --body "<filled template from step 2>" \
  --label "needs-review"
```

**Step 4 — Update TASKS.md**
Mark the PR column as ✅ Done for the module this PR covers in `TASKS.md`.

**Step 5 — Print**
```
✓ PR created: <PR URL>
  Title : <title>
  Base  : <base branch>
```
