import {
	Toaster as UiToaster,
	toast as uiToast,
	type SonnerToasterProps,
	// eslint-disable-next-line signoz/no-signozhq-ui-barrel
} from '@signozhq/ui';

import { areToastsPersisted, toastDuration } from './toastsPersisted';

/**
 * Replaces `@signozhq/ui/sonner` in Storybook (aliased in `.storybook/main.ts`)
 * so the Toasts control can keep every toast the story fires on screen. The real
 * components come from the package root for the reason `tooltip.mock.tsx` gives.
 */
const PersistentToaster = ({
	toastOptions,
	...props
}: SonnerToasterProps): JSX.Element => (
	<UiToaster
		{...props}
		toastOptions={{ duration: toastDuration(), ...toastOptions }}
	/>
);

/**
 * Calls pass their options second, `toast.promise` and `toast.custom` included.
 * A `duration` the call set itself (`CustomDomainSettings` asks for 5s) would
 * outlive the control otherwise, so the control wins while it is on.
 */
const withPersistedOptions = (args: unknown[]): unknown[] => {
	if (!areToastsPersisted()) {
		return args;
	}

	const [first, options, ...rest] = args;

	return [first, { ...(options as object), duration: Infinity }, ...rest];
};

const persistentToast = new Proxy(uiToast, {
	apply: (target, thisArg, args): unknown =>
		Reflect.apply(target, thisArg, withPersistedOptions(args)),
	get: (target, property, receiver): unknown => {
		const value = Reflect.get(target, property, receiver);

		if (
			typeof value !== 'function' ||
			property === 'dismiss' ||
			property === 'getHistory' ||
			property === 'getToasts'
		) {
			return value;
		}

		return (...args: unknown[]): unknown =>
			value.apply(target, withPersistedOptions(args));
	},
});

const sonnerModule: typeof import('@signozhq/ui/sonner') = {
	Toaster: PersistentToaster,
	toast: persistentToast,
};

export const { Toaster, toast } = sonnerModule;

export type {
	SonnerToasterProps,
	ToasterProps,
	// eslint-disable-next-line signoz/no-signozhq-ui-barrel
} from '@signozhq/ui';
