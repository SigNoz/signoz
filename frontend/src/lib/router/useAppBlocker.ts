import { useCallback } from 'react';
import {
	type BlockerFunction as RouterBlockerFunction,
	useBlocker,
} from 'react-router';
import { stripBasePath } from 'utils/basePath';

import type {
	AppBlocker,
	AppLocation,
	BlockerFunction,
	NavigationAction,
} from './types';
import { toAppLocation } from './utils';

function toAppPath(location: AppLocation): AppLocation {
	return {
		...toAppLocation(location),
		pathname: stripBasePath(location.pathname),
	};
}

/**
 * Holds in-app navigations while `shouldBlock` returns true: links, `navigate`
 * calls and the browser's back and forward buttons. A page unload is not an
 * in-app navigation and needs its own `beforeunload` handler.
 *
 * The blocker registers in an effect, so it does not cover a navigation made
 * during the render that mounts it. A router honours one blocker at a time.
 */
export function useAppBlocker(shouldBlock: BlockerFunction): AppBlocker {
	// The router strips the base path from these before calling in.
	const blockerFunction = useCallback<RouterBlockerFunction>(
		({ currentLocation, nextLocation, historyAction }) =>
			shouldBlock({
				currentLocation: toAppLocation(currentLocation),
				nextLocation: toAppLocation(nextLocation),
				action: historyAction as NavigationAction,
			}),
		[shouldBlock],
	);

	const blocker = useBlocker(blockerFunction);

	switch (blocker.state) {
		case 'blocked':
			return {
				state: 'blocked',
				location: toAppPath(blocker.location),
				proceed: blocker.proceed,
				reset: blocker.reset,
			};
		case 'proceeding':
			return { state: 'proceeding', location: toAppPath(blocker.location) };
		default:
			return { state: 'unblocked', location: undefined };
	}
}
