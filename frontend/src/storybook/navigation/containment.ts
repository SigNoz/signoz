import { createPath, parsePath, type Path, type To } from 'history';
import { fn, type Mock } from 'storybook/test';

import { recordBlockedNavigation } from './blockedNavigationStore';
import { navigateWithinPage, storyHistory, toHref } from './pageScope';

const guardedNavigate = (
	via: 'push' | 'replace',
): Mock<(to: To, state?: unknown) => void> =>
	fn((to: To, state?: unknown): void => {
		const target: Partial<Path> = typeof to === 'string' ? parsePath(to) : to;

		if (navigateWithinPage(target, { replace: via === 'replace', state })) {
			return;
		}

		recordBlockedNavigation(via, toHref(to));
	}).mockName(`history.${via}`);

const blockedRelativeNavigate = (via: string): Mock<(delta?: number) => void> =>
	fn((delta?: number): void => {
		recordBlockedNavigation(via, delta === undefined ? via : `${via}(${delta})`);
	}).mockName(`history.${via}`);

const overriddenMethods = {
	push: guardedNavigate('push'),
	replace: guardedNavigate('replace'),
	go: blockedRelativeNavigate('go'),
	back: blockedRelativeNavigate('back'),
	forward: blockedRelativeNavigate('forward'),
} as const;

type OverriddenMethod = keyof typeof overriddenMethods;

const isOverriddenMethod = (prop: string | symbol): prop is OverriddenMethod =>
	typeof prop === 'string' && prop in overriddenMethods;

/**
 * What the app sees in place of `lib/history`. Reads (`location`, `action`,
 * `listen`) are proxied to the story's memory history so react-router renders
 * normally; navigation goes through `pageScope`, and whatever would leave the
 * page is swallowed and reported to `blockedNavigationStore`.
 * react-router drives its `useNavigate` through this same
 * object, so `useSafeNavigate` is covered too.
 */
const createURL = (to: To): URL =>
	new URL(
		typeof to === 'string' ? to : createPath(to),
		// oxlint-disable-next-line signoz/no-raw-absolute-path
		window.location.origin,
	);

// The two members v6 expects of the history it is handed, added the way
// `lib/history` adds them to the browser history.
const storyHistoryForRouter = Object.assign(storyHistory, {
	createURL,
	encodeLocation(to: To): Path {
		const url = createURL(to);
		return { pathname: url.pathname, search: url.search, hash: url.hash };
	},
});

export const containedHistory: typeof import('lib/history').default = new Proxy(
	storyHistoryForRouter,
	{
		get(target, prop, receiver) {
			if (isOverriddenMethod(prop)) {
				return overriddenMethods[prop];
			}
			return Reflect.get(target, prop, receiver);
		},
	},
) as unknown as typeof import('lib/history').default;

export const hasInAppHistory = (): boolean => false;

export const resetStoryHistory = (): void => {
	Object.values(overriddenMethods).forEach((method) => method.mockClear());
};
