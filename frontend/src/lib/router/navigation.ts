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
 * Module-level imperative navigation — the escape hatch for code outside a
 * component. Unlike `useSafeNavigate` it does not suppress same-URL navigation
 * and has no new-tab branch, because it cannot see the current render.
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
	return history.block(({ location, action, retry }) => {
		blocker({
			location: toAppPath(toAppLocation(location)),
			action: action as NavigationAction,
			retry,
		});
	});
}

export { hasInAppHistory } from 'lib/history';
