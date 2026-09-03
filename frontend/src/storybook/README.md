# Storybook

Runs SigNoz pages and components with no backend: every request is answered by
msw, and the providers the app mounts at boot are replaced by story-controlled
values.

```bash
pnpm storybook          # dev server on :6006
pnpm storybook:build    # static build into storybook-static/
```

## Layout

| Path              | What lives there                                                       |
| ----------------- | ---------------------------------------------------------------------- |
| `runtime/`        | `resolveStory`: story context in, the world the story renders in out    |
| `controls/`       | Declaring controls (`defineStoryMocks`) and composing mock modules      |
| `globals/`        | The mock modules every story carries: app shell and access             |
| `access/`         | What a permission grant allows, and the legacy role it derives          |
| `providers/`      | The Storybook adapter over `src/harness/AppHarness`                     |
| `navigation/`     | Keeping a story on its page, and reporting what it tried to leave for   |
| `msw/`            | The default handler set and the shell's endpoints                       |
| `mocks/`          | Modules aliased in place of the app's own                               |
| `decorators/`     | `withProviders` (global) and `withAppLayout` (opt-in per page)          |
| `docs/`           | The `Docs/*` pages, the docs page template, and the sidebar order       |

A page's own mocks live with the page, not here. See [Adding a page
story](#adding-a-page-story).

## The sidebar

Titles mirror the app's own side nav (`container/SideNav/menuItems.tsx`):
`Pages/<Area>/<Page>`, where the area is the nav section and the page is the
label the nav gives it, so a page sits where someone would click it in the
product. The leaf is the product's label rather than the component's name, never
repeats its area (`Alerts/Rules`, not `Alerts/AlertRules`), and never shares a
name with a sibling folder: a page beside its own detail page is `List`, or
`Overview` for a tab strip.

The `storySort.order` literal in `.storybook/preview.tsx` carries the order of
every level, mirroring the nav again. Anything missing from a level falls to the
end of it, so a new story shows up at the bottom of its area rather than not at
all.

Tags on the meta are what the sidebar's tag filter reads: `authz` (the page gates
UI on permission checks through `lib/authz`), `role-gated` (it still branches on
the legacy role), `beta`, `legacy` (superseded but still routed) and `play` (a
state the story reaches by interacting). `autodocs` comes from `preview.tsx` and
is never written on a meta.

## Docs pages

`@storybook/addon-docs` is on, and `preview.tsx` tags every story `autodocs`, so
each page gets a Docs page: the doc comment above its `const meta`, the controls
table, and one row per state from the story's own doc comment. Those comments are
the page's documentation; without the addon they render nowhere.

`docs/PageDocs.tsx` replaces Storybook's default template, which renders a canvas
per story. A page story is the whole app behind msw, so that is one boot per
state; this one renders no canvas and lists every state as a link.

`docs/*.mdx` are the `Docs/*` pages in the sidebar: `Introduction`, for someone
opening Storybook for the first time. This README is the reference and stays a
file; it is not rendered in the sidebar.

`docs/ThemedDocsContainer.tsx` is the container for every docs page. It themes
the page off the theme toolbar, which Storybook's own container does not do, and
it lets the page scroll: a docs page renders in the story iframe, where
`styles.scss` pins `html` and `body` with `overflow: hidden` for `AppLayout`.
Both are undone when the page unmounts, so a story keeps the viewport the app
expects.

MDX here is not GFM: a pipe table renders as its own pipes. Write the table as
JSX and Storybook's docs styles pick it up.

## What a story gets for free

`withProviders` (global decorator, `.storybook/preview.tsx`) wraps every story in
`StorybookProviders`, the Storybook adapter over `src/harness/AppHarness`.
`AppHarness` is the app's provider tree from `src/index.tsx` +
`src/AppRoutes/index.tsx`, minus Sentry, posthog and `AppProvider`, with the
pieces a runner has to choose left as props: the router, the nuqs adapter, the
store, the query client and the mocked `AppContext`.

`tests/test-utils` mounts its own, smaller tree for jest and does not go through
`AppHarness`: the suite has ~20 files that mock `hooks/useDarkMode`,
`hooks/useNotifications` or `providers/cmdKProvider` down to a single export, so
the providers those modules also carry would come back `undefined`. A provider
added to the app therefore still needs adding in both places.

Storybook fills the seams with:

- `AppContext` from `tests/fixtures/appContextMock`, the same fixture the jest
  suite uses, so a story and a test see the same user, license and flags.
- A fresh react-query client and redux store per story: no cache or state bleed.
- `nuqs` on its testing adapter, so query-param state lives in memory and never
  touches the iframe URL.
- Theme from the toolbar (dark/light). `applyThemeBodyClass` puts `<body>` in the
  state the app gets from `index.html` plus `AppLayout`: `data-theme="default"`
  (every `@signozhq/design-tokens` semantic token is scoped to it, and without it
  `--l1-background` and friends resolve to nothing and the page renders
  unstyled) and the `darkMode`/`dark`/`lightMode` classes.

## The story runtime

`runtime/resolveStory.ts` is the one place that turns a story's parameters and
the controls panel's current values into everything the story runs on: the msw
handlers in resolution order, the provider config, the theme, the remount key,
and the module-level state to seed. The preview loader applies it before the
decorators run; the decorator reads the same result, memoised on the story and
its args.

Handlers resolve first-match-wins, in this order:

1. the story's own `parameters.msw.handlers`;
2. the page's control-driven handlers;
3. the global mocks' handlers (access);
4. `msw/appShellHandlers.ts`, the endpoints the shell hits on every route, and
   the ones whose jest fixture is too thin to show it doing its job;
5. `msw/queryBuilderHandlers.ts`, the legacy v3 autocomplete pair, which the
   jest handlers answer for one query and 500 for every other;
6. `src/mocks-server/handlers.ts`, the jest handlers verbatim. An endpoint both
   runners need belongs here so jest gets it too;
7. a catch-all for `http://localhost/api/*` that logs and answers 501, so an
   endpoint nobody mocked fails loudly instead of hanging on a refused
   connection.

A handler that returns nothing hands the request to the next one in the list, so
a Storybook-level handler can cover the cases a jest fixture does not and leave
the ones it does.

The whole set is re-registered on every story render rather than handed to
`setupWorker` once. Editing a handler module then takes effect on the next
render; with the handlers baked in at worker creation, a long-lived dev server
kept answering with the set it started with, and endpoints added later showed up
as failed requests.

The handlers are declared against `http://localhost`, which is why
`constants/env` is mocked to that origin. msw intercepts before the request
leaves the page, so nothing reaches the network.

## Overrides

Per-story, through `parameters`:

```tsx
export const Elsewhere: Story = {
	parameters: {
		signoz: {
			route: '/home?relativeTime=1h',
			appContext: { featureFlags: [] },
			reduxState: { globalTime: { ... } },
			theme: 'light',
		},
		msw: {
			handlers: [
				rest.get('http://localhost/api/v2/rules', handleInternalServerError),
			],
		},
	},
};
```

`parameters.signoz` is typed by `SignozStoryConfig` in `src/storybook/types.ts`.
Who the story runs as is not in there. See [Access](#access).

Anything a page declares as a control belongs in `args`, not in `parameters`.

## The app shell

A page story always runs inside the real `AppLayout` (side nav, top nav,
banners). A page without its shell is not the page anyone sees. Declare it once
on the meta so every story of that page inherits it:

```tsx
const meta = {
	title: 'Pages/Home',
	component: HomePage,
	decorators: [withAppLayout],
} satisfies Meta<typeof HomePage>;
```

## Controls

A page declares what about its mocks is adjustable, and the controls panel drives
it. Every control is a knob on the response, not a prop on the component: turning
one re-registers the msw handlers and remounts the story with an empty query
cache, so the page fetches again and renders the new data.

```tsx
// src/pages/HomePage/HomePage.stories.mocks.ts
export const homeMocks = defineStoryMocks({
	controls: {
		logsIngestion: toggleControl('Logs ingestion', { group: SIGNALS, value: true }),
		dashboards: countControl('Recent dashboards', { group: LISTS, value: 5, max: 8 }),
		welcomeChecklist: choiceControl<ChecklistVisibility>('Welcome checklist', {
			group: ONBOARDING,
			options: CHECKLIST_VISIBILITY,
			value: 'visible',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(() => recentDashboardsResponse(values.dashboards)),
		),
	],
});
```

```tsx
// src/pages/HomePage/HomePage.stories.tsx
type HomeArgs = PageStoryArgs<typeof homeMocks>;

const pageStory = storyMocks(homeMocks, { route: ROUTES.HOME });

/**
 * The workspace landing page: ingestion state per signal, the welcome checklist
 * while a signal is missing, then the widgets over what the workspace has.
 *
 * Route: `/home`.
 */
const meta = {
	title: 'Pages/Home',
	component: HomePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<HomeArgs>;

export const NoIngestion: StoryObj<HomeArgs> = {
	args: { logsIngestion: false, tracesIngestion: false, metricsIngestion: false },
};
```

The trailing `parameters` line is not decoration. `storyMocks` returns the mocks
under `parameters.signoz`, and the doc comment above `const meta` compiles to a
`parameters` property that the csf plugin appends **after** the spread, which
would overwrite it. Restating `parameters` as a literal gives the plugin
something to merge into, so both survive. A meta that skips it renders the page
against the global handlers alone, and `resolveStory` says so in the console
rather than leaving it to be guessed at.

`toggleControl`, `countControl`, `choiceControl` and `multiChoiceControl` build
the panel row and carry the value's type, so `values` inside `handlers` is typed
and a story's `args` are checked.

The hooks a mock module can answer, all optional. `handlers` answers the page's
endpoints; `config` returns the provider-level knobs no endpoint covers;
`responseState` says how the endpoints declared through `response` answer;
`effect` seeds module-level state no provider exposes, such as no-auth mode; and
`role` derives the legacy role, which only `authzMocks` does.

Endpoints declared through `response.json` follow the response state (`loaded`,
`loading` or `error`) which the `Data` control drives, so one declaration covers
all three. Endpoints the page cannot render without, such as ingestion detection
and preferences, take a plain msw resolver so they keep answering while the rest
of the page hangs or fails.

The mock modules every story carries are registered in `globals/index.ts`:
`appShellMocks` (app-wide banners, side nav state, `Data`) and `authzMocks`
(below). Adding one there publishes its controls and widens `PageStoryArgs` in
the same edit.

## Access

Permissions are the knob, not roles. `POST /api/v1/authz/check` is the single
gate the app reads: route guards, `AuthZGuard`, `AuthZButton` and `user.role` all
resolve through it, so the controls answer that endpoint and everything
downstream follows. `access/access.ts` is what decides:
`accessFor(preset, extra)` returns the permission set, whether a given check is
allowed, and the legacy role it derives.

- **Access**: `admin`, `editor`, `viewer`, `anonymous`, `grant-all`, `deny-all`,
  `custom`, `dev-tools`.
- **Permissions**: granted on top of the preset, as `relation:kind`
  (`read:logs`, `create:serviceaccount`, …); `custom` starts from nothing, so
  there the list is the whole grant. Generated from
  `lib/authz/hooks/useAuthZ/permissions.type.ts`, so a resource added to the
  catalogue shows up without touching Storybook. A selector-scoped check
  (`update` on `role:some-id`) matches the entry for its kind; the legacy
  `assignee:role:signoz-*` permissions are listed individually.
- **Check state**: `loaded`, `loading` or `error`, the same forcing the AuthZ
  dev modal offers.

`user.role` comes from the same grant, derived the way `AppProvider` derives it,
so the legacy role, `hasEditPermission`, `routePermission` and
`componentPermission` all follow the same control and no story can set them to
something the check endpoint disagrees with. The runtime writes the result to
`<body data-signoz-story-role>`, and the provider tree writes what
`useAppContext()` actually yields to `<body data-signoz-context-role>`, so
whether the page is reading it is one glance away in the Elements panel.

Granting no legacy role at all (`deny-all`, or `custom` without one ticked)
derives `ANONYMOUS`, exactly as `AppProvider` does. The legacy checks are written
as `role !== VIEWER`, so an anonymous user passes them and sees *more* than a
viewer. That is the app's gap, faithfully reproduced: to see the viewer UI, grant
the viewer role. The role-named presets exist because those checks still exist;
when the roles go, delete the presets and the derivation. The permission list
stays.

For anything finer than a preset, the app's own dev tools are mounted in every
story: `⌘K` → **AuthZ DevTools** lists the permissions the page actually checked
and overrides them one by one (granted, denied, delayed, error). Set Access to
`dev-tools` first, because the other values reset the override store on render, so
a leftover override from a real dev session cannot answer for the controls panel.
Overrides only apply while `IS_DEV` is true, which means the dev server, not a
static build.

Adding or renaming a project-level control needs a tab reload: Vite hot-updates
`preview.tsx` without re-preparing the open stories, so the panel keeps the
controls, and the arg values, it was built with.

## Module mocks

Aliased for every story in `.storybook/main.ts`, the same way `jest.config.ts`
does it through `moduleNameMapper`. Each replacement is typed as the module it
stands in for, so an export added to the real module is a compile error here
rather than a story that fails at render:

| Module                | Replacement                        | Why                                        |
| --------------------- | ---------------------------------- | ------------------------------------------ |
| `lib/history`         | `navigation/history.alias.ts`      | keeps a story on its page, see below       |
| `store`               | `mocks/store.mock.ts`              | the singleton answers from the story's store |
| `api/common/logEvent` | `mocks/logEvent.mock.ts`           | analytics never leave the iframe           |
| `constants/env`       | `mocks/env.mock.ts`                | pins the API origin the handlers answer on |

`store` is the redux singleton, not the provider. A story mounts its own store,
but around a dozen modules read `store.getState()` directly, and one of them,
`lib/getStartEndRangeTime`, is how every query decides the time range it asks
for. Without the alias those modules answer from a store no story seeded, so the
time picker shows one range and the data covers another.

Mocks use `fn()` from `storybook/test`, so a play function can assert on them:

```tsx
import logEvent from 'api/common/logEvent';

play: async () => {
	await expect(logEvent).toHaveBeenCalledWith('Homepage: Visited', {});
},
```

## Navigation

A story renders one page, so leaving that page would unmount it.
`navigation/pageScope.ts` holds the rule, `navigation/containment.ts` is what the
app sees in place of `lib/history`, and the two tell a navigation apart by
pathname:

- **Same page**: a query-param or hash change, which is how tabs, filters,
  pagination and time ranges are driven. It is applied, and the page re-renders
  the way it does in the app. Anchors are covered too: an in-page `<a href="?tab=x">`
  or `<Link to="/home?tab=x">` is intercepted and pushed onto the story's history
  rather than followed, which would navigate the iframe out of the story.
- **Another page**: a different pathname, an off-site href, `window.open` (what
  `useSafeNavigate({ newTab })` calls) or a relative `go`/`goBack`, which carries
  no target to compare against. It is swallowed and reported to
  `NavigationBlockedOverlay`, which lists what was attempted. Nothing is silently
  dropped.

The story's search is mirrored onto the iframe's URL, keeping the preview's own
params (`id`, `viewMode`, `args`, `globals`). Much of the app reads
`window.location.search` rather than the router, which is how every writer that
builds a target on top of the current params reads them, and in a story that
read would otherwise answer with the preview's query and nothing the page put
there. Two writers would then publish over each other forever: the query builder
dropping the time range, the time range dropping the query builder. Whatever the
app hands back is stripped of the preview's params again on the way in, so the
story's history stays the page's own URL.

`nuqs` is the one gap: it runs on its testing adapter and keeps its own copy of
the query string, seeded from the story's `route`. A page that writes params
through both `useQueryState` and `history.push({ search })` sees the two diverge
inside a story; a page that stays on one mechanism does not.

## Adding a page story

The `signoz-page-story` skill in `.claude/skills/` carries this as a workflow:
mapping the page, deriving its controls, and the checks a story has to pass.

1. Point the story at the page component under `src/pages/<Page>`. Title it
   `Pages/<Area>/<Page>` per [The sidebar](#the-sidebar), tag it, add its entry
   to the `storySort.order` literal in `.storybook/preview.tsx`, and give the
   meta a doc comment: what the page is, then its route.
2. Declare the page's mocks in `<Page>.stories.mocks.ts` next to it, with its
   payload builders under `<Page>/__story_mockdata__/`, and spread
   `storyMocks(<page>Mocks, { route })` into the meta.
3. Add `decorators: [withAppLayout]` to the meta.
4. Give the default story every widget populated. A page story earns its keep by
   showing what the page looks like with data, not with empty states. Every story
   export gets a doc comment saying what that state shows: it is the row the Docs
   page renders for it.
5. Run it and watch the console: an msw warning or a `[storybook] no msw handler`
   line is an endpoint the page hits that no handler covers yet.
6. Reach for a control before a story. A variant earns a story only when it is
   worth linking to; anything else is a control someone can turn.

A page that is a tab strip over several routes, such as
`src/pages/LogsModulePage`, gets one story file per tab, each in its own folder
under the module page (`LogsModulePage/Pipelines/Pipelines.stories.tsx`) with its
own mocks and `__story_mockdata__/`. All of them render the module page, so the
tab strip is there; the `route` its mocks return is what decides which tab is
open. Builders more than one tab needs stay in the module page's own
`__story_mockdata__/`.

A state that only a click reaches, such as a drawer or a modal a page holds in
component state, is a story with a `play` function rather than a control. Use
`userEvent` and the queries from `storybook/test`, take the first of a repeated
row action, and wait on the state's own text. The page fetches before it renders
a row, so the finder needs a timeout past the 1s default.

A *sequence* of those states, such as the steps of a wizard or the pages of a
questionnaire, is still a control. Declare the steps in the page's mocks and walk
them from a `play` on the meta, so every story of the page inherits the walk and
only sets `args`:

```tsx
play: async ({ mount, args, canvasElement }): Promise<void> => {
	await mount();
	await advanceToStep(canvasElement, args.step);
},
```

Destructuring `mount` is what makes the panel row work. Storybook replays a play
function on an arg change only for a story whose play asks to be remounted;
without it the story re-renders the tree the previous walk left behind and the
control looks dead. The endpoint that settles a transition between two steps then
needs a plain resolver rather than `response.json`, or the Data control on
`loading` strands the walk halfway.
