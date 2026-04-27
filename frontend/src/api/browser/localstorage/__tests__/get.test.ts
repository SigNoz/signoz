/**
 * localstorage/get — lazy migration tests.
 *
 * basePath is memoized at module init, so each describe block re-imports the
 * module with a fresh DOM state via jest.isolateModules.
 */

type GetModule = typeof import('../get');

function loadGetModule(href: string): GetModule {
	const base = document.createElement('base');
	base.setAttribute('href', href);
	document.head.append(base);

	let mod!: GetModule;
	jest.isolateModules(() => {
		// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
		mod = require('../get');
	});
	return mod;
}

afterEach(() => {
	for (const el of document.head.querySelectorAll('base')) {
		el.remove();
	}
	localStorage.clear();
});

describe('get — root path "/"', () => {
	it('reads the bare key', () => {
		const { default: get } = loadGetModule('/');
		localStorage.setItem('AUTH_TOKEN', 'tok');
		expect(get('AUTH_TOKEN')).toBe('tok');
	});

	it('returns null when key is absent', () => {
		const { default: get } = loadGetModule('/');
		expect(get('MISSING')).toBeNull();
	});

	it('does NOT promote bare keys (no-op at root)', () => {
		const { default: get } = loadGetModule('/');
		localStorage.setItem('THEME', 'light');
		get('THEME');
		// bare key must still be present — no migration at root
		expect(localStorage.getItem('THEME')).toBe('light');
	});
});

describe('get — prefixed path "/signoz/"', () => {
	it('reads an already-scoped key directly', () => {
		const { default: get } = loadGetModule('/signoz/');
		localStorage.setItem('/signoz/AUTH_TOKEN', 'scoped-tok');
		expect(get('AUTH_TOKEN')).toBe('scoped-tok');
	});

	it('returns null when neither scoped nor bare key exists', () => {
		const { default: get } = loadGetModule('/signoz/');
		expect(get('MISSING')).toBeNull();
	});

	it('lazy-migrates bare key to scoped key on first read', () => {
		const { default: get } = loadGetModule('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'old-tok');

		const result = get('AUTH_TOKEN');

		expect(result).toBe('old-tok');
		expect(localStorage.getItem('/signoz/AUTH_TOKEN')).toBe('old-tok');
		expect(localStorage.getItem('AUTH_TOKEN')).toBeNull();
	});

	it('scoped key takes precedence over bare key', () => {
		const { default: get } = loadGetModule('/signoz/');
		localStorage.setItem('AUTH_TOKEN', 'bare-tok');
		localStorage.setItem('/signoz/AUTH_TOKEN', 'scoped-tok');

		expect(get('AUTH_TOKEN')).toBe('scoped-tok');
		// bare key left untouched — scoped already existed
		expect(localStorage.getItem('AUTH_TOKEN')).toBe('bare-tok');
	});

	it('subsequent reads after migration use scoped key (no double-write)', () => {
		const { default: get } = loadGetModule('/signoz/');
		localStorage.setItem('THEME', 'dark');

		get('THEME'); // triggers migration
		localStorage.removeItem('THEME'); // simulate bare key gone

		// second read still finds the scoped key
		expect(get('THEME')).toBe('dark');
	});
});

describe('get — two-prefix isolation', () => {
	it('/signoz/ and /testing/ do not share migrated values', () => {
		localStorage.setItem('THEME', 'light');

		const base1 = document.createElement('base');
		base1.setAttribute('href', '/signoz/');
		document.head.append(base1);
		let getSignoz!: GetModule['default'];
		jest.isolateModules(() => {
			// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
			getSignoz = require('../get').default;
		});
		base1.remove();

		// migrate bare → /signoz/THEME
		getSignoz('THEME');

		const base2 = document.createElement('base');
		base2.setAttribute('href', '/testing/');
		document.head.append(base2);
		let getTesting!: GetModule['default'];
		jest.isolateModules(() => {
			// oxlint-disable-next-line typescript-eslint/no-require-imports, typescript-eslint/no-var-requires
			getTesting = require('../get').default;
		});
		base2.remove();

		// /testing/ prefix: bare key already gone, scoped key does not exist
		expect(getTesting('THEME')).toBeNull();
		expect(localStorage.getItem('/signoz/THEME')).toBe('light');
		expect(localStorage.getItem('/testing/THEME')).toBeNull();
	});
});

export {};
