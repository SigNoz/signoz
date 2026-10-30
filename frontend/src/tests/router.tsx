import { ReactElement, ReactNode, useRef } from 'react';
import {
	Route,
	Routes,
	unstable_HistoryRouter as HistoryRouter,
	useInRouterContext,
} from 'react-router';
import history from 'lib/history';
import { getBasePath, withBasePath } from 'utils/basePath';

import { resetTestRoute } from './router-utils';

// Mounts on the `lib/history` singleton like `src/AppRoutes/index.tsx`, so
// imperative `navigate()` calls move the router. The base path is applied as the
// real mount applies it. A `TestRouter` inside another renders its children on
// the outer router and cannot take an `initialRoute`: the outer router has
// already read the location.

interface TestRouterProps {
	children: ReactNode;
	/**
	 * Seeded onto the history singleton before the router reads it. Omit to mount
	 * at whatever URL the test has already set up. `render()` defaults it to `/`.
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
	if (nested && initialRoute) {
		throw new Error(
			'A nested TestRouter cannot take initialRoute. Pass it to the outermost TestRouter or to render().',
		);
	}

	// The seed has to land before `<Router>` reads `history.location`, hence the
	// render body rather than an effect. The ref keeps it to the first render, so
	// a navigation made by the component under test is not undone.
	const seeded = useRef(false);
	if (!seeded.current) {
		seeded.current = true;
		if (initialRoute) {
			// The raw history no longer strips or prepends the base path (the
			// router owns it), so the seed has to be a real browser path.
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

// Registered here rather than in `test-utils` so a suite that mounts
// `TestRouter` without importing the harness starts every test at `/` too.
beforeEach(() => {
	resetTestRoute();
});
