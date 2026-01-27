---
name: raise-pr
description: Create a pull request with auto-filled template. Pass 'commit' to commit staged changes first.
disable-model-invocation: true
allowed-tools: Bash(gh:*, git:*), Read
argument-hint: [commit?]
---

# Raise Pull Request

Create a PR with auto-filled template from commits after origin/main.

## Arguments

- No argument: Create PR with existing commits
- `commit`: Commit staged changes first, then create PR

## Process

1. **If `$ARGUMENTS` is "commit"**: Review staged changes and commit with descriptive message
    - Check for staged changes: `git diff --cached --stat`
    - If changes exist:
        - Review the changes: `git diff --cached`
        - Create a short and clear commit message based on the changes
        - Commit command: `git commit -m "message"`

2. **Analyze commits since origin/main**:
   - `git log origin/main..HEAD --pretty=format:"%s%n%b"` - get commit messages
   - `git diff origin/main...HEAD --stat` - see changes

3. **Read template**: `.github/pull_request_template.md`

4. **Generate PR**:
   - **Title**: Short (<70 chars), from commit messages or main change
   - **Body**: Fill template sections based on commits/changes:
     - Summary (why/what/approach) - end with "Closes #<issue_number>" if issue number is available from branch name (git branch --show-current)
     - Change Type checkboxes
     - Bug Context (if applicable)
     - Testing Strategy
     - Risk Assessment
     - Changelog (if user-facing)
     - Checklist

5. **Create PR**:
   ```bash
   git push -u origin $(git branch --show-current)
   gh pr create --base main --title "..." --body "..."
   gh pr view
   ```

## Notes

- Analyze ALL commits messages from origin/main to HEAD
- Fill template sections based on code analysis
- Leave the sections of PR template as it is if you can't determine
