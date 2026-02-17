---
name: review
description: Review code changes for bugs, performance issues, and SigNoz convention compliance
allowed-tools: Bash(git:*, gh:*), Read, Glob, Grep
---

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
   - **Backend/Architecture**: Check [CLAUDE.md](../CLAUDE.md) for provider pattern, error handling, SQL, REST, and linting conventions
   - **General**: Check [Contributing Guidelines](../../CONTRIBUTING.md)
   - **Commits**: Verify [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

5. **Verify feature intent**:
   - Read the PR description, commit message, or linked issue to understand *what* the change claims to do
   - Trace the code path end-to-end to confirm the change actually achieves its stated goal
   - Check that the happy path works as described
   - Identify any scenarios where the feature silently does nothing or produces wrong results

6. **Review for bug introduction**:
   - **Regressions**: Does the change break existing behavior? Check callers of modified functions/interfaces
   - **Edge cases**: Empty inputs, nil/undefined values, boundary conditions, concurrent access
   - **Error paths**: Are all error cases handled? Can errors be swallowed silently?
   - **State management**: Are state transitions correct? Can state become inconsistent?
   - **Race conditions**: Shared mutable state, async operations, missing locks or guards
   - **Type mismatches**: Unsafe casts, implicit conversions, `any` usage hiding real types

7. **Review for performance implications**:
   - **Backend**: N+1 queries, missing indexes, unbounded result sets, large allocations in hot paths, unnecessary DB round-trips
   - **Frontend**: Unnecessary re-renders from inline objects/functions as props, missing memoization on expensive computations, large bundle imports that should be lazy-loaded, unthrottled event handlers
   - **General**: O(n²) or worse algorithms on potentially large datasets, unnecessary network calls, missing pagination or limits

8. **Provide actionable, concise feedback** in structured format

## Review Checklist

For coding conventions and style, refer to the linked guideline docs. This checklist focuses on **review-specific concerns** that guidelines alone don't catch.

### Correctness & Intent
- [ ] Change achieves what the PR/commit/issue describes
- [ ] Happy path works end-to-end
- [ ] Edge cases handled (empty, nil, boundary, concurrent)
- [ ] Error paths don't swallow failures silently
- [ ] No regressions to existing callers of modified code

### Security
- [ ] No exposed secrets, API keys, credentials
- [ ] No sensitive data in logs
- [ ] Input validation at system boundaries
- [ ] Authentication/authorization checked for new endpoints
- [ ] No SQL injection or XSS risks

### Performance
- [ ] No N+1 queries or unbounded result sets
- [ ] No unnecessary re-renders (inline objects/functions as props, missing memoization)
- [ ] No large imports that should be lazy-loaded
- [ ] No O(n²) on potentially large datasets
- [ ] Pagination/limits present where needed

### Testing
- [ ] New functionality has tests
- [ ] Edge cases and error paths tested
- [ ] Tests are deterministic (no flakiness)

### Git/Commits
- [ ] Commit messages follow `type(scope): description` ([Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/))
- [ ] Commits are atomic and logical

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

- **Bug / Regression**: Logic errors, edge cases, race conditions, broken existing behavior
- **Feature Gap**: Change doesn't fully achieve its stated intent
- **Security Risk**: Authentication, authorization, data exposure, injection
- **Performance Issue**: Inefficient queries, unnecessary re-renders, memory leaks, unbounded data
- **Convention Violation**: Style, patterns, architectural guidelines (link to relevant guideline doc)
- **Code Quality**: Complexity, duplication, naming, type safety
- **Testing**: Missing tests, inadequate coverage, flaky tests

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
