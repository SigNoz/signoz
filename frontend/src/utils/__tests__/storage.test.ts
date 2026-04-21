/**
 * storage.ts memoizes basePath at module init (via basePath.ts IIFE).
 * Use jest.isolateModules to re-import storage with a fresh DOM state each time.
 */

type StorageModule = typeof import('../storage');

function loadModule(href?: string): StorageModule {
	if (href !== undefined) {
		const base = document.createElement('base');
		base.setAttribute('href', href);
		document.head.appendChild(base);
	}
	let mod!: StorageModule;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
		mod = require('../storage');
	});
	return mod;
}

afterEach(() => {
	document.head.querySelectorAll('base').forEach((el) => el.remove());
	localStorage.clear();
});

describe('getScopedKey — root path "/"', () => {
	it('returns the bare key unchanged', () => {
		const { getScopedKey } = loadModule('/');
		expect(getScopedKey('AUTH_TOKEN')).toBe('AUTH_TOKEN');
	});

	it('backward compat: scoped key equals direct localStorage key', () => {
		const { getScopedKey } = loadModule('/');
		localStorage.setItem('AUTH_TOKEN', 'tok');
		expect(localStorage.getItem(getScopedKey('AUTH_TOKEN'))).toBe('tok');
	});
});

describe('getScopedKey — prefixed path "/signoz/"', () => {
	it('prefixes the key with the base path', () => {
		const { getScopedKey } = loadModule('/signoz/');
		expect(getScopedKey('AUTH_TOKEN')).toBe('/signoz/AUTH_TOKEN');
	});

	it('isolates from root namespace', () => {
		const { getScopedKey } = loadModule('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'root-tok');
		expect(localStorage.getItem(getScopedKey('AUTH_TOKEN'))).toBeNull();
	});
});

describe('getScopedKey — prefixed path "/testing/"', () => {
	it('prefixes the key with /testing/', () => {
		const { getScopedKey } = loadModule('/testing/');
		expect(getScopedKey('THEME')).toBe('/testing/THEME');
	});
});

describe('getScopedKey — prefixed path "/playwright/"', () => {
	it('prefixes the key with /playwright/', () => {
		const { getScopedKey } = loadModule('/playwright/');
		expect(getScopedKey('THEME')).toBe('/playwright/THEME');
	});
});

describe('getScopedKey — no <base> tag', () => {
	it('falls back to bare key (basePath defaults to "/")', () => {
		const { getScopedKey } = loadModule();
		expect(getScopedKey('THEME')).toBe('THEME');
	});
});
