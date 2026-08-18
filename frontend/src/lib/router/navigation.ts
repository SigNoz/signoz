import history from 'lib/history';

import type {
	AppLocation,
	NavigateOptions,
	NavigationAction,
	NavigationBlocker,
	To,
} from './types';
import { applyNavigate, retryTransition, toAppLocation } from './utils';

/**
 * Module-level imperative navigation — the escape hatch for code outside a
 * component. Unlike `useSafeNavigate` it does not suppress same-URL navigation
 * and has no new-tab branch, because it cannot see the current render.
 *
 * The basename contract, stable across the migration: callers pass and receive
 * basename-free app paths. history@4 implements that itself today; at the
 * version flip the basename moves onto the router, which does not cover this
 * module, so `navigate`/`getCurrentLocation` take it over then.
 */
export function navigate(to: To, options?: NavigateOptions): void {
	applyNavigate(history, to, options);
}

export function back(): void {
	history.goBack();
}

export function getCurrentLocation(): AppLocation {
	return toAppLocation(history.location);
}

export function subscribe(
	listener: (update: {
		location: AppLocation;
		action: NavigationAction;
	}) => void,
): () => void {
	return history.listen((location, action) => {
		listener({
			location: toAppLocation(location),
			action: action as NavigationAction,
		});
	});
}

export function blockNavigation(blocker: NavigationBlocker): () => void {
	return history.block((location, action) => {
		const appLocation = toAppLocation(location);
		const navigationAction = action as NavigationAction;

		blocker({
			location: appLocation,
			action: navigationAction,
			retry: () => retryTransition(history, appLocation, navigationAction),
		});

		// history@4 cancels the transition on `false`; history@5 cancels whenever a
		// blocker is registered and hands control to `retry()`. Returning `false`
		// makes the v4 path behave like the v5 one.
		return false;
	});
}

export { hasInAppHistory } from 'lib/history';
