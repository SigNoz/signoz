import type { ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import NotFound from 'components/NotFound';
import { RethrowRouteError } from 'lib/router/RethrowRouteError';

import { Home } from './pageComponents';
import { RouteGate } from './RouteGate';
import routes, { LIST_LICENSES, SUPPORT_ROUTE } from './routes';

const gatedRoutes: RouteObject[] = [
	...routes,
	LIST_LICENSES,
	SUPPORT_ROUTE,
].flatMap(({ path, component, nested, key }) =>
	(Array.isArray(path) ? path : [path]).map((pattern) => ({
		path: nested ? `${pattern}/*` : pattern,
		element: <RouteGate routeKey={key} component={component} />,
	})),
);

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
