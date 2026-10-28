// eslint-disable-next-line no-restricted-imports
import { createContext, type ReactNode, useContext } from 'react';
import {
	type DataRouter,
	type RouteObject,
	RouterProvider,
} from 'react-router';

import { RethrowRouteError } from './RethrowRouteError';

const HostedTree = createContext<ReactNode>(null);

function HostedTreeOutlet(): JSX.Element {
	return <>{useContext(HostedTree)}</>;
}

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

interface HostRouterProps {
	router: DataRouter;
	children: ReactNode;
}

/**
 * A data router's routes are fixed when it is created, so the tree reaches the
 * route element through context instead, and a re-render with new children
 * shows them.
 */
export function HostRouter({ router, children }: HostRouterProps): JSX.Element {
	return (
		<HostedTree.Provider value={children}>
			<RouterProvider router={router} useTransitions={false} />
		</HostedTree.Provider>
	);
}
