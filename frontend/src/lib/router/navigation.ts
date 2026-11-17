import type { DataRouter } from 'react-router';
import { stripBasePath } from 'utils/basePath';

import type {
	AppLocation,
	NavigateOptions,
	NavigationAction,
	To,
} from './types';
import { toAppLocation } from './utils';

/**
 * Imperative navigation, usable from any code. `useAppNavigate` navigates on
 * the nearest router instead. Unlike `useSafeNavigate` it does not suppress
 * same-URL navigation and has no new-tab branch, because it cannot see the
 * current render.
 *
 * It drives the data router attached last: the app's, or the one a test or a
 * story mounts. Callers pass and receive basename-free app paths. The router
 * prepends the base path on write, and its `state.location` is the full browser
 * path, so reads strip it here.
 *
 * A navigation commits synchronously only while no matched route has a loader;
 * once one does, `router.navigate` settles after the loader.
 */
type Listener = (update: {
	location: AppLocation;
	action: NavigationAction;
}) => void;

const attached: DataRouter[] = [];
const listeners = new Set<Listener>();
let inAppPushCount = 0;

function activeRouter(): DataRouter {
	const router = attached[attached.length - 1];
	if (!router) {
		throw new Error(
			'lib/router/navigation: no router is attached. Mount the app router, a TestRouter or a story first.',
		);
	}
	return router;
}

function toAppPath<S>(location: AppLocation<S>): AppLocation<S> {
	return { ...location, pathname: stripBasePath(location.pathname) };
}

/**
 * Makes `router` the one this module drives until the returned detach runs.
 * Attachments stack, so detaching a router a test mounted hands control back
 * to the one below it.
 */
export function attachRouter(router: DataRouter): () => void {
	attached.push(router);

	let { location } = router.state;
	const unsubscribe = router.subscribe((state) => {
		// The router also publishes navigation, fetcher and blocker state; only a
		// committed location is a navigation.
		if (state.location === location) {
			return;
		}
		location = state.location;

		if (attached[attached.length - 1] !== router) {
			return;
		}
		if (state.historyAction === 'PUSH') {
			inAppPushCount += 1;
		}

		const update = {
			location: toAppPath(toAppLocation(state.location)),
			action: state.historyAction as NavigationAction,
		};
		listeners.forEach((listener) => listener(update));
	});

	return (): void => {
		unsubscribe();
		const index = attached.lastIndexOf(router);
		if (index !== -1) {
			attached.splice(index, 1);
		}
	};
}

export function navigate(to: To, options?: NavigateOptions): void {
	void activeRouter().navigate(to, {
		replace: options?.replace,
		state: options?.state,
	});
}

export function back(): void {
	void activeRouter().navigate(-1);
}

export function getCurrentLocation(): AppLocation {
	return toAppPath(toAppLocation(activeRouter().state.location));
}

export function subscribe(listener: Listener): () => void {
	// Wrapped so that subscribing the same function twice yields two
	// subscriptions, as `history.listen` did.
	const entry: Listener = (update) => listener(update);
	listeners.add(entry);
	return (): void => {
		listeners.delete(entry);
	};
}

export const hasInAppHistory = (): boolean => inAppPushCount > 0;
