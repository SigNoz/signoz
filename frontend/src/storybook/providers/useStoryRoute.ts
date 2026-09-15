import { useMemo } from 'react';

import { setStoryLocation } from '../navigation/pageScope';

/**
 * Places the story's history at its route before the router mounts and hands
 * back the search params for the nuqs testing adapter.
 */
export const useStoryRoute = (route: string): URLSearchParams =>
	useMemo(() => {
		setStoryLocation(route);
		const [, search = ''] = route.split('?');
		return new URLSearchParams(search);
	}, [route]);
