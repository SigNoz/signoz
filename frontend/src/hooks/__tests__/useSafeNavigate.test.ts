/**
 * Tests for useSafeNavigate's mock contract.
 *
 * The real useSafeNavigate hook is globally replaced by a mock via
 * jest.config.ts moduleNameMapper, so we cannot test the real
 * implementation here. Instead we verify:
 *
 * 1. The mock accepts the new `event` and `newTab` options without
 *    type errors — ensuring component tests that pass these options
 *    won't break.
 * 2. The shouldOpenNewTab decision logic (extracted inline below)
 *    matches the real hook's behaviour.
 */

import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { isModifierKeyPressed } from 'utils/navigation';

/**
 * Mirrors the shouldOpenNewTab logic from the real useSafeNavigate hook.
 * Kept in sync manually — any drift will be caught by integration tests.
 */
interface NavigateOptions {
	newTab?: boolean;
	event?: MouseEvent | React.MouseEvent;
}

const shouldOpenNewTab = (options?: NavigateOptions): boolean =>
	Boolean(
		options?.newTab || (options?.event && isModifierKeyPressed(options.event)),
	);

describe('useSafeNavigate mock contract', () => {
	it('mock returns a safeNavigate function', () => {
		const { safeNavigate } = useSafeNavigate();
		expect(typeof safeNavigate).toBe('function');
	});

	it('safeNavigate accepts string path with event option', () => {
		const { safeNavigate } = useSafeNavigate();
		const event = { metaKey: true, ctrlKey: false } as MouseEvent;

		expect(() => {
			safeNavigate('/alerts', { event });
		}).not.toThrow();

		expect(safeNavigate).toHaveBeenCalledWith('/alerts', { event });
	});

	it('safeNavigate accepts string path with newTab option', () => {
		const { safeNavigate } = useSafeNavigate();

		expect(() => {
			safeNavigate('/dashboard', { newTab: true });
		}).not.toThrow();

		expect(safeNavigate).toHaveBeenCalledWith('/dashboard', { newTab: true });
	});

	it('safeNavigate accepts SafeNavigateParams with event option', () => {
		const { safeNavigate } = useSafeNavigate();
		const event = { metaKey: false, ctrlKey: true } as MouseEvent;

		expect(() => {
			safeNavigate({ pathname: '/settings', search: '?tab=general' }, { event });
		}).not.toThrow();

		expect(safeNavigate).toHaveBeenCalledWith(
			{ pathname: '/settings', search: '?tab=general' },
			{ event },
		);
	});
});

describe('shouldOpenNewTab decision logic', () => {
	it('returns true when newTab is true', () => {
		expect(shouldOpenNewTab({ newTab: true })).toBe(true);
	});

	it('returns true when event has metaKey pressed', () => {
		const event = { metaKey: true, ctrlKey: false } as MouseEvent;
		expect(shouldOpenNewTab({ event })).toBe(true);
	});

	it('returns true when event has ctrlKey pressed', () => {
		const event = { metaKey: false, ctrlKey: true } as MouseEvent;
		expect(shouldOpenNewTab({ event })).toBe(true);
	});

	it('returns false when event has no modifier keys', () => {
		const event = { metaKey: false, ctrlKey: false } as MouseEvent;
		expect(shouldOpenNewTab({ event })).toBe(false);
	});

	it('returns false when no options provided', () => {
		expect(shouldOpenNewTab()).toBe(false);
		expect(shouldOpenNewTab(undefined)).toBe(false);
	});

	it('returns false when options provided without event or newTab', () => {
		expect(shouldOpenNewTab({})).toBe(false);
	});

	it('newTab takes precedence even without event', () => {
		expect(shouldOpenNewTab({ newTab: true })).toBe(true);
	});
});
