import type { NavigateOptions, To } from 'react-router-dom-v5-compat';

/*
    Use case:
        1. Navigate from outside a component
        2. Inside useEffect without adding to deps
    TODO: Smit need a better name for this
*/
export const safeNavigateNonComponentMemo = (
	to: To | number,
	options?: NavigateOptions,
): void => {
	if (window) {
		window.dispatchEvent(
			new CustomEvent('NAVIGATE', {
				detail: {
					to,
					options,
				},
			}),
		);
	} else {
		throw new Error('Failed navigation from non-compnent: window is undefined');
	}
};
