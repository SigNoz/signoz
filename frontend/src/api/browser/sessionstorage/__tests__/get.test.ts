/**
 * sessionstorage/get — lazy migration tests.
 * Mirrors the localStorage get tests; same logic, different storage.
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
	sessionStorage.clear();
});

describe('get — root path "/"', () => {
	it('reads the bare key', () => {
		setBasePath('/');
		sessionStorage.setItem('retry-lazy-refreshed', 'true');
		expect(get('retry-lazy-refreshed')).toBe('true');
	});

	it('returns null when key is absent', () => {
		setBasePath('/');
		expect(get('MISSING')).toBeNull();
	});

	it('does NOT promote bare keys at root', () => {
		setBasePath('/');
		sessionStorage.setItem('retry-lazy-refreshed', 'true');
		get('retry-lazy-refreshed');
		expect(sessionStorage.getItem('retry-lazy-refreshed')).toBe('true');
	});
});

describe('get — prefixed path "/signoz/"', () => {
	it('reads an already-scoped key directly', () => {
		setBasePath('/signoz/');
		sessionStorage.setItem('/signoz/retry-lazy-refreshed', 'true');
		expect(get('retry-lazy-refreshed')).toBe('true');
	});

	it('returns null when neither scoped nor bare key exists', () => {
		setBasePath('/signoz/');
		expect(get('MISSING')).toBeNull();
	});

	it('lazy-migrates bare key to scoped key on first read', () => {
		setBasePath('/signoz/');
		sessionStorage.setItem('retry-lazy-refreshed', 'true');

		const result = get('retry-lazy-refreshed');

		expect(result).toBe('true');
		expect(sessionStorage.getItem('/signoz/retry-lazy-refreshed')).toBe('true');
		expect(sessionStorage.getItem('retry-lazy-refreshed')).toBeNull();
	});

	it('scoped key takes precedence over bare key', () => {
		setBasePath('/signoz/');
		sessionStorage.setItem('retry-lazy-refreshed', 'bare');
		sessionStorage.setItem('/signoz/retry-lazy-refreshed', 'scoped');

		expect(get('retry-lazy-refreshed')).toBe('scoped');
		expect(sessionStorage.getItem('retry-lazy-refreshed')).toBe('bare');
	});
});

export {};
