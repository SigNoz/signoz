import type { NavigateFunction, NavigateOptions, To } from 'react-router';

const navigate = (
	eventName: 'SAFE_NAVIGATE' | 'UNSAFE_NAVIGATE',
	to: To | number,
	options?: NavigateOptions,
): void => {
	if (window !== undefined) {
		window.dispatchEvent(
			new CustomEvent(eventName, {
				detail: {
					to,
					options,
				},
				bubbles: false,
				cancelable: false,
			}),
		);
	} else {
		throw new Error('Failed navigation from non-component: window is undefined');
	}
};

/*
    Use case:
        1. Navigate from outside a component
        2. Inside useEffect, useCallbacks or useMemo to avoid rerendering
    TODO: Smit need a better name for this
*/
export const safeNavigateNoSameURLMemo: NavigateFunction = (
	to: To | number,
	options?: NavigateOptions,
) => {
	navigate('SAFE_NAVIGATE', to, options);
};

export const unsafeNavigateSameURLMemo: NavigateFunction = (
	to: To | number,
	options?: NavigateOptions,
) => {
	navigate('UNSAFE_NAVIGATE', to, options);
};
