/**
 * basePath is memoized at module init, so each describe block isolates the
 * module with a fresh DOM state using jest.isolateModules + require.
 */

type BasePath = typeof import('../basePath');

function loadModule(href?: string): BasePath {
	if (href !== undefined) {
		const base = document.createElement('base');
		base.setAttribute('href', href);
		document.head.appendChild(base);
	}

	let mod!: BasePath;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
		mod = require('../basePath');
	});
	return mod;
}

afterEach(() => {
	document.head.querySelectorAll('base').forEach((el) => el.remove());
});

describe('at basePath="/"', () => {
	let m: BasePath;
	beforeEach(() => {
		m = loadModule('/');
	});

	it('getBasePath returns "/"', () => {
		expect(m.getBasePath()).toBe('/');
	});

	it('withBasePath is a no-op for any internal path', () => {
		expect(m.withBasePath('/logs')).toBe('/logs');
		expect(m.withBasePath('/logs/explorer')).toBe('/logs/explorer');
	});

	it('withBasePath passes through external URLs', () => {
		expect(m.withBasePath('https://example.com/foo')).toBe(
			'https://example.com/foo',
		);
	});

	it('getAbsoluteUrl returns origin + path', () => {
		expect(m.getAbsoluteUrl('/logs')).toBe(`${window.location.origin}/logs`);
	});

	it('getBaseUrl returns bare origin', () => {
		expect(m.getBaseUrl()).toBe(window.location.origin);
	});
});

describe('at basePath="/signoz/"', () => {
	let m: BasePath;
	beforeEach(() => {
		m = loadModule('/signoz/');
	});

	it('getBasePath returns "/signoz/"', () => {
		expect(m.getBasePath()).toBe('/signoz/');
	});

	it('withBasePath prepends the prefix', () => {
		expect(m.withBasePath('/logs')).toBe('/signoz/logs');
		expect(m.withBasePath('/logs/explorer')).toBe('/signoz/logs/explorer');
	});

	it('withBasePath is idempotent — safe to call twice', () => {
		expect(m.withBasePath('/signoz/logs')).toBe('/signoz/logs');
	});

	it('withBasePath is idempotent when path equals the prefix without trailing slash', () => {
		expect(m.withBasePath('/signoz')).toBe('/signoz');
	});

	it('withBasePath passes through external URLs', () => {
		expect(m.withBasePath('https://example.com/foo')).toBe(
			'https://example.com/foo',
		);
	});

	it('getAbsoluteUrl returns origin + prefixed path', () => {
		expect(m.getAbsoluteUrl('/logs')).toBe(
			`${window.location.origin}/signoz/logs`,
		);
	});

	it('getBaseUrl returns origin + prefix without trailing slash', () => {
		expect(m.getBaseUrl()).toBe(`${window.location.origin}/signoz`);
	});
});

describe('no <base> tag', () => {
	it('getBasePath falls back to "/"', () => {
		const m = loadModule();
		expect(m.getBasePath()).toBe('/');
	});
});

describe('href without trailing slash', () => {
	it('normalises to trailing slash', () => {
		const m = loadModule('/signoz');
		expect(m.getBasePath()).toBe('/signoz/');
		expect(m.withBasePath('/logs')).toBe('/signoz/logs');
	});
});

describe('nested prefix "/a/b/prefix/"', () => {
	it('withBasePath handles arbitrary depth', () => {
		const m = loadModule('/a/b/prefix/');
		expect(m.withBasePath('/logs')).toBe('/a/b/prefix/logs');
		expect(m.withBasePath('/a/b/prefix/logs')).toBe('/a/b/prefix/logs');
	});
});
