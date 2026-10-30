import { createMemoryRouter, type DataRouter, parsePath } from 'react-router';
import { hostRoutes } from 'lib/router/HostRouter';
import { fn } from 'storybook/test';

import { recordBlockedNavigation } from './blockedNavigationStore';
import { navigateWithinPage, setStoryRouter, toHref } from './pageScope';

type Navigate = DataRouter['navigate'];

/**
 * Every navigation the app makes reaches `router.navigate`: `useNavigate`,
 * `<Link>`, `useSearchParams` and `lib/router/navigation` all call it. One that
 * stays on the page goes through `pageScope`; whatever would leave the page is
 * swallowed and reported to `blockedNavigationStore`.
 */
const guardedNavigate = fn(((to, options) => {
	if (typeof to === 'number') {
		recordBlockedNavigation('go', `go(${to})`);
		return Promise.resolve();
	}

	const target = typeof to === 'string' ? parsePath(to) : (to ?? {});
	const replace = options?.replace ?? false;

	if (!navigateWithinPage(target, { replace, state: options?.state })) {
		recordBlockedNavigation(replace ? 'replace' : 'push', toHref(target));
	}
	return Promise.resolve();
}) as Navigate).mockName('router.navigate');

/** A router for one story, placed at its route before anything renders. */
export const createStoryRouter = (
	route: string,
	routeState?: unknown,
): DataRouter => {
	const router = createMemoryRouter(hostRoutes, {
		initialEntries: [{ ...parsePath(route), state: routeState }],
	});
	setStoryRouter(router);
	router.navigate = guardedNavigate as Navigate;
	return router;
};

export const resetStoryHistory = (): void => {
	guardedNavigate.mockClear();
};
