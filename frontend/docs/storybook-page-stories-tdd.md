# Storybook page stories

> Frontend Technical Design Document

---

## Document Info

| Field | Value |
|-------|-------|
| **Author** | TODO |
| **Reviewers** | TODO |
| **Status** | In Review |
| **Created** | 2026-08-24 |
| **Last Updated** | 2026-08-24 |
| **Effort Estimate** | TODO |
| **Owning Team** | Frontend Platform |
| **PR** | [SigNoz/signoz#12639](https://github.com/SigNoz/signoz/pull/12639) |
| **Issue** | SigNoz/engineering-pod#5951 |

---

## 1. Summary

Run whole SigNoz pages in Storybook with no backend: msw answers every request,
and the state a page is in becomes a row in the controls panel. The unit is the
page inside its real shell, not a component in isolation, so the artifact is a
picture of what a user sees. Phase 2 points Chromatic at that picture set and
makes visual diffs a blocking, human-accepted check.

The mocks that feed those pages are written and maintained by AI through the
`signoz-page-story` skill. Nobody reviews them line by line, so the design is
built around that: mocks are cheap to regenerate, typed against the app's own
modules, and marked as generated in the diff.

---

## 2. Context & Problem Statement

### Current state

| Metric | Value |
|--------|-------|
| Stories in `frontend/` before this work | 0 |
| Routes in `src/AppRoutes/routes.ts` | 71 |
| Page directories under `src/pages/` | 60 |
| Jest test files | 786 |
| E2E feature suites | 10 |

Every layer of the current test stack looks at something other than the page.
Jest mounts fragments with mocked providers. E2E drives real flows but needs a
running backend and reads assertions, not pixels. Neither answers "what does
this page look like when the workspace is empty, the user is a viewer, and the
license expired".

### Problems

- **Hidden states are unreachable.** Empty workspace, denied permission, expired
  license, mid-load, failed request. Seeing any of them today means finding an
  environment in that state or editing code.
- **Visual review is manual.** A change to a shared component or a design token
  is checked by whoever remembers which pages use it. A regression two pages
  away from the diff ships.

---

## 3. Goals & Non-Goals

### Goals

- Render any page, in any state, with no backend and no environment.
- Make every state a page can be in reachable from the controls panel.
- Catch visual regressions before merge (Phase 2, Chromatic).
- Keep mock authorship an AI task, at a cost low enough to keep adding pages.
- A story mounts the provider tree the app mounts, not a second approximation of
  it.

### Non-Goals

- **Component stories.** A page story with controls covers what a component
  story would, in context. Component-level stories are not the pattern here.
- **Behaviour testing.** A wrongly migrated component, a broken handler, a bad
  request payload: that is E2E's job. A story renders, it does not assert.
- **Replacing jest.** Stories are not reused as jest tests (no portable stories,
  no `composeStories`).
- **Interaction coverage.** No play functions for now (see 6.3).
- **A published static build.** Possible later, not in scope.
- **msw v2.** The jest suite is on msw v1; upgrading is its own project.

---

## 4. Requirements

### Functional

- A page renders inside the real `AppLayout` (side nav, top nav, banners).
- Every endpoint the page calls is answered locally, and an unanswered one fails
  loudly instead of hanging.
- Loaded, loading and failed reachable for the page's own endpoints from one
  control.
- Access, license, banner and side nav state selectable on every story.
- Query-param navigation (tabs, filters, pagination, time range) works inside a
  story; leaving the page is blocked and reported.
- Both themes render fully styled.

### Non-Functional

- **Isolation:** no state, cache or override bleeds between stories.
- **Determinism:** the same story renders the same pixels on every run (Phase 2
  prerequisite, see 6.2).
- **Authoring cost:** a new page story is a skill run, not a project.
- **No production impact:** nothing in `src/storybook/` or the msw worker reaches
  the app bundle.

---

## 5. Success Metrics

The metric is qualitative on purpose: this exists to make hidden UI states
visible and to make small UI changes trustworthy without a manual sweep.

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Pages whose states can be seen without an environment | 0 | grows every sprint, no end date | stories under `src/pages/**` |
| States reachable per page | n/a | every branch in the page's inventory | skill's discovery inventory vs the panel |
| Small UI change reviewed without a manual sweep | 0% | the common case | Chromatic diff accepted in the PR |
| Regressions caught before merge | 0 | > 0 and rising | Chromatic build history |

A feature change still needs a recording of the real UI. Stories cover tiny
changes and regressions, not "does the feature work".

---

## 6. Proposed Design

### 6.1 Architecture overview

Three layers: the app's provider tree extracted so a runner can mount it, a
story runtime that turns controls into a mocked world, and per-page mock modules
that live with the page.

Only the third layer is authored per page, and it is three files next to the
page:

```
src/pages/<Page>/
├── <Page>.stories.tsx           # human-owned: title, route, named variants
├── <Page>.stories.mocks.tsx     # AI-owned: controls, handlers, config
└── __story_mockdata__/<page>.ts # AI-owned: payload builders
```

The story file is the whole human surface. Everything else the page needs
(providers, shell, access, msw, containment) arrives from the global decorator:

```tsx
type HomeArgs = PageStoryArgs<typeof homeMocks>;

const meta = {
	title: 'Pages/Home',
	component: HomePage,
	decorators: [withAppLayout],
	...storyMocks(homeMocks, { route: ROUTES.HOME }),
} satisfies Meta<HomeArgs>;

/** Every widget carrying data. */
export const Default: StoryObj<HomeArgs> = {};

/** Fresh workspace: nothing ingested, so the welcome checklist takes over. */
export const NoIngestion: StoryObj<HomeArgs> = {
	args: { logsIngestion: false, tracesIngestion: false, dashboards: 0 },
};
```

A named story exists when the state is worth linking to. Everything else is a
control someone turns.

`src/storybook/` holds the rest: the story runtime, the control builders, the
global mock modules, the access grant, the msw stack, the navigation
containment and the two decorators. It is infrastructure, edited when the
mechanism changes, not when a page is added.

### 6.2 Key technical decisions

#### The page is the unit, not the component

**Decision:** stories render pages. A component's states are reached by turning
a control on the page that renders it.

**Rationale:** a component out of context proves nothing about the page. The
picture that matters is the one with the shell, the real spacing and the real
data around it. It also keeps the story count near the page count instead of
near the component count.

#### Controls are knobs on responses, never props

**Decision:** a control resolves through `handlers`, `config` or `effect`. A
control change re-registers the msw handlers and remounts the story with an
empty query cache.

**Rationale:** a prop-driven control shows a state the page cannot actually be
in. Driving the response means the page fetches, decides and renders the way it
does in production, including its own loading and empty branches.

#### Mocks are AI-owned, and marked as such

**Decision:** `*.stories.mocks.tsx` and `__story_mockdata__/**` carry a
generated banner enforced by the skill, and the root `.gitattributes` marks
those paths `linguist-generated=true` so GitHub collapses them in the diff.

```ts
/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */
```

The folder is `__story_mockdata__`, not `__mockdata__`: `src/mocks-server/__mockdata__`
already exists and is human-owned jest fixture data, so one glob cannot mark
both without collapsing files nobody agreed to hand over.

**Rationale:** the review target is the rendered page and the Chromatic diff. A
reviewer reading 300 lines of payload builders is spending attention on the one
part of the change that no human is expected to keep correct.

**Consequence:** mocks must be regenerable from the page alone. Nothing
page-specific goes into `src/storybook/`, and payload builders take their types
from `src/api/generated` where the endpoint has them, so a contract change is a
compile error rather than a mock that quietly lies.

#### A story is one page, and stays there

**Decision:** `lib/history` is aliased to a proxy over a memory history. A
navigation that keeps the pathname (query or hash) is applied; a different
pathname, an off-site href, `window.open` or a relative `go`/`goBack` is
swallowed and listed in `NavigationBlockedOverlay`.

**Rationale:** leaving the page unmounts the story, and following a real href
navigates the iframe out of Storybook. Tabs, filters and pagination are
query-param navigation, so they keep working, which is most of what a page story
needs. Nothing is dropped silently.

**Gap:** nuqs runs on its testing adapter with its own copy of the query string.
A page that writes params through both `useQueryState` and
`history.push({ search })` sees the two diverge inside a story.

#### Determinism is a Chromatic prerequisite

**Decision:** before Chromatic is turned on, mock data uses frozen dates and
charts render from static data with animation disabled.

**Rationale:** a snapshot has to be byte-identical between runs. Two live
sources of drift today: `appShellMocks` computes trial and payment-failed dates
from `Date.now()`, and uPlot charts animate in. Charts stay in the picture,
they just have to be the same picture every time.

#### Module aliases are typed against the real module

**Decision:** three modules are replaced for every story, each annotated
`typeof import('<real module>')`.

| Module | Replacement | Why |
|--------|-------------|-----|
| `lib/history` | `navigation/history.alias.ts` | containment, above |
| `api/common/logEvent` | `mocks/logEvent.mock.ts` | analytics never leave the iframe |
| `constants/env` | `mocks/env.mock.ts` | pins the API origin the handlers answer on |

**Rationale:** the annotation makes drift a compile error instead of a story that
fails at render in whichever component imports it. Same mechanism as jest's
`moduleNameMapper`, and each alias notes where the same import lands under jest.

### 6.3 Edge cases & failure modes

| Scenario | Behaviour |
|----------|-----------|
| Endpoint nobody mocked | catch-all logs `[storybook] no msw handler`, answers 501 |
| Page redirects on mount | navigation overlay on load, usually a wrong `route` or a guard denying |
| Shell disappears in `loading` | a shell endpoint went through `response.json`; it needs a plain resolver |
| Leftover AuthZ dev override | cleared on every render unless Access is `dev-tools` |
| A story sets a role the grant denies | impossible: `role` is derived from the grant |
| Project-level control added | the tab needs a reload; Vite hot-updates `preview.tsx` without re-preparing open stories |
| AuthZ dev overrides in a static build | inert, they need `IS_DEV`. Dev server only |
| State only reachable by interaction | not covered. See below |

**Play functions.** `storybook/test` is available and the module mocks are `fn()`
spies, so a `play` could open a dropdown, click a tab or assert on `logEvent`,
and Chromatic snapshots after `play` completes. That is the mechanism for states
no control can reach. Not used for now: controls only, deliberately, to keep the
authoring cost of a page at one skill run.

---

## 7. Alternatives considered

| Option | Pros | Cons | Why not chosen |
|--------|------|------|----------------|
| Component stories | small, cheap, conventional | proves nothing about the page; story count tracks component count; still needs mocked providers | a page story with controls covers the same states in context |
| Presentational `PageView` + args | no msw, no providers, no query cache; a state is one `args` object | requires splitting every page into a container and a view first; the page's own fetching, loading and empty branches are never exercised; each state is a named story, so the count grows fast | the split is a refactor of the 60 directories in `src/pages/` before the first story, and it moves the fetching the page actually does out of the picture |
| Jest snapshot tests | already in the repo | serialised DOM is not a picture; a token or CSS change is invisible | not a visual test |

### Prior art

Page-level stories are an established pattern, and the teams doing it split into
two camps over where the data comes from. The list below is what could be
verified in public repos and docs.

**The real connected page against msw**, which is what this proposal does:

| Who | What they do | Where |
|-----|--------------|-------|
| PostHog | the closest match to this proposal, and the largest. 104 `.stories.tsx` files import `scenes/App`: the story mounts the whole app and pushes a route (`router.actions.push(urls.logs())`), so it gets the real shell, not a page in isolation. `mswDecorator` maps each endpoint to a mock at the meta level, `layout: 'fullscreen'`, `mockDate` freezes the clock, and a seeded LCG supplies the random data. Feature flags are a story parameter. Fixtures are sized past the page's cap on purpose, so pagination and the truncation banner render | [`LogsScene.stories.tsx`](https://github.com/PostHog/posthog/blob/master/products/logs/frontend/LogsScene.stories.tsx) |
| Teleport (Gravitational) | the real page inside `TeleportProviderBasic`, with `beforeEach({ msw })` per story: `successGetUsers`, `handleGetUsers(() => delay('infinite'))` for loading, `errorGetUsers` for failed. The handlers come from `teleport/test/helpers/`, shared with the test suite. The preview starts one msw worker in a loader, clears the query cache per story, sets `retry: false`, and toggles the auth provider from an arg. 160 story files under `web/packages/teleport/src/` | [`Users.story.tsx`](https://github.com/gravitational/teleport/blob/master/web/packages/teleport/src/Users/Users.story.tsx), [`preview.tsx`](https://github.com/gravitational/teleport/blob/master/web/.storybook/preview.tsx) |
| Metabase | msw globally through `msw-storybook-addon`, plus explicit determinism work: `METABASE_REMOVE_DELAYS`, every font forced to load before render, and the lazy echarts chunk pulled into the bundle so a snapshot cannot catch a Suspense skeleton. Visual regression through Loki | [`preview.tsx`](https://github.com/metabase/metabase/blob/master/.storybook/preview.tsx) |
| Prefect | one msw worker in the preview, seeded from `@tests/utils/handlers`, the same handler set the tests use | [`preview.ts`](https://github.com/PrefectHQ/prefect/blob/main/ui-v2/.storybook/preview.ts) |
| Mealdrop (Yann Braga, Storybook maintainer) | the reference project for this pattern: the real routed page, a `withDeeplink` decorator, msw handlers, `Loading` via infinite delay, `NotFound` and `Error` via 404 and 500, and `play` functions driving the interactions | [`RestaurantDetailPage.stories.tsx`](https://github.com/yannbf/mealdrop/blob/main/src/pages/RestaurantDetailPage/RestaurantDetailPage.stories.tsx) |

**The presentational split**, where a `PageView` takes the data as props and the
fetching lives in a wrapper outside Storybook:

| Who | What they do | Where |
|-----|--------------|-------|
| Coder | 76 `*PageView.stories.tsx` files, part of 290 story files under `site/src/pages/`. `WorkspacesPageView` alone carries 23 named stories driven by args (`CannotCreateWorkspace`, `Loading`, `NoSearchResults`, `UnhealthyWorkspace`, `InvalidPageNumber`), with providers supplied by `withAuthProvider`, `withDashboardProvider`, `withProxyProvider()`. Chromatic gates the diffs | [`WorkspacesPageView.stories.tsx`](https://github.com/coder/coder/blob/main/site/src/pages/WorkspacesPage/WorkspacesPageView.stories.tsx) |
| Netlify | stories for a whole page (Team Overview) next to stories for its cards, reusing the fixture data their integration and unit tests already maintain, with Chromatic for the visual diff | [blog post](https://www.netlify.com/blog/storybook-visual-regression-testing/) |
| BBC, The Guardian, the Storybook maintainers | named in Storybook's own guidance as teams that keep components presentational up to the screen level and put the connected logic in one wrapper component outside Storybook | [Building pages with Storybook](https://storybook.js.org/docs/writing-stories/build-pages-with-storybook) |

---

## 8. Trade-offs & risks

### Trade-offs accepted

- Mocks can lie. Nothing checks a payload against the real API at runtime.
  Typing builders from `src/api/generated` narrows it, it does not close it.
- Controls only. States behind an interaction are not covered until play
  functions are adopted.
- msw v1 pinned by the jest suite.
- `.storybook/main.ts` carries an exclusion list of `vite.config.ts` plugins,
  maintained by hand.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Mock drift: story green, production broken | High | Medium | builders typed from `src/api/generated`; E2E owns the real contract; drift shows up as a Chromatic diff on the next regeneration |
| Snapshot cost grows with pages × states × 2 themes | High | Medium | per-story `chromatic.disableSnapshot` to trim; snapshot the states worth watching |
| Flaky diffs from non-deterministic pixels | High | Medium | frozen dates, animations off, static chart data (Phase 2 prerequisite) |

---

## 9. Accessibility plan

`@storybook/addon-a11y` is in the addon list. It runs axe on the rendered
story, so a page gets an a11y pass in every state its controls can reach, which
is more than the app gets today.

Informational, not a gate: the addon reports on existing pages that were never
audited, so making it blocking would block on debt this work did not create.
Chromatic's review check is the only blocking gate.

---

## 10. Performance plan

- **No production impact.** `src/storybook/` and `src/harness/` are only reached
  by stories. The msw worker is served from `.storybook/public/`, kept out of
  `../public` so it cannot ship in a production build.
- **Per-story cost.** A control change remounts the tree with a fresh query
  cache, which is the point: the page refetches. Remount is keyed on theme plus
  the resolved control values, so nothing remounts without a reason.
- **`retry: false`** on the story query client, so a forced failure renders its
  error state immediately instead of after three retries.

---

## 11. Rollout plan

### Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1: Home** | the story runtime and the `signoz-page-story` skill, proved by one page: Home | This PR |
| **Phase 2: Chromatic** | determinism prerequisites, CI job, blocking review check, snapshot exclusions | Not started |
| **Phase 3: Page fan-out** | more pages, gradually, one skill run each, the auth-less ones (login, signup, workspace-locked) included | Continuous |

No end date. Phase 3 runs for as long as there are pages worth covering, and a
page is added when someone is working on it.

### Phase 2 detail

- **Coverage:** every story, light and dark. A story can opt out with
  `parameters.chromatic.disableSnapshot` when the cost is not worth it.
- **Gate:** Chromatic's review check is required. It stays red until a frontend
  reviewer accepts the diffs, so an unreviewed visual change cannot merge.
- **Prerequisites:** frozen dates in mock data (`appShellMocks` computes banner
  dates from `Date.now()` today), animations off, charts rendering the same
  picture from static data.
- **Baseline:** main.

### Failure triage

A red story has two causes, and they are told apart before anything is edited:

1. **A real visual regression.** Fix the app.
2. **The component changed and the mocks no longer match it.** Regenerate the
   mocks with the skill. This is expected, routine, and not a review event.

### Rollback

Phase 1 is additive: nothing in the app bundle depends on it, so removing it is
deleting directories. The two app-side changes (`AppHarness` extraction, the
`appContextMock` fixture) stand on their own and stay. Phase 2 rolls back by
making the Chromatic check non-required.

---

## 12. Testing strategy

Stories are not tests, and there are no assertions in them. What guards the
stories themselves:

### Per-story gates (the skill's `verify.md`)

- Console silent: no `[storybook] no msw handler`, no 501, no msw unhandled
  request, no React warning.
- No navigation overlay on mount.
- Every control flipped once, with its effect seen on screen. Args are settable
  from the iframe URL, so the sweep runs headless.
- Both themes render styled (`<body data-theme>` present).
- `<body data-signoz-story-role>` and `data-signoz-context-role` agree, which is
  the tell that the page reads the `AppContext` the story filled.
- `pnpm tsgo --noEmit`, `pnpm exec oxlint`, `pnpm exec oxfmt --check` clean.

### The layers around it

| Layer | What it owns |
|-------|--------------|
| Jest (786 files) | component and hook behaviour |
| E2E (10 suites) | flows against a real backend, real contracts, migration correctness |
| Page stories | what the page looks like, in every state |
| Chromatic (Phase 2) | that it still looks like that |

A component migrated wrongly is E2E's to catch, not Chromatic's. A story that
renders a broken component still renders, and the diff only shows what moved.

---

## 13. Observability

N/A. Nothing here runs in production. `api/common/logEvent` is replaced by a
spy, and `preview-head.html` stubs `signozBootData` with posthog, sentry,
appcues and pylon all off, so no third-party script loads inside the iframe.

Phase 2 adds Chromatic build history, which is where the regression record
lives.

---

## 14. Design system check

- [x] Reuses existing components/patterns, no new UI pattern introduced

Two UI surfaces are added, both Storybook-only: `NavigationBlockedOverlay`
(lists what the page tried to navigate to) and the story controls panel, which
is Storybook's own. `applyThemeBodyClass` puts `<body>` in the state the app
gets from `index.html` plus `AppLayout`, including `data-theme="default"`,
without which every `@signozhq/design-tokens` semantic token resolves to nothing
and the page renders unstyled.

---

## 15. Timeline & milestones

| Milestone | Status |
|-----------|--------|
| Phase 1: Home | This PR |
| Phase 2: Chromatic + determinism | Not started, TODO |
| Phase 3: page fan-out | Continuous, no end date |

Effort estimate: TODO.

---

## 16. What would let a regression through

Ranked by likelihood, since a visual test that passes wrongly is worse than one
that fails.

| # | Hazard | Mitigation |
|---|--------|------------|
| 1 | **Mock payload no longer matches the API.** The page renders the mock's shape happily while production gets something else. | builders typed from `src/api/generated`; E2E owns the real contract |
| 2 | **A state exists that no control reaches.** It is never snapshotted, so it never regresses visibly. | the skill's inventory is the checklist: a branch in it and not in the panel is a bug in the story |
| 3 | **Non-deterministic pixels.** A diff every day teaches the team to click accept. | frozen dates, animations off, static chart data |
| 4 | **A story stops covering the page** because a widget silently stopped rendering (permission, flag, preference). | control sweep: a control with no visible effect is a finding, not a shrug |
| 5 | **Endpoint answered by a stale layer.** A page handler that does not match the call falls through to a shared handler, which answers something plausible. | endless spinner with Data on `loaded` is the symptom |
| 6 | **nuqs and history diverge** on a page that writes params through both. | known gap, documented; a page on one mechanism is unaffected |
| 7 | **Snapshot exclusions accumulate** until the gate covers little. | exclusions are a reviewed edit in the story file |
