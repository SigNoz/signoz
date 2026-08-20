---
name: signoz-page-story
description: Explore a SigNoz page, map the endpoints, states and query params it has, then write its Storybook page story with control-driven msw mocks that reach every state. Use when asked to create, extend or review a Storybook story for a page under frontend/src/pages, to add controls to an existing page story, or to write defineStoryMocks handlers and mock data for a page.
---

# SigNoz page stories

A page story renders the real page inside the real app shell against msw, and its
controls panel can reach every state the page has. The panel is the deliverable,
not the story list.

`frontend/src/storybook/README.md` is the API surface (providers, parameters,
control builders, module mocks, navigation). Read it first; this skill is the
process on top of it.

## Workflow

1. **Map the page**: [references/discovery.md](references/discovery.md). Produce
   the inventory (endpoints, states, params, permissions, caps) before writing
   code. No inventory, no story.
2. **Skeleton first**: story + empty `defineStoryMocks`, then run it. The console
   names the endpoints step 1 missed.
3. **Inventory to controls**: [references/controls.md](references/controls.md).
4. **Mock data and handlers**: builders in `__mockdata__`, handlers in the page's
   mocks module.
5. **Verify in the browser**: [references/verify.md](references/verify.md). Never
   report the story as done without it.

## Rules

- **Default is the loaded page.** `export const Default: Story = {}` with no args,
  every widget carrying data. Empty, loading and failed are variants or control
  values, never the default.
- **A control is a knob on a response**, resolved through `handlers`, `config` or
  `effect`. Never a component prop, never a module mock added for one story.
- **Every branch in the inventory is reachable from the panel.** A state that
  needs a code edit to see is a missing control.
- **Never re-declare what every story already has**: banner, side nav, data state
  (loaded/loading/error), access preset, permissions, check state.
- **A variant earns a story only when it is worth linking to**: an empty
  workspace, a viewer, a page mid-load. Everything else stays a control.
- **Endpoints the page owns go through `response.json`**, so the Data control
  covers loaded, loading and failed in one declaration. Endpoints the page cannot
  render without (ingestion detection, preferences, feature payloads) take a
  plain resolver so the shell survives the loading and error states.
- **Query-param state starts from `route`** (`/logs?tab=explorer`). In-page param
  navigation works inside a story; a different pathname is blocked and reported
  by the overlay. A control for a param is worth it only when the param is a page
  mode someone would want to flip.
- **File layout**: `src/pages/<Page>/<Page>.stories.tsx`,
  `src/pages/<Page>/<Page>.stories.mocks.tsx`, payload builders in
  `src/pages/<Page>/__mockdata__/<page>.ts`. Nothing page-specific in
  `src/storybook/controls/`.
- **Reuse fixtures** from `src/mocks-server/` and `src/tests/fixtures/` where they
  exist. An endpoint jest needs too belongs in `src/mocks-server/handlers.ts`.
- **Shared response builders live in `src/storybook/msw/__mockdata__/`**: typed
  helpers like `queryRangeV5ScalarResponse` that multiple pages need. Before
  writing a response shape inline, check if a builder exists; if not and the
  shape will repeat, add it there. Page-specific builders stay in the page's
  `__mockdata__/`.
- **No comment is the default.** Write one only for what the code cannot show:
  a shape the backend dictates, an app bug the mock reproduces, an ordering or
  cap the page depends on, a workaround and the reason for it. Never restate a
  name, a type, or what a builder plainly builds; if the sentence reads as the
  signature in prose, delete it. Nothing addressed to a reviewer. The one
  comment a story always gets is its own doc comment: what it shows, in the
  page's own terms.

## Done means

- [ ] `Default` shows the page with data, checked in dark and light
- [ ] every control flipped once, its effect seen on screen
- [ ] console clean: no `[storybook] no msw handler`, no 501, no msw unhandled
      request, no React warning
- [ ] no navigation overlay on mount
- [ ] `pnpm tsgo --noEmit`, `pnpm exec oxlint <files>`,
      `pnpm exec oxfmt --check <files>` all clean. The repo has no
      prettier: `pnpm exec prettier` prints a pass while exiting 254
