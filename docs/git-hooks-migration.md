# Git Hooks Migration Guide

## Why Migrate Pre-commit to Pre-push?

The cc-pars auto-commit system needs to make frequent "WIP" commits to track your work and detect deviations. Traditional pre-commit hooks that enforce lint/test standards would block this workflow.

By moving quality gates to pre-push, you get:
- ✅ Frequent local commits for checkpointing
- ✅ Clean history when sharing (after squashing)
- ✅ Quality enforcement before code reaches others
- ✅ Easy reversion when AI goes off-track

## Migration Steps

### 1. Move Existing Pre-commit Hook

```bash
# If using git hooks directly
mv .git/hooks/pre-commit .git/hooks/pre-push

# If using husky
# Edit .husky/pre-commit and rename to .husky/pre-push
```

### 2. Update Hook Configurations

#### For Husky Users

Edit `package.json`:
```json
{
  "husky": {
    "hooks": {
      // Remove this:
      // "pre-commit": "lint-staged"
      
      // Add this:
      "pre-push": "npm run pre-push-checks"
    }
  },
  "scripts": {
    "pre-push-checks": "npm run lint && npm test"
  }
}
```

#### For Lint-staged Users

Move from pre-commit to manual run before push:
```json
{
  "scripts": {
    "prepare-push": "lint-staged && npm test"
  }
}
```

### 3. Create Pre-push Hook (if not using Husky)

Create `.git/hooks/pre-push`:
```bash
#!/bin/sh

echo "Running pre-push checks..."

# Run lint
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint failed. Fix issues before pushing."
  exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Fix issues before pushing."
  exit 1
fi

echo "✅ All checks passed!"
```

Make it executable:
```bash
chmod +x .git/hooks/pre-push
```

## Workflow with cc-pars

### Daily Development Flow

1. **Work normally** - Let cc-pars auto-commit WIP changes
2. **Review work** - Check for deviations with `git log --oneline`
3. **Prepare to share** - Run `bun run scripts/git-session.ts prepare-push`
4. **Push clean commits** - `git push origin <branch>`

### Handling Deviations

When the Stop hook detects a deviation:

```bash
# See what went wrong
git diff HEAD~1

# The hook will prompt you to fix the issues
# If you need to revert, get the command:
bun run scripts/git-session.ts show-revert-command

# Then manually run it if needed:
# git reset --hard <commit>
```

### Squashing WIP Commits

Before pushing or creating a PR:

```bash
# Automatic squash to single commit
bun run scripts/git-session.ts squash-session

# Or interactive rebase for more control
git rebase -i <last-user-commit>
```

## Configuration Options

### Strict Mode (Block bad commits)
```json
{
  "cc-pars": {
    "stop-hook": {
      "auto-revert-on-critical": true,
      "block-on-deviation": true
    }
  }
}
```

### Relaxed Mode (Warn only)
```json
{
  "cc-pars": {
    "stop-hook": {
      "auto-revert-on-critical": false,
      "block-on-deviation": false
    }
  }
}
```

## FAQ

**Q: What if I need to push WIP commits?**
A: Use `git push --no-verify` to bypass pre-push hooks when needed.

**Q: Can I still run checks before committing?**
A: Yes! Run `npm run lint` or `npm test` manually anytime.

**Q: How do I disable auto-commits temporarily?**
A: Comment out the Stop hook in `.claude/settings.json`.

**Q: What about commit message standards?**
A: WIP commits are temporary. Enforce standards when squashing for the final commit.

## Example Setup for a TypeScript Project

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "pre-push-checks": "npm run lint && npm run typecheck && npm test",
    "prepare-push": "bun run scripts/git-session.ts prepare-push"
  }
}
```

```bash
# .git/hooks/pre-push
#!/bin/sh
npm run pre-push-checks
```

Now your quality gates run only when sharing code, not during exploratory work!