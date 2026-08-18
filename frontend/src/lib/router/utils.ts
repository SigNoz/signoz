import type { History, Location } from 'history';

import type {
	AppLocation,
	NavigateOptions,
	NavigationAction,
	To,
} from './types';

export function toAppLocation<S = unknown>(
	location: Location<S>,
): AppLocation<S> {
	return {
		pathname: location.pathname,
		search: location.search,
		hash: location.hash,
		state: location.state,
		key: location.key,
	};
}

/**
 * history@4 and history@5 both accept `(path, state)` or a partial-path object,
 * so this dispatch survives the Phase D bump unchanged.
 *
 * `state` is omitted rather than passed as `undefined`, so a stateless
 * `navigate(path)` reaches the history as the bare `push(path)` the call sites
 * used before the facade.
 */
export function applyNavigate(
	history: History,
	to: To,
	options?: NavigateOptions,
): void {
	const { replace = false, state } = options ?? {};

	let args: Parameters<History['push']>;
	if (typeof to === 'string') {
		args = state === undefined ? [to] : [to, state];
	} else {
		args = [state === undefined ? to : { ...to, state }];
	}

	if (replace) {
		history.replace(...args);
	} else {
		history.push(...args);
	}
}

/**
 * Replays a transition that a blocker cancelled. history@4 discards the
 * transition on cancel, so it has to be re-issued from the location it carried.
 */
export function retryTransition(
	history: History,
	location: AppLocation,
	action: NavigationAction,
): void {
	if (action === 'POP') {
		history.goBack();
		return;
	}
	if (action === 'REPLACE') {
		history.replace(location);
		return;
	}
	history.push(location);
}
