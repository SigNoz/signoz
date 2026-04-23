/**
 * storage.ts memoizes basePath at module init (via basePath.ts IIFE).
 * Use jest.isolateModules to re-import storage with a fresh DOM state each time.
 */

type StorageModule = typeof import('../storage');

function loadStorageModule(href?: string): StorageModule {
	if (href !== undefined) {
		const base = document.createElement('base');
		base.setAttribute('href', href);
		document.head.append(base);
	}
	let mod!: StorageModule;
	jest.isolateModules(() => {
		// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
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
		const { getScopedKey } = loadStorageModule('/');
		expect(getScopedKey('AUTH_TOKEN')).toBe('AUTH_TOKEN');
	});

	it('backward compat: scoped key equals direct localStorage key', () => {
		const { getScopedKey } = loadStorageModule('/');
		localStorage.setItem('AUTH_TOKEN', 'tok');
		expect(localStorage.getItem(getScopedKey('AUTH_TOKEN'))).toBe('tok');
	});
});

describe('getScopedKey — prefixed path "/signoz/"', () => {
	it('prefixes the key with the base path', () => {
		const { getScopedKey } = loadStorageModule('/signoz/');
		expect(getScopedKey('AUTH_TOKEN')).toBe('/signoz/AUTH_TOKEN');
	});

	it('isolates from root namespace', () => {
		const { getScopedKey } = loadStorageModule('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'root-tok');
		expect(localStorage.getItem(getScopedKey('AUTH_TOKEN'))).toBeNull();
	});
});

describe('getScopedKey — prefixed path "/testing/"', () => {
	it('prefixes the key with /testing/', () => {
		const { getScopedKey } = loadStorageModule('/testing/');
		expect(getScopedKey('THEME')).toBe('/testing/THEME');
	});
});

describe('getScopedKey — prefixed path "/playwright/"', () => {
	it('prefixes the key with /playwright/', () => {
		const { getScopedKey } = loadStorageModule('/playwright/');
		expect(getScopedKey('THEME')).toBe('/playwright/THEME');
	});
});

describe('getScopedKey — no <base> tag', () => {
	it('falls back to bare key (basePath defaults to "/")', () => {
		const { getScopedKey } = loadStorageModule();
		expect(getScopedKey('THEME')).toBe('THEME');
	});
});
