import { ReactNode } from 'react';
import {
	createBrowserRouter,
	type DataRouter,
	RouterProvider,
} from 'react-router';
import { createRouteTable } from 'AppRoutes/routeTable';
import { attachRouter } from 'lib/router/navigation';
import { getBasePath } from 'utils/basePath';

/**
 * Creates the app's data router and attaches it to `lib/router/navigation`, so
 * code outside a component navigates through it. `root` is the layout route:
 * every provider the pages need, `nuqs/adapters/react-router/v7` included,
 * renders inside it, because a data router owns everything below it.
 */
export function createAppRouter(root: ReactNode): DataRouter {
	const router = createBrowserRouter(createRouteTable(root), {
		basename: getBasePath(),
	});
	attachRouter(router);
	return router;
}

interface AppRouterProviderProps {
	router: DataRouter;
}

/**
 * Transitions are off on purpose: under one React keeps the previous screen up
 * instead of committing the Suspense fallback, so a route whose chunk is not
 * cached yet renders no loader at all. Pending UI under transitions needs
 * route `lazy` and `useNavigation()`.
 */
export function AppRouterProvider({
	router,
}: AppRouterProviderProps): JSX.Element {
	return <RouterProvider router={router} useTransitions={false} />;
}
