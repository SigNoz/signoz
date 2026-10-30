import type { ComponentType, ReactNode } from 'react';
import { type RouteObject, useOutletContext } from 'react-router';
import NotFound from 'components/NotFound';
import { RethrowRouteError } from 'lib/router/RethrowRouteError';

import { Home } from './pageComponents';
import routes, { AppRoutes, LIST_LICENSES, SUPPORT_ROUTE } from './routes';

/**
 * The routes the plan, the license and the feature flags enable. The root
 * layout computes it and hands it down as outlet context.
 */
export type EnabledRouteKeys = ReadonlySet<AppRoutes['key']>;

interface RouteGateProps {
	routeKey: AppRoutes['key'];
	component: ComponentType;
}

/**
 * The table is created once, so a route the session may not use is still in
 * it. It renders the not-found page instead, which is what the old dynamic
 * `<Switch>` fell through to.
 */
function RouteGate({
	routeKey,
	component: Component,
}: RouteGateProps): JSX.Element {
	const enabledRouteKeys = useOutletContext<EnabledRouteKeys>();
	return enabledRouteKeys.has(routeKey) ? <Component /> : <NotFound />;
}

/**
 * The gate is keyed by its route entry. The outlet renders the match unkeyed,
 * so every route would otherwise reuse the previous route's gate, and a lazy
 * page that resolves to the same component would keep its instance. The
 * patterns of one entry share the key.
 */
export function createGatedRoutes(appRoutes: AppRoutes[]): RouteObject[] {
	return appRoutes.flatMap(({ path, component, nested, key }) =>
		(Array.isArray(path) ? path : [path]).map((pattern) => ({
			path: nested ? `${pattern}/*` : pattern,
			element: <RouteGate key={key} routeKey={key} component={component} />,
		})),
	);
}

const gatedRoutes = createGatedRoutes([
	...routes,
	LIST_LICENSES,
	SUPPORT_ROUTE,
]);

/** `root` is the layout every route renders in; it has to render an `<Outlet>`. */
export function createRouteTable(root: ReactNode): RouteObject[] {
	return [
		{
			element: root,
			// An error above `Sentry.ErrorBoundary` in the root layout crashes the
			// root and reaches Sentry, as it did before the data router.
			errorElement: <RethrowRouteError />,
			children: [
				...gatedRoutes,
				{ path: '/', element: <Home /> },
				{ path: '*', element: <NotFound /> },
			],
		},
	];
}
