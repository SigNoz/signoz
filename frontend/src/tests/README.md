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
- How: Use our test harness with providers, mock external boundaries (APIs, router), assert on visible behavior and accessible roles, not implementation details.

#### Basic Template
```ts
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { server, rest } from 'mocks-server/server';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders and interacts', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    server.use(
      rest.get('*/api/v1/example', (_req, res, ctx) => res(ctx.status(200), ctx.json({ value: 42 })))
    );

    render(<MyComponent />, undefined, { initialRoute: '/foo' });

    expect(await screen.findByText(/value: 42/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(screen.getByText(/loading/i)).toBeInTheDocument());
  });
});
```

#### .cursorrules (Highlights)
- Import from `tests/test-utils` only.
- Prefer `userEvent` for real interactions; use `fireEvent` only for low-level events (scroll/resize/setting `scrollTop`).
- Use MSW to mock network calls; large JSON goes in `mocks-server/__mockdata__`.
- Keep tests type-safe (`jest.MockedFunction<T>`, avoid `any`).
- Prefer accessible queries (`getByRole`, `findByRole`) before text and `data-testid`.
- Pin time only when asserting relative dates; avoid global fake timers otherwise.

Repo-specific reasons:
- The harness wires Redux, React Query, i18n, timezone, preferences, so importing from RTL directly bypasses critical providers.
- Some infra deps are globally mocked (e.g., `uplot`) to keep tests fast and stable.
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

Interact via accessible roles:
```ts
const user = userEvent.setup({ pointerEventsCheck: 0 });
await user.click(screen.getByRole('button', { name: /save changes/i }));
expect(screen.getByText(/ADDED FILTERS/i)).toBeInTheDocument();
```

Virtualized scroll:
```ts
const scroller = container.querySelector('[data-test-id="virtuoso-scroller"]') as HTMLElement;
scroller.scrollTop = 500;
fireEvent.scroll(scroller);
```

Routing-dependent behavior:
```ts
render(<Page />, undefined, { initialRoute: '/logs-explorer?panelType=list' });
```

#### Notes
- Global mocks configured in Jest: `uplot` → `__mocks__/uplotMock.ts`.
- If a test needs custom behavior (e.g., different API response), override with `server.use(...)` locally.
