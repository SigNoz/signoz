---
paths:
  - "frontend/src/**/*.test.ts"
  - "frontend/src/**/*.test.tsx"
---

# Frontend tests

Examples and the harness API live in [`frontend/src/tests/README.md`](../../frontend/src/tests/README.md).

- **Import from the harness.** `render`, `screen`, `userEvent`, `waitFor` and the rest come from `tests/test-utils`, never from `@testing-library/react`. The harness mounts the router, React Query, Redux, app context and preferences. When it can't do what a test needs, extend `tests/test-utils` instead of importing around it.
- **Find elements by test ID.** Query with `getByTestId`/`findByTestId` on the `data-testid` or `testId` the component exposes, and add one to the component when it has none. Fall back to role or text only for markup the app doesn't own. A test ID matches exactly one element and survives copy and markup changes; `getByRole` checks the computed style of every element it visits and is the slowest query. Always go through Testing Library (`screen`, `within`), never the DOM: no `querySelector`, `closest`, `container` or `document.body`. Never call a `*ByRole` query inside `waitFor` or a loop: `waitFor` re-runs its callback every 50 ms. Wait with `findByTestId`, then query.
- **Interact like a user.** `const user = userEvent.setup()`, then an awaited `user.click`, `hover`, `keyboard` or `type`. The harness turns off the pointer-events check: Base UI popups sit inside an element with an inline `pointer-events: none`, and the stylesheet that turns it back on for the popup never loads in jsdom, so the check would block every click on them. Never turn it back on. `fireEvent` only for events `userEvent` has no equivalent for: scroll, resize, setting `scrollTop`.
- **Fake timers per test only**, for debounce or throttle, with `userEvent.setup({ advanceTimers: (ms) => jest.advanceTimersByTime(ms) })`. Never global.
- **Network through MSW.** The global server runs for every test; override per test with `server.use(...)` from `mocks-server/server`. Large fixtures go in `mocks-server/__mockdata__`.
- **Router through the harness.** Pass `initialRoute`/`routePath` to `render` and assert with `getCurrentLocation()` from `lib/router/navigation`. Never mock `react-router`, `react-router-dom` or `lib/history`; when a test can't render at a route, use the `lib/router` spies in `tests/router-mocks`.
- **Mock only business boundaries.** Local `jest.mock` for API modules, custom hooks and domain components. Never re-mock what the harness provides (`@testing-library/user-event` in `jest.setup.ts`) or what `jest.config.ts` maps (`uplot`, `@signozhq/icons`, `useSafeNavigate`, `logEvent`).
- **Type mocks and fixtures.** `jest.mocked(fn)` for module mocks, `jest.fn() as jest.MockedFunction<T>` for a standalone mock you configure or assert on. Fixtures carry their real type, from `src/api/generated` where it exists. No `any`, no `as unknown as`. An inline `onX={jest.fn()}` on a typed prop that is never asserted needs no annotation.
- **One behaviour per test, at the smallest render.** Render the component that owns the behaviour, not the page around it, unless the page wiring is the behaviour. A flow of steps (a wizard, a multi-step form) becomes one test per step that starts at that step through props, store or route. A full click-through belongs in the e2e suite (`tests/e2e`).
- **Each test under 500 ms.** `pnpm jest <file> --verbose` prints each test's time. CI runs about four times slower than a laptop, and the timeout is 5 s. Never raise a timeout (`jest.setTimeout`, a third argument to `it`) to make a slow test pass; slim the test instead.
- **A test fails without its change.** At the gate in [`frontend/AGENTS.md`](../../frontend/AGENTS.md), revert the change, or break the line under test, and run the test: it must fail, and each test must stay under 500 ms. Assert the specific outcome (exact text, request payload, call arguments), never only that an element exists.
- **No limit on tests per file.** Split a file when it mixes unrelated behaviour, not to hit a count.
