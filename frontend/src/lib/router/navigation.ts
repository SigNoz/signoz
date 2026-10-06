import history from 'lib/history';
import { stripBasePath, withBasePath } from 'utils/basePath';

import type {
	AppLocation,
	NavigateOptions,
	NavigationAction,
	NavigationBlocker,
	To,
} from './types';
import { applyNavigate, toAppLocation } from './utils';

/**
 * Imperative navigation on the app's history singleton, usable from any code.
 * `useAppNavigate` navigates on the nearest router instead. Unlike
 * `useSafeNavigate` it does not suppress same-URL navigation and has no new-tab
 * branch, because it cannot see the current render.
 *
 * This module owns the base path. history@5 has no `basename` option, so the
 * router carries it for component navigation and never sees what goes through
 * here: callers pass and receive basename-free app paths, and the prepend on
 * write and the strip on read happen below.
 */
function toBrowserTarget(to: To): To {
	if (typeof to === 'string') {
		return withBasePath(to);
	}
	return to.pathname === undefined
		? to
		: { ...to, pathname: withBasePath(to.pathname) };
}

function toAppPath<S>(location: AppLocation<S>): AppLocation<S> {
	return { ...location, pathname: stripBasePath(location.pathname) };
}

export function navigate(to: To, options?: NavigateOptions): void {
	applyNavigate(history, toBrowserTarget(to), options);
}

export function back(): void {
	history.go(-1);
}

export function getCurrentLocation(): AppLocation {
	return toAppPath(toAppLocation(history.location));
}

export function subscribe(
	listener: (update: {
		location: AppLocation;
		action: NavigationAction;
	}) => void,
): () => void {
	return history.listen(({ location, action }) => {
		listener({
			location: toAppPath(toAppLocation(location)),
			action: action as NavigationAction,
		});
	});
}

export function blockNavigation(blocker: NavigationBlocker): () => void {
	let stopWaiting: (() => void) | null = null;
	let unblock = register();

	function register(): () => void {
		return history.block(({ location, action, retry }) => {
			let deciding = true;
			let allowed = false;

			blocker({
				location: toAppPath(toAppLocation(location)),
				action: action as NavigationAction,
				retry: () => {
					if (deciding) {
						allowed = true;
						return;
					}
					retry();
				},
			});
			deciding = false;

			if (!allowed) {
				return;
			}
			// history@5 cancels every transition while a blocker is registered, so
			// letting one through means retrying it unblocked. A retried POP lands
			// on a later popstate, so the blocker comes back once the transition
			// has, not straight after `retry()`.
			unblock();
			stopWaiting = history.listen(() => {
				stopWaiting?.();
				stopWaiting = null;
				unblock = register();
			});
			retry();
		});
	}

	return (): void => {
		stopWaiting?.();
		stopWaiting = null;
		unblock();
	};
}

export { hasInAppHistory } from 'lib/history';
