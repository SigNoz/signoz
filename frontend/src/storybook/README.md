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

A page's own mocks live with the page, not here. See [Adding a page
story](#adding-a-page-story).

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
5. `src/mocks-server/handlers.ts`, the jest handlers verbatim. An endpoint both
   runners need belongs here so jest gets it too;
6. a catch-all for `http://localhost/api/*` that logs and answers 501, so an
   endpoint nobody mocked fails loudly instead of hanging on a refused
   connection.

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

const meta = {
	title: 'Pages/Home',
	component: HomePage,
	decorators: [withAppLayout],
	...storyMocks(homeMocks, { route: ROUTES.HOME }),
} satisfies Meta<HomeArgs>;

export const NoIngestion: StoryObj<HomeArgs> = {
	args: { logsIngestion: false, tracesIngestion: false, metricsIngestion: false },
};
```

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
| `api/common/logEvent` | `mocks/logEvent.mock.ts`           | analytics never leave the iframe           |
| `constants/env`       | `mocks/env.mock.ts`                | pins the API origin the handlers answer on |

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

`nuqs` is the one gap: it runs on its testing adapter and keeps its own copy of
the query string, seeded from the story's `route`. A page that writes params
through both `useQueryState` and `history.push({ search })` sees the two diverge
inside a story; a page that stays on one mechanism does not.

## Adding a page story

The `signoz-page-story` skill in `.claude/skills/` carries this as a workflow:
mapping the page, deriving its controls, and the checks a story has to pass.

1. Point the story at the page component under `src/pages/<Page>`.
2. Declare the page's mocks in `<Page>.stories.mocks.ts` next to it, with its
   payload builders under `<Page>/__story_mockdata__/`, and spread
   `storyMocks(<page>Mocks, { route })` into the meta.
3. Add `decorators: [withAppLayout]` to the meta.
4. Give the default story every widget populated. A page story earns its keep by
   showing what the page looks like with data, not with empty states.
5. Run it and watch the console: an msw warning or a `[storybook] no msw handler`
   line is an endpoint the page hits that no handler covers yet.
6. Reach for a control before a story. A variant earns a story only when it is
   worth linking to; anything else is a control someone can turn.
