---
description: >
  Read all open review comments on the current PR, fix each one in the code,
  reply to the thread with the commit hash, and resolve the thread.
  Use when the user says "fix PR comments", "address review", or "resolve feedback".
allowed-tools: Bash(gh pr *), Bash(gh api *), Bash(git *), Read, Edit
argument-hint: "[PR number — defaults to current branch's open PR]"
---

## Context

Current branch:
!`git branch --show-current`

PR number (auto-detected if not supplied):
!`gh pr list --head $(git branch --show-current) --json number -q '.[0].number'`

Open (unresolved) review threads:
!`gh pr view ${ARGUMENTS:-$(gh pr list --head $(git branch --show-current) --json number -q '.[0].number')} --json reviewThreads -q '[.reviewThreads[] | select(.isResolved == false) | {id: .id, path: .path, line: (.comments[0].originalLine // .comments[0].line), body: .comments[0].body, author: .comments[0].author.login}]'`

## Your task

For EACH unresolved thread listed above, do the following in order:

**1. Read the file**
Open the file at `path` and understand the context around `line`.

**2. Fix the issue**
Apply the fix described in `body`. Follow CLAUDE.md rules:
- Duplicated component → replace with import from `src/components/shared/`
- Missing auth guard → add `const user = await getAuthUser(); if (!user) return { error: 'Unauthorized' }` as line 1
- Missing zodResolver → wrap form with `zodResolver(schema)`
- Missing test → create test in `__tests__/` following the `test-unit` skill
- Missing Zod parse → add `const parsed = schema.safeParse(data); if (!parsed.success) return { error: parsed.error.flatten() }`

**3. Stage and commit the fix**
```bash
git add <changed file(s)>
git commit -m "fix: address PR review — <one line description of what was fixed>"
```

**4. Reply to the thread**
```bash
COMMIT_HASH=$(git rev-parse --short HEAD)
gh api graphql -f query='
  mutation AddReply($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId,
      body: $body
    }) { comment { id } }
  }' \
  -f threadId="<thread id from above>" \
  -f body="Fixed in $COMMIT_HASH — <one sentence: what you changed and why>"
```

**5. Resolve the thread**
```bash
gh api graphql -f query='
  mutation ResolveThread($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { isResolved }
    }
  }' \
  -f threadId="<thread id from above>"
```

Repeat steps 1–5 for every unresolved thread.

---

**After all threads are resolved**, run the full test suite:
```bash
npx vitest run && npx tsc --noEmit
```

Print final summary:
```
✓ Fixed <N> review comments
✓ All tests pass
✓ Push with: git push
```
