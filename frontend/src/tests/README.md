### Testing Guide

#### Tech Stack
- React Testing Library (RTL)
- Jest (runner, assertions, mocking)
- MSW (Mock Service Worker) for HTTP
- TypeScript (type-safe tests)
- JSDOM (browser-like env)

#### Unit Testing: What, Why, How
- What: Small, isolated tests for components, hooks, and utilities to verify behavior and edge cases.
- Why: Confidence to refactor, faster feedback than E2E, catches regressions early, documents intended behavior.
- How: Use our test harness with providers, mock external boundaries (APIs), find elements by test ID, and assert on visible behavior, not implementation details.

#### Basic Template
```ts
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { server, rest } from 'mocks-server/server';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders and interacts', async () => {
    const user = userEvent.setup();

    server.use(
      rest.get('*/api/v1/example', (_req, res, ctx) => res(ctx.status(200), ctx.json({ value: 42 })))
    );

    render(<MyComponent />, undefined, { initialRoute: '/foo' });

    expect(await screen.findByText(/value: 42/i)).toBeInTheDocument();
    await user.click(screen.getByTestId('refresh-button'));
    await waitFor(() => expect(screen.getByText(/loading/i)).toBeInTheDocument());
  });
});
```

#### Rules (highlights)
The full list is [`.claude/rules/frontend-tests.md`](../../../.claude/rules/frontend-tests.md).

- Import from `tests/test-utils` only.
- Prefer `userEvent` for real interactions; use `fireEvent` only for low-level events (scroll/resize/setting `scrollTop`).
- `userEvent.setup(NO_DELAY_USER_EVENT)` (from `tests/test-utils`) skips the timer wait after each key and click; `user.paste` long values. Keep the default delay when the test checks what happens between two actions (a debounce per key).
- One behaviour per test, rendering the smallest component that owns it; each test under 500 ms (`pnpm jest <file> --verbose`).
- Never call `*ByRole` inside `waitFor`; never raise a timeout to make a slow test pass.
- Use MSW to mock network calls; large JSON goes in `mocks-server/__mockdata__`.
- To test a loading state, hold the response with `holdResponse()` from `tests/holdResponse`: await `held` in the handler and call `release()` before the test ends. Never time it with `ctx.delay`.
- Keep tests type-safe (`jest.MockedFunction<T>`, avoid `any`).
- Find elements by test ID (`getByTestId`, `findByTestId`); role or text only for markup the app doesn't own.
- Pin time only when asserting relative dates; avoid global fake timers otherwise.

Repo-specific reasons:
- The harness wires Redux, React Query, i18n, timezone, preferences, so importing from RTL directly bypasses critical providers.
- Some infra deps are globally mocked (e.g., `uplot`) to keep tests fast and stable.
- `jest.environment.cjs` keeps library CSS (antd's runtime styles, CodeMirror's theme, `@signozhq/ui`'s injected modules) out of the document, as `moduleNameMapper` already does for the app's own stylesheets. jsdom matches every rule on each `getComputedStyle` call, so with them loaded a role query took up to half a second.
- Nothing is hidden by CSS in tests. A closed antd popover stays in the DOM, so unmount it on close (`destroyTooltipOnHide`) when a test checks that it closed. Base UI keeps slider thumbs at `visibility: hidden` until it measures layout, which jsdom never does, so query them with `{ hidden: true }`.
- `jest.setup.ts` turns off user-event's pointer-events check for every test. Base UI popups sit inside an element with an inline `pointer-events: none`, and the stylesheet that turns it back on never loads.
- For virtualization (react-virtuoso), there is no `userEvent` scroll helper; use `fireEvent.scroll` after setting `element.scrollTop`.

#### Example patterns (from `components/QuickFilters/tests/QuickFilters.test.tsx`)
MSW overrides per test:
```ts
server.use(
  rest.get(`${ENVIRONMENT.baseURL}/api/v1/orgs/me/filters/logs`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(quickFiltersListResponse)),
  ),
  rest.put(`${ENVIRONMENT.baseURL}/api/v1/orgs/me/filters`, async (req, res, ctx) => {
    // capture payload if needed
    return res(ctx.status(200), ctx.json({}));
  }),
);
```

Mock hooks minimally at module level:
```ts
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
  useQueryBuilder: jest.fn(),
}));
```

Interact via test IDs:
```ts
const user = userEvent.setup();
await user.click(screen.getByTestId('save-changes'));
expect(screen.getByText(/ADDED FILTERS/i)).toBeInTheDocument();
```

Virtualized scroll (`<Virtuoso>` passes its `data-testid` to the scroll element):
```ts
const scroller = screen.getByTestId('logs-list-virtuoso-scroller');
scroller.scrollTop = 500;
fireEvent.scroll(scroller);
```

Routing-dependent behavior:
```ts
render(<Page />, undefined, { initialRoute: '/logs-explorer?panelType=list' });

// Pattern params: mount under the route the page reads them from.
render(<Page />, undefined, {
  initialRoute: '/dashboard/abc',
  routePath: ROUTES.DASHBOARD,
});

// Where the component navigated to.
expect(getCurrentLocation().pathname).toBe(ROUTES.HOME);
```

Module-level `navigate()` and `getCurrentLocation()` drive the mounted router and throw
when none is. Render first, or attach one with `attachTestRouter` from `tests/router-utils`.

Never mock the router packages (`react-router`, `react-router-dom`);
`signoz/no-direct-react-router-import` rejects it. When a test cannot render at a route,
or asserts the call itself, spy on the `lib/router` facade with `tests/router-mocks`:
```ts
mockAppLocation({ pathname: ROUTES.LOGS_EXPLORER });
mockAppParams({ dashboardId: 'abc' });
const navigate = mockAppNavigate(); // what useAppNavigate() returns
const navigateSpy = mockNavigate(); // module-level navigate()
```

#### Notes
- Global mocks configured in Jest: `uplot` → `__mocks__/uplotMock.ts`; `@testing-library/user-event` in `jest.setup.ts`.
- If a test needs custom behavior (e.g., different API response), override with `server.use(...)` locally.
