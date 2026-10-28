import { useEffect, useMemo, useRef, useState } from 'react';
import { attachRouter } from 'lib/router/navigation';

import { createStoryRouter } from '../navigation/containment';
import { setStoryLocation } from '../navigation/pageScope';

type StoryRouter = ReturnType<typeof createStoryRouter>;

/**
 * Creates the story's router at its route, so the page's first render already
 * reads it, and attaches it to `lib/router/navigation`. A later route (a control
 * that changes it) moves the same router. Also hands back the search params for
 * the nuqs testing adapter.
 */
export const useStoryRoute = (
	route: string,
	routeState?: unknown,
): { router: StoryRouter; searchParams: URLSearchParams } => {
	// Attached while rendering: children run their effects first, and one that
	// navigates must reach this router.
	const [mounted] = useState(() => {
		const router = createStoryRouter(route, routeState);
		return { router, detach: attachRouter(router) };
	});

	useEffect(
		() => (): void => {
			mounted.detach();
			mounted.router.dispose();
		},
		[mounted],
	);

	const placed = useRef({ route, routeState });
	useEffect(() => {
		if (
			placed.current.route !== route ||
			placed.current.routeState !== routeState
		) {
			placed.current = { route, routeState };
			setStoryLocation(route, routeState);
		}
	}, [route, routeState]);

	const searchParams = useMemo(() => {
		const [, search = ''] = route.split('?');
		return new URLSearchParams(search);
	}, [route]);

	return { router: mounted.router, searchParams };
};
