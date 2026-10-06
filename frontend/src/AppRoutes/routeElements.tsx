import { Route } from 'react-router';

import type { AppRoutes } from './routes';

/**
 * The page is keyed by its route entry. `<Routes>` renders the match unkeyed, so
 * two lazy pages that resolve to the same component would otherwise reuse the
 * previous route's instance. The patterns of one entry share the key.
 */
export function routeElements(routes: AppRoutes[]): JSX.Element[] {
	return routes.flatMap(({ path, component: Component, nested, key }) =>
		(Array.isArray(path) ? path : [path]).map((pattern) => (
			<Route
				key={pattern}
				path={nested ? `${pattern}/*` : pattern}
				element={<Component key={key} />}
			/>
		)),
	);
}
