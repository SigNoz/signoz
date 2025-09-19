/* Jest mock for @signozhq/sonner to avoid CSS injection and console noise in JSDOM */

type ToastMethod = (...args: unknown[]) => void;

type ToastApi = ((...args: unknown[]) => void) & {
	success: ToastMethod;
	error: ToastMethod;
	info: ToastMethod;
	warning: ToastMethod;
	message: ToastMethod;
	dismiss: ToastMethod;
	promise: ToastMethod;
};

export const toast = Object.assign(jest.fn(), {
	success: jest.fn(),
	error: jest.fn(),
	info: jest.fn(),
	warning: jest.fn(),
	message: jest.fn(),
	dismiss: jest.fn(),
	promise: jest.fn(),
}) as ToastApi;

export function Toaster(): null {
	return null;
}
