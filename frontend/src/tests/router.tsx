import { ReactElement, ReactNode, useRef } from 'react';
import { Route, Router } from 'react-router-dom';
import { CompatRouter, useInRouterContext } from 'react-router-dom-v5-compat';
import history from 'lib/history';

import { resetTestRoute } from './router-utils';

// Mounts on the `lib/history` singleton like `src/AppRoutes/index.tsx`, so
// imperative `navigate()` calls move the router. `CompatRouter` is always
// present for the v6-only facade hooks. A `TestRouter` inside another renders
// its children on the outer router and cannot take an `initialRoute`: the outer
// `CompatRouter` has already read the location, so v6-backed hooks would keep
// the outer route.

interface TestRouterProps {
	children: ReactNode;
	/**
	 * Seeded onto the history singleton before the router reads it. Omit to mount
	 * at whatever URL the test has already set up. `render()` defaults it to `/`.
	 */
	initialRoute?: string;
	/**
	 * Route pattern(s) to mount the children under, for a component that reads
	 * `useParams`. Matching is exact.
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
			history.replace(initialRoute);
		}
	}

	const tree = routePath ? (
		<Route exact path={routePath}>
			{children}
		</Route>
	) : (
		children
	);

	if (nested) {
		return <>{tree}</>;
	}

	return (
		<Router history={history}>
			<CompatRouter>{tree}</CompatRouter>
		</Router>
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
