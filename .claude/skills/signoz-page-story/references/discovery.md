# Mapping a page

Two passes: read the code, then let the running story correct you. Write the
inventory down: it is what the controls are derived from, and the only
protection against a story that renders one state and calls it a page.

## Pass 1: read the page

Start at `src/pages/<Page>/` and follow it outward: the containers it mounts
(`src/container/<Feature>/`), the hooks those use, the components with their own
fetches. Stop at leaf components that take props only.

Grep recipes, run against the page's directories:

| Looking for | Grep |
| --- | --- |
| endpoints | `useQuery\|useMutation\|useInfiniteQuery`, then the `api/` module it calls |
| endpoint URLs | the api module's `axios.get\|post` |
| endpoint URLs behind a generated hook | the hook lives in `src/api/generated/services/<name>/index.ts` and the URL only appears in the fetcher body: `rg 'url: \`' src/api/generated/services/<name>/` |
| url state | `useUrlQuery\|useUrlQueryData\|useUrlSearchState\|useQueryState\|QueryParams\.` |
| navigation | `useSafeNavigate\|history.push\|<Link` |
| permissions | `useAuthZ\|AuthZGuard\|AuthZButton\|hasEditPermission\|routePermission` |
| flags and prefs | `useFeatureFlag\|FeatureKeys\.\|USER_PREFERENCES\.\|userPreferences` |
| empty and error branches | `isLoading\|isError\|isFetching\|length === 0\|!data` |
| render caps | `slice(0,\|PAGE_SIZE\|pageSize\|limit` |

`src/constants/routes.ts` has the route, `src/constants/query.ts` the param names,
`src/lib/authz/README.md` how a permission check resolves.

## The inventory

One table, in the story's PR or scratch notes:

| Endpoint | Feeds | States it can be in |
| --- | --- | --- |
| `GET /api/v1/x` | the header count | populated, zero, error |

Plus four short lists:

- **Query params** the page reads, and what each one switches.
- **Permission checks** the page makes, and what disappears when each is denied.
- **Preferences and flags** that change layout (dismissed banners, onboarding
  checklists, opt-in views).
- **Caps**: how many rows each list renders before it truncates or paginates.

A state that appears in this inventory and not in the controls panel is a bug in
the story.

## Pass 2: let it run

Write the story and an empty `defineStoryMocks({ controls: {} })`, point it at the
route, add `withAppLayout`, then open it (see verify.md). The console is the
oracle:

- `[storybook] no msw handler` or a 501 from the catch-all: an endpoint pass 1
  missed. Add it to the inventory.
- an msw unhandled-request warning: a request going to an origin the handlers do
  not answer on. handlers are declared against `http://localhost`.
- a spinner that never resolves with the Data control on `loaded`: a handler
  whose URL does not match what the page calls.
- the navigation overlay on mount: the page redirects, usually because `route`
  is wrong or a guard is failing on a permission the controls have not granted.

Repeat until the console is silent. Only then start declaring controls.
