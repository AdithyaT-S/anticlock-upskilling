---
description: >
  Review a pull request for duplicated code, missing tests, missing auth guards,
  Zod validation gaps, and Figma design compliance. Posts inline GitHub comments
  and a final verdict. Use when the user says "review PR <number>" or "check this PR".
allowed-tools: Bash(gh pr *), Bash(gh api *), Bash(git diff:*)
argument-hint: "<PR number>"
---

## PR context

PR details:
!`gh pr view $ARGUMENTS`

PR diff:
!`gh pr diff $ARGUMENTS`

Comments already posted (avoid duplicates):
!`gh pr view $ARGUMENTS --comments`

Changed files:
!`gh pr diff $ARGUMENTS --name-only`

## Your task

Review the diff against all FreshCRM production rules. Post inline GitHub review
comments for every issue. Then post a summary review.

---

### Checklist — evaluate every item

**No duplication**
- [ ] No component re-created that already exists in `src/components/shared/`
- [ ] No inline Supabase call inside a React page or component
- [ ] No duplicate Zod schema for an entity already in `lib/validations/`

**Auth & security**
- [ ] Every server action (`'use server'`) has auth check as its FIRST statement
- [ ] Every API route handler (`/api/`) checks auth before any DB call
- [ ] `org_id` always comes from the auth session — never from user input

**Validation**
- [ ] Every form uses `zodResolver` — no manual `if (!email)` guards
- [ ] Every server action calls `schema.safeParse()` before any DB mutation

**Tests**
- [ ] Unit tests exist in `__tests__/` for new server actions and Zod schemas
- [ ] Tests cover: valid input ✓ | invalid input ✓ | auth guard ✓ | success ✓ | DB error ✓
- [ ] E2E test exists for any new user-facing page or flow

**Figma compliance (UI changes only)**
- [ ] Component names match Figma layer names exactly
- [ ] Only Tailwind classes used — no hardcoded hex colours
- [ ] Typography uses `font-sans` / Inter — no other font families

---

### How to post inline comments

For each issue, post to the specific file + line:
```bash
gh api repos/:owner/:repo/pulls/$ARGUMENTS/comments \
  --method POST \
  --field body="**[FreshCRM Rule violated]** <clear description of issue>

**Fix:** <one-sentence concrete fix>" \
  --field commit_id="$(gh pr view $ARGUMENTS --json headRefOid -q .headRefOid)" \
  --field path="<relative file path>" \
  --field line=<line number>
```

---

### Final review summary

After all inline comments are posted:

```bash
gh pr review $ARGUMENTS \
  --comment \
  --body "## AI Code Review — FreshCRM

**Issues found:** <N>

<bullet list of all issues with file references>

---
**Verdict:** <one of:>
✓ LGTM — no issues found
⚠️ REQUEST CHANGES — <N> issues must be fixed before merge"
```

If zero issues found, approve:
```bash
gh pr review $ARGUMENTS --approve \
  --body "✓ All FreshCRM production rules pass. Ready to merge."
```
