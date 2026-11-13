import {
	Toaster as UiToaster,
	toast,
	type ToasterProps,
	// eslint-disable-next-line signoz/no-signozhq-ui-barrel
} from '@signozhq/ui';
import { PersistToastsProvider } from '@signozhq/ui/testing';
import { forwardRef } from 'react';

import { areToastsPersisted } from './toastsPersisted';

/**
 * Replaces `@signozhq/ui/toast` in Storybook (aliased in `.storybook/main.ts`)
 * so the Toasts control can keep every toast a story fires on screen at once.
 *
 * The real components are imported from the package root for the reason
 * `tooltip.mock.tsx` gives: the alias would otherwise resolve back to here.
 *
 * `PersistToastsProvider` holds the stack open while the control is on, so no
 * timer closes a toast and the stack shows every one whatever the `limit`.
 */
const PersistentToaster = forwardRef<HTMLDivElement, ToasterProps>(
	(props, ref) => {
		const toaster = <UiToaster {...props} ref={ref} />;
		if (!areToastsPersisted()) {
			return toaster;
		}
		return <PersistToastsProvider>{toaster}</PersistToastsProvider>;
	},
);

PersistentToaster.displayName = 'Toaster';

/**
 * The annotation checks the module's shape against the real one, so an export
 * added to the toast module fails to compile here rather than at render.
 */
const toastModule: Pick<
	typeof import('@signozhq/ui/toast'),
	'Toaster' | 'toast'
> = {
	Toaster: PersistentToaster,
	toast,
};

export const { Toaster, toast: mockedToast } = toastModule;
export { mockedToast as toast };

export type {
	ToasterProps,
	// eslint-disable-next-line signoz/no-signozhq-ui-barrel
} from '@signozhq/ui';
