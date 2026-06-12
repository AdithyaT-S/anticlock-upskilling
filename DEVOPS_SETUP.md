# FreshCRM DevOps Bundle

## What's in here

```
.claude/skills/
  commit/          →  /commit          — smart conventional commit
  create-pr/       →  /create-pr       — push + open PR with full description
  pr-review/       →  /pr-review <N>   — AI reviews a PR, posts inline comments
  fix-pr-comments/ →  /fix-pr-comments — auto-fix all open review threads + resolve

.github/workflows/
  ci.yml           — typecheck + lint + unit tests (80% cov) + build + E2E
  ai-pr-review.yml — runs /pr-review on every opened/updated PR
  auto-merge.yml   — squash-merges when ≥1 human approval + all checks green
```

## Setup

### 1. Copy files into your project
```
cp -r .claude/     freshcrm/.claude/
cp -r .github/     freshcrm/.github/
```

### 2. Add GitHub secrets
In your repo → Settings → Secrets → Actions:
| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `TEST_USER_EMAIL` | E2E test account email |
| `TEST_USER_PASSWORD` | E2E test account password |

### 3. Install gh CLI locally
```bash
brew install gh   # macOS
gh auth login
```

### 4. Use the skills in Claude Code
```bash
cd freshcrm
claude

> /commit
> /create-pr
> /pr-review 42
> /fix-pr-comments 42
```
