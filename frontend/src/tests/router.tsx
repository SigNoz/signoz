import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { Route, Routes, useInRouterContext } from 'react-router';
import { HostRouter } from 'lib/router/HostRouter';

import { attachTestRouter, resetTestRoute } from './router-utils';

// Each mount creates a browser data router over jsdom's `window.history`, the
// way `src/AppRoutes/index.tsx` mounts one, and attaches it to
// `lib/router/navigation`, so imperative `navigate()` calls move it and
// `useAppBlocker` works. The base path is applied as the real mount applies it.
// A `TestRouter` inside another renders its children on the outer router and
// cannot take an `initialRoute`: the outer router has already read the URL.

interface TestRouterProps {
	children: ReactNode;
	/**
	 * Seeded onto `window.history` before the router reads it. Omit to mount at
	 * whatever URL the test has already set up. `render()` defaults it to `/`.
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
	const patterns = routePath === undefined ? undefined : [routePath].flat();
	// Attached while rendering rather than in an effect: children run their
	// effects first, and one that subscribes or navigates must reach this router.
	const [mounted] = useState(() =>
		nested ? undefined : attachTestRouter(initialRoute, patterns),
	);

	useEffect(() => (): void => mounted?.release(), [mounted]);

	if (mounted) {
		return <HostRouter router={mounted.router}>{children}</HostRouter>;
	}

	if (!patterns) {
		return <>{children}</>;
	}

	return (
		<Routes>
			{patterns.map((pattern) => (
				<Route key={pattern} path={pattern} element={children} />
			))}
		</Routes>
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
