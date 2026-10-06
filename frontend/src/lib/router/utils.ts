import type { History, Location, LocationDescriptor } from 'history';
import { parsePath } from 'history';

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
 * v5 carries state inside `to`. The string form is parsed first, or search and
 * hash would land in `pathname`. Pass `currentLocation` where the target
 * renders an href, so a search-only or hash-only string keeps the current
 * pathname as it does without state; `history.push` resolves it on its own.
 * Not `createLocation`: its `decodeURI` runs again when the link is followed.
 */
export function withState(
	to: To,
	state: unknown,
	currentLocation?: AppLocation,
): LocationDescriptor {
	if (state === undefined) {
		return to;
	}
	if (typeof to === 'string') {
		const parsed = parsePath(to);
		return {
			...parsed,
			pathname: parsed.pathname || currentLocation?.pathname || '',
			state,
		};
	}
	return { ...to, state };
}

/**
 * `state` always travels as the second argument, which history@4 and history@5
 * both honour for string and object targets. It is omitted rather than passed
 * as `undefined`, so a stateless `navigate(path)` reaches the history as the
 * bare `push(path)` the call sites used before the facade.
 */
export function applyNavigate(
	history: History,
	to: To,
	options?: NavigateOptions,
): void {
	const { replace = false, state } = options ?? {};

	const args: Parameters<History['push']> =
		state === undefined ? [to] : [to, state];

	if (replace) {
		history.replace(...args);
	} else {
		history.push(...args);
	}
}

/**
 * Replays a transition that a blocker cancelled. history@4 discards the
 * transition on cancel, so it has to be re-issued from the location it carried.
 * `popDelta` walks the browser from where history@4 reverted the blocked POP
 * back to its target. It is `null` when history@4 did not revert, so the
 * browser is already on the target and only the router has to catch up.
 */
export function retryTransition(
	history: History,
	location: AppLocation,
	action: NavigationAction,
	popDelta: number | null,
): void {
	if (action === 'POP') {
		if (popDelta === null) {
			history.replace(location);
		} else if (popDelta !== 0) {
			history.go(popDelta);
		}
		return;
	}
	if (action === 'REPLACE') {
		history.replace(location);
		return;
	}
	history.push(location);
}
