import { ReactElement, ReactNode, useRef } from 'react';
import {
	Route,
	Routes,
	unstable_HistoryRouter as HistoryRouter,
	useInRouterContext,
} from 'react-router';
import history from 'lib/history';
import { getBasePath, withBasePath } from 'utils/basePath';

// The router half of the test harness. It lives apart from `test-utils` so that
// a test can mount a router without also inheriting that module's global mocks,
// fake system time and provider stack.
//
// Two deliberate differences from the `MemoryRouter` these replaced:
//
// - The tree mounts on the `lib/history` singleton, mirroring the real mount in
//   `src/AppRoutes/index.tsx`. Imperative `navigate()` calls write to that
//   singleton, so a `MemoryRouter` would never see them — components that
//   navigate outside a render simply did not move the router before.
// - The base path is applied the same way the real mount applies it, so a test
//   reads the same pathnames the app does.
//
// Nesting is a no-op: several suites render `AllTheProviders` inside a
// `render()` that already wraps it, and a second router would trip v6's
// one-router-per-tree invariant. Since every instance drives the same
// singleton, the inner one can just pass its children through.

interface TestRouterProps {
	children: ReactNode;
	/**
	 * Seeded onto the history singleton before the router reads it. Omit to mount
	 * at whatever URL the test has already set up.
	 */
	initialRoute?: string;
	/**
	 * Route pattern(s) to mount the children under, for a component that reads
	 * `useParams`. Matching is exact, which is `<Routes>`'s default.
	 */
	routePath?: string | string[];
}

export function TestRouter({
	children,
	initialRoute,
	routePath,
}: TestRouterProps): ReactElement {
	const nested = useInRouterContext();

	// The seed has to land before `<Router>` reads `history.location`, hence the
	// render body rather than an effect. The ref keeps it to the first render, so
	// a navigation made by the component under test is not undone.
	const seeded = useRef(false);
	if (!seeded.current) {
		seeded.current = true;
		if (initialRoute) {
			// The raw history no longer strips or prepends the base path — the
			// router owns it — so the seed has to be a real browser path.
			history.replace(withBasePath(initialRoute));
		}
	}

	const tree = routePath ? (
		<Routes>
			{(Array.isArray(routePath) ? routePath : [routePath]).map((pattern) => (
				<Route key={pattern} path={pattern} element={children} />
			))}
		</Routes>
	) : (
		children
	);

	if (nested) {
		return <>{tree}</>;
	}

	return (
		<HistoryRouter basename={getBasePath()} history={history}>
			{tree}
		</HistoryRouter>
	);
}

TestRouter.defaultProps = {
	initialRoute: undefined,
	routePath: undefined,
};

/** Returns the history singleton to the state a suite should start each test in. */
export function resetTestRoute(): void {
	history.replace(withBasePath('/'));
}
