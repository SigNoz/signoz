import type {
	AppLocation,
	NavigableHistory,
	NavigateOptions,
	To,
} from './types';

export function toAppLocation<S = unknown>(
	location: AppLocation<unknown>,
): AppLocation<S> {
	return {
		pathname: location.pathname,
		search: location.search,
		hash: location.hash,
		state: location.state as S,
		key: location.key,
	};
}

/**
 * history@5 takes `state` as its own argument for both the string and the
 * object target form — a `state` key inside the target object is overwritten
 * with `null` by `getNextLocation`, so it cannot be smuggled in there.
 *
 * `state` is omitted rather than passed as `undefined`, so a stateless
 * `navigate(path)` reaches the history as the bare `push(path)` the call sites
 * used before the facade — which is what the suites that mock `lib/history`
 * assert on.
 */
export function applyNavigate(
	history: NavigableHistory,
	to: To,
	options?: NavigateOptions,
): void {
	const { replace = false, state } = options ?? {};

	const args: Parameters<NavigableHistory['push']> =
		state === undefined ? [to] : [to, state];

	if (replace) {
		history.replace(...args);
	} else {
		history.push(...args);
	}
}
