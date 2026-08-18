import history from 'lib/history';

import type {
	AppLocation,
	NavigateOptions,
	NavigationAction,
	NavigationBlocker,
	To,
} from './types';
import { applyNavigate, retryTransition, toAppLocation } from './utils';

let entryKeys: Array<string | undefined> = [history.location.key];
let currentKey = history.location.key;

// history@4 reports a blocked POP's target but not how far away it is, and the
// POP is already reverted by the time `retry` runs. Mirroring its entry keys
// gives the distance back. Like history@4, an entry it never saw (one from
// before a reload) counts as the first one, so a POP whose ends both land on
// index 0 is not reverted.
history.listen((location, action) => {
	const index = entryKeys.indexOf(currentKey);
	currentKey = location.key;
	if (action === 'PUSH') {
		entryKeys = [...entryKeys.slice(0, index + 1), location.key];
	} else if (action === 'REPLACE' && index !== -1) {
		entryKeys[index] = location.key;
	}
});

function entryIndex(key: string | undefined): number {
	return Math.max(0, entryKeys.indexOf(key));
}

/**
 * Imperative navigation on the app's history singleton, usable from any code.
 * `useAppNavigate` navigates on the nearest router instead. Unlike
 * `useSafeNavigate` it does not suppress same-URL navigation and has no new-tab
 * branch, because it cannot see the current render.
 *
 * Callers pass and receive basename-free app paths.
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

export function blockNavigation(blocker: NavigationBlocker): () => void {
	return history.block((location, action) => {
		const appLocation = toAppLocation(location);
		const navigationAction = action as NavigationAction;
		const delta = entryIndex(location.key) - entryIndex(currentKey);
		const popDelta = delta === 0 ? null : delta;
		let deciding = true;
		let allowed = false;

		blocker({
			location: appLocation,
			action: navigationAction,
			retry: () => {
				if (deciding) {
					allowed = true;
					return;
				}
				retryTransition(history, appLocation, navigationAction, popDelta);
			},
		});
		deciding = false;

		// history@4 cancels the transition when the prompt returns `false`;
		// history@5 cancels whenever a blocker is registered and hands control to
		// `retry()`. A `retry()` inside the blocker means "let it through", and
		// history@4 does that by not cancelling: re-issuing a POP would walk the
		// stack twice.
		return allowed ? undefined : false;
	});
}

export { hasInAppHistory } from 'lib/history';
