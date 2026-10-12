// eslint-disable-next-line no-restricted-imports
import type { Store } from 'redux';

import { createStorybookStore } from '../providers/createStorybookStore';

/**
 * Replaces the app's redux singleton (`store`) in Storybook (aliased in
 * `.storybook/main.ts`).
 *
 * A story gets its own store so nothing leaks between stories, but a dozen
 * modules read `store.getState()` straight off the singleton rather than through
 * the provider: `lib/getStartEndRangeTime` is how every query decides the range
 * it asks for. Left alone, those modules answer from a store no story ever
 * seeded, so the time picker and the data would disagree. This forwards to
 * whichever store the current story mounted.
 *
 * The annotation checks the module's shape against the real one, so an export
 * added to `store` fails to compile here rather than at render.
 */
let current: Store = createStorybookStore();

export const setStoryStore = (store: Store): void => {
	current = store;
};

const storyStore: Store = new Proxy({} as Store, {
	get(_target, prop, receiver) {
		return Reflect.get(current, prop, receiver);
	},
});

const storeModule: typeof import('store') = { default: storyStore };

export default storeModule.default;
