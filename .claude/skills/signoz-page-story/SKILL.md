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
4. **Mock data and handlers**: builders in `__story_mockdata__`, handlers in the page's
   mocks module.
5. **Verify in the browser**: [references/verify.md](references/verify.md). Never
   report the story as done without it.

## Where it lands in the sidebar

The sidebar mirrors the app's own side nav (`container/SideNav/menuItems.tsx`), so
a page sits where someone would click it in the product. Four things decide that,
and all four are part of writing the story, not a follow-up.

**Title.** `Pages/<Area>/<Page>`, where `<Area>` is the nav section and `<Page>`
is the label the nav gives it.

- The leaf is the product's label, never the component's name: `MetricsExplorer`
  is `Metrics/Explorer`, `MeterExplorer` is `Metering/Cost Meter`,
  `AIAssistantPage` is `Noz`.
- Never repeat the area in the leaf: `Alerts/Rules`, not `Alerts/AlertRules`.
- A leaf never shares its name with a sibling folder. The folder wins and the
  page becomes `List`, or `Overview` for a tab strip: `Services/List` beside
  `Services/Detail`.
- Title Case with spaces. No camelCase, no kebab.
- Four levels is the floor to stay under: `Pages/Alerts/Channels/New` is as deep
  as it goes.
- Pages nobody navigates to on purpose go under `Pages/System` (`Status`,
  `Unauthorized`, `Workspace Locked`), and the pre-session pages under
  `Pages/Auth`.

**Order.** The `storySort.order` literal in `.storybook/preview.tsx` carries the
order for every level. A new page in an existing area is appended to that area's
array, in the order the product lists it; a new area goes where the side nav
puts it. Storybook parses the order out of the file statically, so it has to
stay an inline literal. Missing entries fall to the end of their level rather
than disappearing, so a forgotten edit is a page at the bottom of its area, not
a broken sidebar.

**Tags.** Declared on the meta, right under `title`, and what the sidebar's tag
filter answers questions with. Only these:

| Tag | When |
| --- | --- |
| `authz` | The page gates UI on permission checks through `lib/authz` (`AuthZButton`, `AuthZGuard`, `useAuthZ`). |
| `role-gated` | The page still branches on the legacy role (`user.role`, `hasEditPermission`) and has no authz check. |
| `beta` | `isBeta` on its nav entry. Drop the tag when the product drops the badge. |
| `legacy` | Superseded by another page but still routed. The doc comment names the page to start from instead. |
| `play` | The story file has a `play` function, so at least one state is reached by an interaction. |

`autodocs` comes from `preview.tsx` and is never written on a meta.

**Doc comment on the meta.** What the page is, in the page's own terms, then a
blank line, then the route:

```tsx
const pageStory = storyMocks(logsExplorerMocks, { route: explorerRoute('explorer') });

/**
 * The logs explorer: the query builder, the list, the frequency chart and the log
 * detail drawer, with quick filters and saved views beside them.
 *
 * Route: `/logs/logs-explorer`.
 */
const meta = {
	title: 'Pages/Logs/Explorer',
	tags: ['play'],
	component: LogsModulePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LogsExplorerArgs>;
```

The `pageStory` const and the trailing `parameters` line are what make the doc
comment safe. The comment compiles to a `parameters` property that the csf plugin
appends after the spread, so a meta that spreads `storyMocks(...)` and stops
there loses `parameters.signoz` and renders the page against the global handlers
alone: every one of the page's endpoints misses. Restating `parameters` as a
literal gives the plugin something to merge into. `resolveStory` logs the
combination that says it happened, so the console names it rather than leaving it
to be found by reading the page.

It is the description on the page's Docs page, which is the only place a reader
who is not in the code finds out what the page is for. Two or three sentences:
what it shows, what drives it, and the gating worth knowing about (`Gated on
authz permissions`, `follows the legacy editor role`). A control-driven route
says so instead of a path: ``Route: `/metrics-explorer/*`, the tab control picks
which``.

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
  `src/pages/<Page>/__story_mockdata__/<page>.ts`. Nothing page-specific in
  `src/storybook/controls/`. A page that is a tab strip over several routes gets
  one story file per tab, in its own folder under the module page
  (`LogsModulePage/Pipelines/Pipelines.stories.tsx`), each with its own mocks and
  `__story_mockdata__/`; the builders more than one tab needs stay in the module
  page's own. Every one of them renders the module page, so the tab strip is
  there, and the `route` its mocks return decides which tab is open.
- **A state only a click reaches is a story with a `play` function**, not a
  control: a drawer, a modal, an edit mode the page holds in component state.
  Drive it with `userEvent` and the queries from `storybook/test`, take the first
  of a repeated row action, and wait on the state's own text. The page fetches
  before it renders a row, so the finder needs a timeout past the 1s default. A
  state the app drops again on its own, such as one keyed on an array identity
  that a refetch replaces, does not get a story: it would not survive being
  looked at. A *sequence* of such states, a wizard's steps or a
  questionnaire's pages, is still a control: declare the steps in the mocks
  module and walk them from a `play` on the meta that destructures `mount`, which
  is what makes Storybook replay it on an arg change. See
  [references/controls.md](references/controls.md).
- **The mocks are AI-owned and say so.** `<Page>.stories.mocks.tsx` and every file
  under a `__story_mockdata__/` open with this banner, above the imports:

  ```ts
  /**
   * AI-owned. Generated and maintained by the `signoz-page-story` skill.
   * Do not hand-edit: regenerate instead.
   */
  ```

  The root `.gitattributes` marks both paths `linguist-generated=true`, so the
  reviewer gets them collapsed and spends the attention on the rendered page. The
  story file is the human surface and never carries the banner. A file with the
  banner has to stay regenerable from the page alone: no page knowledge in
  `src/storybook/`, and builders typed from `src/api/generated` where the endpoint
  has types, so a contract change is a compile error instead of a mock that lies.
- **Reuse fixtures** from `src/mocks-server/` and `src/tests/fixtures/` where they
  exist. An endpoint jest needs too belongs in `src/mocks-server/handlers.ts`.
- **Shared response builders live in `src/storybook/msw/__story_mockdata__/`**: typed
  helpers like `queryRangeV5ScalarResponse` that multiple pages need. Before
  writing a response shape inline, check if a builder exists; if not and the
  shape will repeat, add it there. Page-specific builders stay in the page's
  `__story_mockdata__/`.
- **The story's own doc comment is per state.** Every `export const` gets one:
  what that state shows, not how it is built. It renders in the States list on
  the page's Docs page, so `Undocumented.` there is a story nobody described.
- **Story names come from a fixed vocabulary** where one fits: `Default`,
  `Viewer`, `Empty`, `Loading`, `Error`. Page-specific states get page-specific
  names (`NoIngestion`, `Unlicensed`), never a second spelling of one of those
  (`ViewerAccess`, `NonAdmin`).
- **No comment is the default.** Write one only for what the code cannot show:
  a shape the backend dictates, an app bug the mock reproduces, an ordering or
  cap the page depends on, a workaround and the reason for it. Never restate a
  name, a type, or what a builder plainly builds; if the sentence reads as the
  signature in prose, delete it. Nothing addressed to a reviewer. The one
  comment a story always gets is its own doc comment: what it shows, in the
  page's own terms.

## Done means

- [ ] `Default` shows the page with data, checked in dark and light
- [ ] title follows the sidebar rules, tags declared, and the page's entry added
      to the `storySort.order` literal in `.storybook/preview.tsx`
- [ ] the meta carries its doc comment with the `Route:` line, the meta restates
      `parameters: { ...pageStory.parameters }` after the spread, and every story
      export carries its own doc comment
- [ ] the page's Docs page renders: description, controls table, and one row per
      state with no `Undocumented.`
- [ ] the mocks module and every `__story_mockdata__` file carry the AI-owned banner
- [ ] every control flipped once, its effect seen on screen
- [ ] console clean: no `[storybook] no msw handler`, no 501, no msw unhandled
      request, no React warning
- [ ] no navigation overlay on mount
- [ ] `pnpm tsgo --noEmit`, `pnpm exec oxlint <files>`,
      `pnpm exec oxfmt --check <files>` all clean. The repo has no
      prettier: `pnpm exec prettier` prints a pass while exiting 254
