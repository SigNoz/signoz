import {
	History,
	LocationDescriptor,
	LocationDescriptorObject,
	parsePath,
} from 'history';
import { fn, type Mock } from 'storybook/test';

import { recordBlockedNavigation } from './blockedNavigationStore';
import { navigateWithinPage, storyHistory, toHref } from './pageScope';

const guardedNavigate = (
	via: 'push' | 'replace',
): Mock<(to: LocationDescriptor, state?: unknown) => void> =>
	fn((to: LocationDescriptor, state?: unknown): void => {
		const target: LocationDescriptorObject =
			typeof to === 'string' ? { ...parsePath(to), state } : { state, ...to };

		if (navigateWithinPage(target, { replace: via === 'replace' })) {
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
	goBack: blockedRelativeNavigate('goBack'),
	goForward: blockedRelativeNavigate('goForward'),
} as const;

type OverriddenMethod = keyof typeof overriddenMethods;

const isOverriddenMethod = (prop: string | symbol): prop is OverriddenMethod =>
	typeof prop === 'string' && prop in overriddenMethods;

/**
 * What the app sees in place of `lib/history`. Reads (`location`, `action`,
 * `listen`) are proxied to the story's memory history so react-router renders
 * normally; navigation goes through `pageScope`, and whatever would leave the
 * page is swallowed and reported to `blockedNavigationStore`.
 * `react-router-dom-v5-compat` drives its `useNavigate` through this same
 * object, so `useSafeNavigate` is covered too.
 */
export const containedHistory: History = new Proxy(storyHistory, {
	get(target, prop, receiver) {
		if (isOverriddenMethod(prop)) {
			return overriddenMethods[prop];
		}
		return Reflect.get(target, prop, receiver);
	},
});

export const hasInAppHistory = (): boolean => false;

export const resetStoryHistory = (): void => {
	Object.values(overriddenMethods).forEach((method) => method.mockClear());
};
