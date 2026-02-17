---
name: commit
description: Create a conventional commit with staged changes
disable-model-invocation: true
allowed-tools: Bash(git:*)
---

# Create Conventional Commit

Commit staged changes using conventional commit format: `type(scope): description`

## Types

- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance/refactor/tooling
- `test:` - Tests only
- `docs:` - Documentation
- `tests:` - Tests

## Process

1. Review staged changes: `git diff --cached`
2. Determine type, optional scope, and description (imperative, <70 chars)
3. Commit using HEREDOC:
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): description
   EOF
   )"
   ```
4. Verify: `git log -1`

## Notes

- Description: imperative mood, lowercase, no period
- Body: explain WHY, not WHAT (code shows what). Keep it consice and brief.
