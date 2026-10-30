import { createBrowserRouter, type DataRouter } from 'react-router';
import { createHostRoutes } from 'lib/router/HostRouter';
import { attachRouter } from 'lib/router/navigation';
import { getBasePath, withBasePath } from 'utils/basePath';

interface AttachedTestRouter {
	router: DataRouter;
	/** Detaches the router and disposes it. */
	release: () => void;
}

/**
 * A browser data router over jsdom's `window.history`, attached to
 * `lib/router/navigation`. `TestRouter` mounts one; a test of code that
 * navigates without rendering can use one directly. With `routePatterns` the
 * tree renders only at those patterns and reads their params.
 */
export function attachTestRouter(
	initialRoute?: string,
	routePatterns?: string[],
): AttachedTestRouter {
	if (initialRoute) {
		window.history.replaceState(null, '', withBasePath(initialRoute));
	}
	const router = createBrowserRouter(createHostRoutes(routePatterns), {
		basename: getBasePath(),
	});
	const detach = attachRouter(router);
	return {
		router,
		release: (): void => {
			detach();
			router.dispose();
		},
	};
}

/** Returns the browser URL to the state a suite should start each test in. */
export function resetTestRoute(): void {
	window.history.replaceState(null, '', withBasePath('/'));
}
