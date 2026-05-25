/**
 * sessionstorage/get — lazy migration tests.
 * Mirrors the localStorage get tests; same logic, different storage.
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
	sessionStorage.clear();
});

describe('get — root path "/"', () => {
	it('reads the bare key', () => {
		const { default: get } = loadGetModule('/');
		sessionStorage.setItem('retry-lazy-refreshed', 'true');
		expect(get('retry-lazy-refreshed')).toBe('true');
	});

	it('returns null when key is absent', () => {
		const { default: get } = loadGetModule('/');
		expect(get('MISSING')).toBeNull();
	});

	it('does NOT promote bare keys at root', () => {
		const { default: get } = loadGetModule('/');
		sessionStorage.setItem('retry-lazy-refreshed', 'true');
		get('retry-lazy-refreshed');
		expect(sessionStorage.getItem('retry-lazy-refreshed')).toBe('true');
	});
});

describe('get — prefixed path "/signoz/"', () => {
	it('reads an already-scoped key directly', () => {
		const { default: get } = loadGetModule('/signoz/');
		sessionStorage.setItem('/signoz/retry-lazy-refreshed', 'true');
		expect(get('retry-lazy-refreshed')).toBe('true');
	});

	it('returns null when neither scoped nor bare key exists', () => {
		const { default: get } = loadGetModule('/signoz/');
		expect(get('MISSING')).toBeNull();
	});

	it('lazy-migrates bare key to scoped key on first read', () => {
		const { default: get } = loadGetModule('/signoz/');
		sessionStorage.setItem('retry-lazy-refreshed', 'true');

		const result = get('retry-lazy-refreshed');

		expect(result).toBe('true');
		expect(sessionStorage.getItem('/signoz/retry-lazy-refreshed')).toBe('true');
		expect(sessionStorage.getItem('retry-lazy-refreshed')).toBeNull();
	});

	it('scoped key takes precedence over bare key', () => {
		const { default: get } = loadGetModule('/signoz/');
		sessionStorage.setItem('retry-lazy-refreshed', 'bare');
		sessionStorage.setItem('/signoz/retry-lazy-refreshed', 'scoped');

		expect(get('retry-lazy-refreshed')).toBe('scoped');
		expect(sessionStorage.getItem('retry-lazy-refreshed')).toBe('bare');
	});
});

export {};
