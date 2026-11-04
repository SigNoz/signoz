import type { RouteObject } from 'react-router';

import { HostedTreeOutlet } from './HostedTreeOutlet';
import { RethrowRouteError } from './RethrowRouteError';

/**
 * The route table for the test and story mounts: the tree `HostRouter` was last
 * rendered with, at any URL, or only at `patterns` so it can read their params
 * the way a page does. Render errors propagate out of the router.
 */
export function createHostRoutes(patterns?: string[]): RouteObject[] {
	const children: RouteObject[] = patterns
		? [
				...patterns.map((path) => ({ path, element: <HostedTreeOutlet /> })),
				{ path: '*', element: null },
			]
		: [{ path: '*', element: <HostedTreeOutlet /> }];

	return [{ errorElement: <RethrowRouteError />, children }];
}

export const hostRoutes: RouteObject[] = createHostRoutes();
