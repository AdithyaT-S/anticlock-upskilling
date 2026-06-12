---
description: >
  Stage all changes, generate a Conventional Commit message, and commit.
  Use when the user says "commit", "commit my changes", or asks for a commit message.
allowed-tools: Bash(git add:*), Bash(git diff:*), Bash(git status:*), Bash(git commit:*), Bash(git log:*)
argument-hint: "[optional scope or extra context]"
---

## Context

Current staged + unstaged diff:
!`git diff HEAD`

Recent commit history (style reference):
!`git log --oneline -8`

Changed files:
!`git status --short`

## Your task

1. Run `git add -A` to stage everything.

2. Analyse the diff above and write ONE Conventional Commit message:

   ```
   <type>(<scope>): <short imperative summary, max 72 chars>

   <body — bullet list of what changed and why, max 5 bullets>

   <footer — only if breaking change or closes an issue>
   ```

   **Types:** feat | fix | refactor | test | docs | chore | style | perf | ci
   **Scope:** contacts | leads | deals | tickets | auth | shared | db | ci | figma | skills

   Match the tone and style of recent commits shown above.

3. Run `git commit -m "<message>"` with the generated message.

4. Print confirmation:
   `✓ Committed: <type>(<scope>): <summary>`

If `git status` shows nothing to commit, print "Nothing to commit." and stop.
