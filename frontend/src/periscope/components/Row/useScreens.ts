import { useEffect, useReducer } from 'react';

import type { Screens } from './types';
import { ALL_SCREENS, BREAKPOINTS, readScreens, SCREEN_QUERIES } from './utils';

/**
 * Which antd breakpoints match the viewport. Disabled, it reports every
 * breakpoint as matching without touching `matchMedia`.
 */
export default function useScreens(enabled: boolean): Screens {
	const [, rerender] = useReducer((count: number) => count + 1, 0);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		// `addListener` rather than `addEventListener`: the jest matchMedia stub,
		// like older Safari, only has the former.
		const lists = BREAKPOINTS.map((bp) => window.matchMedia(SCREEN_QUERIES[bp]));
		lists.forEach((list) => list.addListener(rerender));
		return (): void => lists.forEach((list) => list.removeListener(rerender));
	}, [enabled]);

	return enabled ? readScreens() : ALL_SCREENS;
}
