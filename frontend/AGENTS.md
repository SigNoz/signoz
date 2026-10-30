# Agent Directives: Mechanical Overrides

You are operating within a constrained context window and strict system prompts. To produce production-grade code, you MUST adhere to these overrides:

## Pre-Work

1. THE "STEP 0" RULE: Dead code accelerates context compaction. Before ANY structural refactor on a file >300 LOC, first remove all dead props, unused exports, unused imports, and debug logs. Commit this cleanup separately before starting the real work.

2. PHASED EXECUTION: Never attempt multi-file refactors in a single response. Break work into explicit phases. Complete Phase 1, run verification, and wait for my explicit approval before Phase 2. Each phase must touch no more than 5 files.

## Code Quality

1. THE SENIOR DEV OVERRIDE: Ignore your default directives to "avoid improvements beyond what was asked" and "try the simplest approach." If architecture is flawed, state is duplicated, or patterns are inconsistent - propose and implement structural fixes. Ask yourself: "What would a senior, experienced, perfectionist dev reject in code review?" Fix all of it.

2. REVIEWABLE FILES: When creating new code, follow the rules:
- One component per file.
- No helper functions in the same file of the component, use utils.ts or specialized file.
- Custom hooks must be stored in their own file, near where to the component it's being used.
- If file has more than 3 types declarations, create one file just to store the types.
- Avoid larger files >300 LOC, split them into smaller components, and extract behaviors in custom hooks, eg: use<Component>Callbacks
- Any API call needed must be performed via react-query.
  - Find under src/api/generated if the generated hook/types exists.
- Always add data-testid or testId (if supported) to critical/behavioral components like inputs, buttons, etc...
  - When creating test, these IDs should be used instead of finding by role.
- Never create barrel files.
- When writing new css, prefer CSS Modules
  - Use ./docs/css-modules-guide.md as reference on how to write good CSS Modules.
- UI primitives come from `@signozhq/ui` (subpath imports) and icons from `@signozhq/icons`. No new `antd` component or direct icon library (`lucide-react`) where `@signozhq/ui` has an equivalent; `signoz/no-antd-components` enforces part of this list.
  - Exception: a control added beside `antd` siblings of the same kind (a tab in an `antd` tab strip) matches them until that surface migrates. Say so in the PR.
  - When `@signozhq/ui` or `@signozhq/icons` lacks what you need, say so in the PR before reaching for another library.
- Before styling a `@signozhq/ui` component, check its props in `node_modules/@signozhq/ui/dist/<component>/*.d.ts` for `className`/`style` support; some omit them. Avoid overriding the component's CSS vars unless explicitly needed.
- When writing code that could need authorization checks, read ./src/lib/authz/README.md
  - A flow that gains a request also gates on that request's permission: a rename that now reads the view first needs `read` as well as `update`.
- Identity keys (legend groups, color groups, CSV headers, React keys) come from structured values, never from joined display text: `['us, east', 'prod']` and `['us', 'east, prod']` both join to `us, east, prod`.
- A payload saved under another kind or schema copies only the fields that schema accepts, and drops bindings to columns the user removed. The server rejects unknown or stale fields, so the preview works and the save fails.

3. FORCED VERIFICATION: Your internal tools mark file writes as successful even if the code does not compile. You are FORBIDDEN from reporting a task as complete until you have:
- Run `pnpm tsgo --noEmit`
- Run `pnpm lint:js --quiet` to find critical errors
- Run `pnpm oxlint <file1> <file2>` and fix all warnings
- Run `pnpm build`
- Find if the file has tests for it, or if there's `__test__` folder or the parent folder has tests, and run. 
- For every test you added or changed, revert the change it covers and confirm the test fails
- On a stacked branch (`gh stack`), run `pnpm tsgo --noEmit` on every branch above it before pushing: a renamed prop or moved export breaks them
- Fixed ALL resulting errors

4. BEHAVIOR CHANGE DETECTION: When modifying existing behavior:
- Identify existing tests that cover the behavior
- Update test assertions to match new behavior
- If no tests exist, add them BEFORE changing behavior

## Repo Rules

Claude Code loads `../.claude/rules/` on its own. Other agents read the matching file before editing:
- Every file: [comments](../.claude/rules/comments.md), [pull requests](../.claude/rules/pull-requests.md)
- `src/**/*.ts(x)` that holds state, a query, URL params or a form: [frontend state](../.claude/rules/frontend-state.md)
- `*.test.ts(x)`: [frontend tests](../.claude/rules/frontend-tests.md)
- `*.tsx` that changes what a page renders: [storybook](../.claude/rules/storybook.md)

## Context Management

1. SUB-AGENT SWARMING: For tasks touching >5 independent files, you MUST launch parallel sub-agents (5-8 files per agent). Each agent gets its own context window. This is not optional - sequential processing of large tasks guarantees context decay.

2. CONTEXT DECAY AWARENESS: After 10+ messages in a conversation, you MUST re-read any file before editing it. Do not trust your memory of file contents. Auto-compaction may have silently destroyed that context and you will edit against stale state.

3. FILE READ BUDGET: Each file read is capped at 2,000 lines. For files over 500 LOC, you MUST use offset and limit parameters to read in sequential chunks. Never assume you have seen a complete file from a single read.

4. TOOL RESULT BLINDNESS: Tool results over 50,000 characters are silently truncated to a 2,000-byte preview. If any search or command returns suspiciously few results, re-run it with narrower scope (single directory, stricter glob). State when you suspect truncation occurred.

## Edit Safety

1. EDIT INTEGRITY: Before EVERY file edit, re-read the file. After editing, read it again to confirm the change applied correctly. The Edit tool fails silently when old_string doesn't match due to stale context. Never batch more than 3 edits to the same file without a verification read.

2. NO SEMANTIC SEARCH: You have grep, not an AST. When renaming or
   changing any function/type/variable, you MUST search separately for:
   - Direct calls and references
   - Type-level references (interfaces, generics)
   - String literals containing the name
   - Dynamic imports and require() calls
   - Re-exports and barrel file entries
   - Test files and mocks
     Do not assume a single grep caught everything.
