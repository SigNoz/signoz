# Review Command

Perform a thorough code review following SigNoz's coding conventions and contributing guidelines and any potential bug introduced.

## Usage

Invoke this command to review code changes, files, or pull requests with actionable and concise feedback.

## Process

1. **Determine scope**:
   - Ask user what to review if not specified:
     - Specific files or directories
     - Current git diff (staged or unstaged)
     - Specific PR number or commit range
     - All changes since origin/main

2. **Gather context**:
   ```bash
   # For current changes
   git diff --cached           # Staged changes
   git diff                    # Unstaged changes

   # For commit range
   git diff origin/main...HEAD # All changes since main
   
   # for last commit only
   git diff HEAD~1..HEAD

   # For specific PR
   gh pr view <number> --json files,additions,deletions
   gh pr diff <number>
   ```

3. **Read all relevant files thoroughly**:
   - Use Read tool for modified files
   - Understand the context and purpose of changes
   - Check surrounding code for context

4. **Review against SigNoz guidelines**:
   - **Frontend**: Check [Frontend Guidelines](../../frontend/CONTRIBUTIONS.md)
   - **General**: Check [Contributing Guidelines](../../CONTRIBUTING.md)
   - **Commits**: Verify [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   - **Architecture**: Reference relevant architecture docs if available

5. **Review for any bugs**:
   Review the change for the intent and if the feature or bug actually got fixed, ensure there is no edge case missed. Look for any performance impact and suggest alternative if available.

5. **Provide actionable, concise feedback** in structured format

## Review Checklist

### Frontend (React/TypeScript)

**Export & Imports**:
- [ ] Components use default exports
- [ ] Utilities/hooks/types use named exports
- [ ] No `import React from 'react'` (React 18+)
- [ ] Imports organized (simple-import-sort)

**Component Design**:
- [ ] Small, modular components (Single Responsibility)
- [ ] No inline objects/functions as props
- [ ] Proper use of `useMemo`/`useCallback` (not overused)
- [ ] Functions <40 lines, descriptive names
- [ ] Components in PascalCase, files/folders lowercase

**API Integration**:
- [ ] `useQuery` for fetching data
- [ ] `useMutation` for updates
- [ ] No business logic in API/service files
- [ ] Proper error handling

**Styling**:
- [ ] No inline styles
- [ ] Uses `rem` instead of `px`
- [ ] Follows theme/design system

**Code Quality**:
- [ ] No hard-coded strings (internationalized)
- [ ] No disabled ESLint/TS errors without justification
- [ ] TypeScript types properly defined
- [ ] Accessibility (ARIA, semantic HTML)
- [ ] No complex nested conditionals

### Backend (Go)

**Error Handling**:
- [ ] Uses `pkg/errors` package (not standard library)
- [ ] Errors properly wrapped with context
- [ ] Error codes defined for domain errors
- [ ] All errors handled or propagated

**Code Structure**:
- [ ] Follows provider pattern where applicable
- [ ] Context passed correctly
- [ ] Functions are modular and well-named
- [ ] No `fmt.Errorf` or `fmt.Print*` (use `pkg/errors`, `slog`)

**Database**:
- [ ] Uses Bun ORM via `sqlstore.BunDBCtx(ctx)`
- [ ] Proper use of prepared statements
- [ ] No SQL injection risks
- [ ] Migrations are idempotent

**Performance**:
- [ ] Efficient queries
- [ ] Proper indexing considered
- [ ] No obvious bottlenecks

**Testing**:
- [ ] Unit tests for new functionality
- [ ] Tests use race detector
- [ ] Mock providers used correctly

### General (All Code)

**Security**:
- [ ] No exposed secrets, API keys, credentials
- [ ] No sensitive data in logs
- [ ] Input validation present
- [ ] Authentication/authorization checked

**Documentation**:
- [ ] Code is self-documenting
- [ ] Comments only where needed (explain WHY, not WHAT)
- [ ] Public APIs documented
- [ ] Architecture decisions explained

**Git/Commits**:
- [ ] Commit messages follow `type(scope): description` where scope is optional
- [ ] Commits are atomic and logical

**Performance & Quality**:
- [ ] No obvious performance issues
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Edge cases handled
- [ ] Breaking changes documented

## Output Format

Provide feedback in this structured format:

```markdown
## Code Review

**Scope**: [What was reviewed]
**Overall**: [1-2 sentence summary and general sentiment]

---

### 🚨 Critical Issues (Must Fix)

1. **[Category]** `file:line`
   **Problem**: [What's wrong]
   **Why**: [Why it matters]
   **Fix**: [Specific solution]
   ```[language]
   // Example fix if helpful
   ```

### ⚠️ Suggestions (Should Consider)

1. **[Category]** `file:line`
   **Issue**: [What could be improved]
   **Suggestion**: [Concrete improvement]

### ✅ Positive Highlights

- [Good practice observed]
- [Well-implemented feature]

---

**References**:
- [Relevant guideline links]
```

## Review Categories

Use these categories for issues:

- **Security Risk**: Authentication, authorization, data exposure, injection
- **Performance Issue**: Inefficient queries, unnecessary re-renders, memory leaks
- **Bug Risk**: Logic errors, edge cases, race conditions
- **Code Quality**: Complexity, duplication, naming, structure
- **Convention Violation**: Style, patterns, architectural guidelines
- **Type Safety**: Missing types, any usage, unsafe casts
- **Accessibility**: Missing ARIA, keyboard navigation, screen reader support
- **Testing**: Missing tests, inadequate coverage, flaky tests
- **Documentation**: Missing docs, outdated comments, unclear code

## Example Review

```markdown
## Code Review

**Scope**: Changes in `frontend/src/pages/TraceDetail/` (3 files, 245 additions)
**Overall**: Good implementation of pagination feature. Found 2 critical issues and 3 suggestions.

---

### 🚨 Critical Issues (Must Fix)

1. **Security Risk** `TraceList.tsx:45`
   **Problem**: API token exposed in client-side code
   **Why**: Security vulnerability - tokens should never be in frontend
   **Fix**: Move authentication to backend, use session-based auth

2. **Performance Issue** `TraceList.tsx:89`
   **Problem**: Inline function passed as prop causes unnecessary re-renders
   **Why**: Violates frontend guideline, degrades performance with large lists
   **Fix**:
   ```typescript
   const handleTraceClick = useCallback((traceId: string) => {
     navigate(`/trace/${traceId}`);
   }, [navigate]);
   ```

### ⚠️ Suggestions (Should Consider)

1. **Code Quality** `TraceList.tsx:120-180`
   **Issue**: Function exceeds 40-line guideline
   **Suggestion**: Extract into smaller functions:
   - `filterTracesByTimeRange()`
   - `aggregateMetrics()`
   - `renderChartData()`

2. **Type Safety** `types.ts:23`
   **Issue**: Using `any` for trace attributes
   **Suggestion**: Define proper interface for TraceAttributes

3. **Convention** `TraceList.tsx:12`
   **Issue**: File imports not organized
   **Suggestion**: Let simple-import-sort auto-organize (will happen on save)

### ✅ Positive Highlights

- Excellent use of virtualization for large trace lists
- Good error boundary implementation
- Well-structured component hierarchy
- Comprehensive unit tests included

---

**References**:
- [Frontend Guidelines](../../frontend/CONTRIBUTIONS.md)
- [useCallback best practices](https://kentcdodds.com/blog/usememo-and-usecallback)
```

## Tone Guidelines

- **Be respectful**: Focus on code, not the person
- **Be specific**: Always reference exact file:line locations
- **Be concise**: Get to the point, avoid verbosity
- **Be actionable**: Every comment should have clear resolution path
- **Be balanced**: Acknowledge good work alongside issues
- **Be educational**: Explain why something is an issue, link to guidelines

## Priority Levels

1. **Critical (🚨)**: Security, bugs, data corruption, crashes
2. **Important (⚠️)**: Performance, maintainability, convention violations
3. **Nice to have (💡)**: Style preferences, micro-optimizations

## Important Notes

- **Reference specific guidelines** from docs when applicable
- **Provide code examples** for fixes when helpful
- **Ask questions** if code intent is unclear
- **Link to external resources** for educational value
- **Distinguish** must-fix from should-consider
- **Be concise** - reviewers value their time

## Critical Rules

- **NEVER** be vague - always specify file and line number
- **NEVER** just point out problems - suggest solutions
- **NEVER** review without reading the actual code
- **ALWAYS** check against SigNoz's specific guidelines
- **ALWAYS** provide rationale for each comment
- **ALWAYS** be constructive and respectful

## Reference Documents

- [Frontend Guidelines](../../frontend/CONTRIBUTIONS.md) - React, TypeScript, styling
- [Contributing Guidelines](../../CONTRIBUTING.md) - Workflow, commit conventions
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) - Commit format
- [CLAUDE.md](../CLAUDE.md) - Project architecture and conventions
