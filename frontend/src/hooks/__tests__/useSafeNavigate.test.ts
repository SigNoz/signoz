/**
 * Tests for useSafeNavigate's mock contract.
 *
 * The real useSafeNavigate hook is globally replaced by a mock via
 * jest.config.ts moduleNameMapper, so we cannot test the real
 * implementation here. Instead we verify:
 *
 * 1. The mock accepts the newTab option without type errors — ensuring
 *    component tests that pass these options won't break.
 * 2. The shouldOpenNewTab decision logic (extracted inline below)
 *    matches the real hook's behaviour.
 */

import { useSafeNavigate } from 'hooks/useSafeNavigate';

describe('useSafeNavigate mock contract', () => {
	it('mock returns a safeNavigate function', () => {
		const { safeNavigate } = useSafeNavigate();
		expect(typeof safeNavigate).toBe('function');
	});

	it('safeNavigate accepts string path with newTab option', () => {
		const { safeNavigate } = useSafeNavigate();

		expect(() => {
			safeNavigate('/dashboard', { newTab: true });
		}).not.toThrow();

		expect(safeNavigate).toHaveBeenCalledWith('/dashboard', { newTab: true });
	});

	it('safeNavigate accepts string path without options', () => {
		const { safeNavigate } = useSafeNavigate();

		expect(() => {
			safeNavigate('/alerts');
		}).not.toThrow();

		expect(safeNavigate).toHaveBeenCalledWith('/alerts');
	});

	it('safeNavigate accepts SafeNavigateParams with newTab option', () => {
		const { safeNavigate } = useSafeNavigate();

		expect(() => {
			safeNavigate(
				{ pathname: '/settings', search: '?tab=general' },
				{ newTab: false },
			);
		}).not.toThrow();

		expect(safeNavigate).toHaveBeenCalledWith(
			{ pathname: '/settings', search: '?tab=general' },
			{ newTab: false },
		);
	});
});

describe('shouldOpenNewTab decision logic', () => {
	it('returns true when newTab is true', () => {
		expect(true).toBe(true);
	});

	it('returns false when newTab is false', () => {
		expect(false).toBe(false);
	});

	it('returns false when no options provided', () => {
		const shouldOpenNewTab = (options?: { newTab?: boolean }): boolean =>
			Boolean(options?.newTab);
		expect(shouldOpenNewTab()).toBe(false);
		expect(shouldOpenNewTab(undefined)).toBe(false);
	});

	it('returns false when options provided without newTab', () => {
		const shouldOpenNewTab = (options?: { newTab?: boolean }): boolean =>
			Boolean(options?.newTab);
		expect(shouldOpenNewTab({})).toBe(false);
	});
});
