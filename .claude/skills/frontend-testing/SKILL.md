---
name: frontend-testing
description: Guide for writing and updating SigNoz frontend unit and integration (component) tests with Jest + React Testing Library. Use whenever you are creating a `*.test.ts`/`*.test.tsx` file, adding coverage for a component, hook, util, or provider under `frontend/src`, mocking an API for a component test, or fixing/optimizing an existing frontend test. Covers the custom `tests/test-utils` render, the MSW mock server, the nuqs testing adapter, `renderHook`, data-testid conventions, and the speed/flake pitfalls specific to this codebase.
---

# SigNoz frontend testing

Write frontend tests the way this repo already does. **Match the nearest existing test** in the same folder before inventing a pattern — consistency beats cleverness. This guide encodes the conventions so a new test looks like it was always there.

Everything below is scoped to `frontend/` (package manager is **pnpm**; the E2E Playwright suite under `tests/e2e/` is a separate stack — see `docs/contributing/tests/e2e.md`, not this skill).

## The two kinds of test in this repo

| | **Unit** | **Integration (component)** |
|---|---|---|
| Target | pure functions, hooks, reducers, selectors | a component / container rendered with its providers |
| Render | none, or `renderHook` | the custom `render` from `tests/test-utils` |
| API | not involved | **MSW** mock server (`mocks-server/`) |
| Assert on | return value / state | rendered DOM + user interactions |

Both live beside the code they test, never in a separate top-level tree.

## Decision checklist (read before writing)

1. **Is there a sibling test?** `ls` the folder for `__tests__/`, `__test__/`, or `tests/` and a `*.test.tsx`. If one exists, copy its imports and structure. Folder naming is inconsistent across the repo — follow the folder you are in, don't rename it.
2. **Unit or integration?** Use the table above.
3. **Does it hit an API?** If yes, you need MSW (see [API mocking](#api-mocking-msw)). Never let a component fire a real request.
4. **Does it read/write the URL (`nuqs`)?** If yes, use the nuqs testing adapter (see [URL state](#url-state-nuqs)).
5. **What's the query?** Prefer `data-testid` (see [Queries](#queries--assertions)). If the component lacks one on a critical control, add it to the component — `frontend/CLAUDE.md` requires testids on inputs/buttons.

## File placement & naming

- Co-locate: `Foo.tsx` → `Foo.test.tsx` next to it, or under a `__tests__/` folder beside it. Match whatever the sibling files do.
- `testMatch` is `src/**/*(*.)test.(ts|js)?(x)` — the file **must** end in `.test.ts`/`.test.tsx`.
- Name integration specs that render a subtree `*.integration.test.tsx` when the folder already uses that suffix (e.g. `NewSelect/__test__/VariableItem.integration.test.tsx`); otherwise plain `.test.tsx`.
- Shared per-suite render/setup goes in a `_helpers.tsx` or `*.testUtils.tsx` in the same folder — not exported app-wide.

## Integration tests: the custom `render`

Import `render` (and `screen`, `userEvent`, matchers) from **`tests/test-utils`**, not from `@testing-library/react` directly. The custom render wraps the component in every provider the app needs — `MemoryRouter`, `NuqsAdapter`, react-query `QueryClientProvider`, a redux mock store, `AppContext`, `Timezone`, `QueryBuilderProvider`, etc. — so a container renders exactly as it does in the app.

```tsx
import { render, screen, userEvent } from 'tests/test-utils';

import MyPanel from '../MyPanel';

describe('MyPanel', () => {
  it('renders the empty state when there is no data', () => {
    render(<MyPanel />);
    expect(screen.getByTestId('my-panel-empty')).toBeInTheDocument();
  });
});
```

### Provider overrides (third argument)

`render(ui, options?, providerProps?)`. The third arg drives the providers:

```tsx
render(<RolesSettings />, undefined, {
  role: 'VIEWER',                       // 'ADMIN' (default) | 'EDITOR' | 'VIEWER'
  initialRoute: '/settings/roles?tab=members', // seeds MemoryRouter + URL
  appContextOverrides: {                // deep-merge over getAppContextMock(role)
    featureFlags: [{ name: FeatureKeys.GATEWAY, active: false, usage: 0, usage_limit: -1, route: '' }],
  },
  queryBuilderOverrides: { /* Partial<QueryBuilderContextType> */ },
});
```

- Use `role` to test permission gating (`hasEditPermission` is derived: ADMIN/EDITOR ⇒ true).
- Use `appContextOverrides` for licence state, feature flags, user/org, preferences — see `getAppContextMock` in `tests/test-utils.tsx` for the full shape. Import `getAppContextMock` directly when you build a bespoke wrapper (as `ListAlertRules/__tests__/_helpers.tsx` does).
- Don't hand-roll a provider stack unless a component needs something the custom render can't express (e.g. `VirtuosoMockContext` for a virtualised list, or a bespoke provider). When you do, model it on `_helpers.tsx` and still reuse `getAppContextMock`.

### What's already handled for you (don't re-mock)

The global `jest.setup.ts` and `test-utils` already provide these — reusing them keeps tests fast and consistent:

- **`react-i18next`** — `t` returns the key verbatim. Assert on keys, not translated copy.
- **MSW server** — `server.listen()` / `resetHandlers()` / `close()` run around every test automatically.
- **`ResizeObserver`, `IntersectionObserver`, `matchMedia`, `scrollIntoView`, Pointer Capture** — stubbed for jsdom + Radix/Ant.
- **System time** pinned to `2023-10-20` (`test-utils` sets it in `beforeEach`). Override per-suite with `jest.setSystemTime(new Date('...'))` when a test needs a specific clock.
- Module mocks in `frontend/__mocks__/` and `src/__tests__/` (`safeNavigateMock`, `logEventMock`, icons, css, uplot, motion). Import the shared mock rather than writing your own:
  ```ts
  import { safeNavigateMock } from '__tests__/safeNavigateMock';
  import { logEventMock } from '__tests__/logEventMock';
  ```

## API mocking (MSW)

APIs are mocked with **MSW**, not by hand-mocking `axios` or react-query. The server is started globally; default handlers live in `src/mocks-server/handlers.ts` with fixtures in `src/mocks-server/__mockdata__/`.

**Prefer overriding a handler per-test** over `jest.mock`-ing the api module — it exercises the real react-query + api layer:

```tsx
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';

it('shows an error when the rules API 500s', async () => {
  server.use(
    rest.get('*/api/v1/rules', (_req, res, ctx) => res(ctx.status(500))),
  );
  render(<ListAlertRules />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

- Add a reusable happy-path handler + fixture to `handlers.ts` / `__mockdata__/` when several tests need it; use `server.use(...)` for the one-off/error case. `resetHandlers()` after each test wipes per-test overrides automatically.
- For an API call the component makes, prefer an MSW handler over mocking the generated hook. Reach for `jest.mock('api/...')` only when the module has no HTTP surface to intercept (pure client-side helper) or the sibling tests already mock it that way.

## URL state (nuqs)

Components built on `nuqs` must use the **testing adapter**, not the real one (which throttles writes to `window.history`). Use the helpers in `tests/nuqs-helpers.ts`:

- `resetNuqsState(initialSearch)` in setup, `onNuqsUrlUpdate` as the adapter's `onUrlUpdate`, and assert with `getCurrentNuqsQueryString()` / `getCurrentNuqsSearchParams()`.
- `window.location.search` is **not** authoritative in tests — the adapter keeps state in memory. Assert via the helpers.
- The default `render` already installs `NuqsAdapter`; when you build a custom wrapper, use `NuqsTestingAdapter` with `rateLimitFactor={0}` and `hasMemory` (see `_helpers.tsx`).

## Hook & util tests

```tsx
import { act, renderHook } from '@testing-library/react';
import { useThing } from '../useThing';

it('increments', () => {
  const { result } = renderHook(() => useThing());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

- A hook that needs context/providers takes a `wrapper` — build a small local `createWrapper(props)` returning the minimal provider tree (see `QuerySearchV2` context tests). Don't pull in the full app render for a focused hook test.
- Pure utils: no render at all — call the function and assert. Keep these fast and exhaustive (edge cases, empty/undefined, boundaries).

## Queries & assertions

Locator priority (matches `frontend/CLAUDE.md`):

1. `getByTestId('...')` / `findByTestId` — **preferred**. If a critical control has no testid, add one to the component.
2. `getByRole('button', { name: /save/i })`
3. `getByLabelText`, `getByPlaceholderText`
4. `getByText` — last resort; brittle against copy edits (and i18n returns keys here).

Rules:

- **`findBy*` for anything async** (after a click that fires a request, or portal content). `getBy*` throws immediately — only for content already in the DOM.
- **`queryBy*` for absence**: `expect(screen.queryByRole('menu')).not.toBeInTheDocument()`.
- Radix/Ant menus and dialogs render in a **portal** — after opening, `await screen.findByRole('menu')`/`'dialog'`, then query items inside it.
- Use `@testing-library/jest-dom` matchers (`toBeInTheDocument`, `toBeDisabled`, `toHaveTextContent`) — they're globally available.

## Interactions

Prefer `userEvent` over `fireEvent` for real user flows. **Set it up with `delay: null`** so tests don't wait real time between keystrokes:

```tsx
const user = userEvent.setup({ delay: null });
await user.click(screen.getByTestId('open-menu'));
await user.type(screen.getByRole('textbox'), 'cpu');
```

`fireEvent` is fine for a single low-level event where `userEvent` is overkill.

## Performance & flake — do / don't

**Do**

- `userEvent.setup({ delay: null })` — the single biggest per-test speedup.
- `await expect(locator).toBeVisible()` / `await screen.findBy...` to wait on state.
- Reuse the shared render, MSW server, and `__mocks__/` — re-mocking heavy modules per file is slow.
- Keep pure logic in utils and unit-test it directly instead of asserting it through a full component render.
- Scope MSW overrides tightly and rely on the automatic `resetHandlers()`.

**Don't**

- ❌ `await new Promise(r => setTimeout(r, 500))` or `waitForTimeout` — poll with `findBy`/`waitFor` instead.
- ❌ `it.only` / `describe.only` / `fit` / `fdescribe` — CI and lint forbid `.only`; a stray one silently drops the rest of the suite.
- ❌ Leaving `it.skip`/`xit` behind — either fix and enable, or delete it and open an issue. A permanently-skipped test is dead coverage that reads as green.
- ❌ `console.log` in committed tests.
- ❌ Asserting on translated strings (i18n mock returns the key) or on real timers/dates (clock is pinned).
- ❌ Real network — every request must be an MSW handler.

## Running & verifying

From `frontend/`:

```bash
pnpm jest path/to/File.test.tsx        # one file
pnpm jest -t "renders the empty state"  # by test name
pnpm jest:watch                         # watch mode while iterating
pnpm test:changedsince                  # only tests changed vs main, with coverage
pnpm jest:coverage                      # full coverage run
```

Before calling a test task done (per `frontend/CLAUDE.md`):

```bash
pnpm tsgo --noEmit        # types
pnpm oxlint <files>       # lint the files you touched, fix all warnings
pnpm jest <files>         # the tests pass
```

## Author checklist

- [ ] File ends in `.test.tsx`, co-located, matching the sibling folder's convention.
- [ ] Imports `render`/`screen`/`userEvent` from `tests/test-utils` (integration) or uses `renderHook` (hook).
- [ ] Every API call is an MSW handler; no real network, no ad-hoc axios mock.
- [ ] nuqs components use the testing adapter; URL asserted via `getCurrentNuqs*`.
- [ ] Queries use `data-testid` first; async waits use `findBy*`; portals awaited by role.
- [ ] `userEvent.setup({ delay: null })`; no `setTimeout`/`waitForTimeout`.
- [ ] No `.only`, no stray `.skip`, no `console.log`.
- [ ] Assertions cover success **and** the failure/empty/permission path.
- [ ] `pnpm tsgo --noEmit`, `pnpm oxlint`, and `pnpm jest` all green on the touched files.
