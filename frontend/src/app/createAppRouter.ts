import type { ReactNode } from 'react';
import { createBrowserRouter, type DataRouter } from 'react-router';
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
