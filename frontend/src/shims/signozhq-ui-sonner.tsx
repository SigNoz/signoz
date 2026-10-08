/**
 * TEMPORARY bridge for the removed `@signozhq/ui/sonner` subpath, mapped here by the
 * `@signozhq/ui/sonner` entries in tsconfig `paths` (vite + type-check) and jest
 * `moduleNameMapper`. The reworked library ships `@signozhq/ui/toast` instead; its API matches
 * sonner's except that `error` is now `danger` and always carries an action button.
 *
 * Delete this file and both mapping entries when the toast adoption rewrites the call sites to
 * import from `@signozhq/ui/toast` directly.
 */
import {
	toast as uiToast,
	Toaster as UiToaster,
	type ToastPositionType,
} from '@signozhq/ui/toast';
import type { ReactElement, ReactNode } from 'react';

type LegacyToastAction = {
	label: ReactNode;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

/** Sonner accepted more options (`duration`, `richColors`, ...); only these still apply. */
type LegacyToastOptions = {
	description?: ReactNode;
	action?: LegacyToastAction;
	id?: string | number;
	[key: string]: unknown;
};

const DISMISS_ACTION = { label: 'Dismiss' };

function pick(options?: LegacyToastOptions): {
	description?: ReactNode;
	action?: LegacyToastAction;
	id?: string;
} {
	return {
		description: options?.description,
		action: options?.action,
		...(options?.id === undefined ? {} : { id: String(options.id) }),
	};
}

export const toast = {
	success: (title: ReactNode, options?: LegacyToastOptions): string =>
		uiToast.success(title, pick(options)),
	info: (title: ReactNode, options?: LegacyToastOptions): string =>
		uiToast.info(title, pick(options)),
	warning: (title: ReactNode, options?: LegacyToastOptions): string =>
		uiToast.warning(title, pick(options)),
	loading: (title: ReactNode, options?: LegacyToastOptions): string =>
		uiToast.loading(title, pick(options)),
	error: (title: ReactNode, options?: LegacyToastOptions): string =>
		uiToast.danger(title, { action: DISMISS_ACTION, ...pick(options) }),
	promise: <Value,>(
		value: Promise<Value>,
		options: {
			loading: ReactNode;
			success: ReactNode | ((result: Value) => ReactNode);
			error: ReactNode | ((error: unknown) => ReactNode);
			id?: string;
			[key: string]: unknown;
		},
	): Promise<Value> =>
		uiToast.promise(value, {
			loading: options.loading,
			success: options.success,
			error: options.error,
			errorAction: DISMISS_ACTION,
			id: options.id,
		}),
	dismiss: (id?: string | number): void =>
		uiToast.dismiss(id === undefined ? undefined : String(id)),
	/**
	 * Sonner rendered an arbitrary node. The new toast takes a node as its title, so the renderer
	 * still receives the id it uses to dismiss itself. Per-toast `duration` and `position` are
	 * ignored: every toast uses the toaster's timeout and position.
	 */
	custom: (
		render: (toastId: string) => ReactNode,
		options?: LegacyToastOptions,
	): string => {
		const id =
			options?.id === undefined
				? `custom:${Math.random().toString(36).slice(2)}`
				: String(options.id);
		return uiToast.info(render(id), { id });
	},
};

/** Sonner-only props (`closeButton`, `richColors`, ...) are accepted and dropped. */
export function Toaster({
	position,
}: {
	position?: ToastPositionType;
	[key: string]: unknown;
}): ReactElement {
	return <UiToaster position={position} />;
}
