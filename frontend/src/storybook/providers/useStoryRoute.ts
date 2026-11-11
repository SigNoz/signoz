import { useMemo } from 'react';
import { parsePath } from 'history';

import { setStoryLocation } from '../navigation/pageScope';

/**
 * Places the story's history at its route before the router mounts and hands
 * back the search params for the nuqs testing adapter.
 */
export const useStoryRoute = (
	route: string,
	routeState?: unknown,
): URLSearchParams =>
	useMemo(() => {
		setStoryLocation({ ...parsePath(route), state: routeState });
		const [, search = ''] = route.split('?');
		return new URLSearchParams(search);
	}, [route, routeState]);
