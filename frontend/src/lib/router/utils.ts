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
 */
export function applyNavigate(
	history: History,
	to: To,
	options?: NavigateOptions,
): void {
	if (typeof to === 'string') {
		if (options?.replace) {
			history.replace(to, options.state);
		} else {
			history.push(to, options?.state);
		}
		return;
	}

	const target = { ...to, state: options?.state };
	if (options?.replace) {
		history.replace(target);
	} else {
		history.push(target);
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
