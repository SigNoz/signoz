/**
 * storage:getScopedKey — key scoping per runtime base path.
 *
 * getBasePath() is memoized at module init, and vi.resetModules() does not
 * re-evaluate modules in browser mode, so per-path state is driven through a
 * utils/basePath mock instead of re-importing with a fresh DOM state.
 * (The <base>-tag DOM reading itself is covered in base-path.test.ts.)
 */

import { getBasePath } from 'utils/basePath';

import { getScopedKey } from '../storage';

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

describe('getScopedKey — root path "/"', () => {
	it('returns the bare key unchanged', () => {
		setBasePath('/');
		expect(getScopedKey('AUTH_TOKEN')).toBe('AUTH_TOKEN');
	});

	it('backward compat: scoped key equals direct localStorage key', () => {
		setBasePath('/');
		localStorage.setItem('AUTH_TOKEN', 'tok');
		expect(localStorage.getItem(getScopedKey('AUTH_TOKEN'))).toBe('tok');
	});
});

describe('getScopedKey — prefixed path "/signoz/"', () => {
	it('prefixes the key with the base path', () => {
		setBasePath('/signoz/');
		expect(getScopedKey('AUTH_TOKEN')).toBe('/signoz/AUTH_TOKEN');
	});

	it('isolates from root namespace', () => {
		setBasePath('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'root-tok');
		expect(localStorage.getItem(getScopedKey('AUTH_TOKEN'))).toBeNull();
	});
});

describe('getScopedKey — prefixed path "/testing/"', () => {
	it('prefixes the key with /testing/', () => {
		setBasePath('/testing/');
		expect(getScopedKey('THEME')).toBe('/testing/THEME');
	});
});

describe('getScopedKey — prefixed path "/playwright/"', () => {
	it('prefixes the key with /playwright/', () => {
		setBasePath('/playwright/');
		expect(getScopedKey('THEME')).toBe('/playwright/THEME');
	});
});

describe('getScopedKey — no <base> tag', () => {
	it('falls back to bare key (basePath defaults to "/")', () => {
		setBasePath('/');
		expect(getScopedKey('THEME')).toBe('THEME');
	});
});
