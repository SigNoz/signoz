/**
 * localstorage/get — lazy migration tests.
 *
 * getBasePath() is memoized at module init, and vi.resetModules() does not
 * re-evaluate modules in browser mode, so per-path state is driven through a
 * utils/basePath mock instead of re-importing with a fresh DOM state.
 */

import { getBasePath } from 'utils/basePath';

import get from '../get';

vi.mock('utils/basePath', async () => {
	const actual =
		await vi.importActual<typeof import('utils/basePath')>('utils/basePath');
	return { ...actual, getBasePath: vi.fn(() => '/') };
});

function setBasePath(href: string): void {
	vi.mocked(getBasePath).mockReturnValue(href.endsWith('/') ? href : `${href}/`);
}

afterEach(() => {
	localStorage.clear();
});

describe('get — root path "/"', () => {
	it('reads the bare key', () => {
		setBasePath('/');
		localStorage.setItem('AUTH_TOKEN', 'tok');
		expect(get('AUTH_TOKEN')).toBe('tok');
	});

	it('returns null when key is absent', () => {
		setBasePath('/');
		expect(get('MISSING')).toBeNull();
	});

	it('does NOT promote bare keys (no-op at root)', () => {
		setBasePath('/');
		localStorage.setItem('THEME', 'light');
		get('THEME');
		// bare key must still be present — no migration at root
		expect(localStorage.getItem('THEME')).toBe('light');
	});
});

describe('get — prefixed path "/signoz/"', () => {
	it('reads an already-scoped key directly', () => {
		setBasePath('/signoz/');
		localStorage.setItem('/signoz/AUTH_TOKEN', 'scoped-tok');
		expect(get('AUTH_TOKEN')).toBe('scoped-tok');
	});

	it('returns null when neither scoped nor bare key exists', () => {
		setBasePath('/signoz/');
		expect(get('MISSING')).toBeNull();
	});

	it('lazy-migrates bare key to scoped key on first read', () => {
		setBasePath('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'old-tok');

		const result = get('AUTH_TOKEN');

		expect(result).toBe('old-tok');
		expect(localStorage.getItem('/signoz/AUTH_TOKEN')).toBe('old-tok');
		expect(localStorage.getItem('AUTH_TOKEN')).toBeNull();
	});

	it('scoped key takes precedence over bare key', () => {
		setBasePath('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'bare-tok');
		localStorage.setItem('/signoz/AUTH_TOKEN', 'scoped-tok');

		expect(get('AUTH_TOKEN')).toBe('scoped-tok');
		// bare key left untouched — scoped already existed
		expect(localStorage.getItem('AUTH_TOKEN')).toBe('bare-tok');
	});

	it('subsequent reads after migration use scoped key (no double-write)', () => {
		setBasePath('/signoz/');
		localStorage.setItem('THEME', 'dark');

		get('THEME'); // triggers migration
		localStorage.removeItem('THEME'); // simulate bare key gone

		// second read still finds the scoped key
		expect(get('THEME')).toBe('dark');
	});
});

describe('get — two-prefix isolation', () => {
	it('/signoz/ and /testing/ do not share migrated values', () => {
		setBasePath('/signoz/');
		localStorage.setItem('THEME', 'light');

		// migrate bare → /signoz/THEME
		get('THEME');

		setBasePath('/testing/');

		// /testing/ prefix: bare key already gone, scoped key does not exist
		expect(get('THEME')).toBeNull();
		expect(localStorage.getItem('/signoz/THEME')).toBe('light');
		expect(localStorage.getItem('/testing/THEME')).toBeNull();
	});
});

export {};
