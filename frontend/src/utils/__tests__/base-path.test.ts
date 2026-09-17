/**
 * basePath is memoized at module init, so each describe block isolates the
 * module with a fresh DOM state using vi.resetModules + dynamic import.
 *
 * Limitation: vi.resetModules() does not re-evaluate modules in browser mode
 * (one module instance per file), so only the first prefix ("/") is live
 * there. The remaining prefixes are it.skipped below with a reason; keep their
 * assertions intact so a future lazy-init refactor of basePath.ts can unskip
 * them trivially.
 */

type BasePath = typeof import('../basePath');

async function loadModule(href?: string): Promise<BasePath> {
	if (href !== undefined) {
		const base = document.createElement('base');
		base.setAttribute('href', href);
		document.head.append(base);
	}

	vi.resetModules();
	return import('../basePath');
}

afterEach(() => {
	for (const el of document.head.querySelectorAll('base')) {
		el.remove();
	}
});

describe('at basePath="/"', () => {
	let m: BasePath;
	beforeEach(async () => {
		m = await loadModule('/');
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
	beforeEach(async () => {
		m = await loadModule('/signoz/');
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('getBasePath returns "/signoz/"', () => {
		expect(m.getBasePath()).toBe('/signoz/');
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('withBasePath prepends the prefix', () => {
		expect(m.withBasePath('/logs')).toBe('/signoz/logs');
		expect(m.withBasePath('/logs/explorer')).toBe('/signoz/logs/explorer');
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('withBasePath is idempotent — safe to call twice', () => {
		expect(m.withBasePath('/signoz/logs')).toBe('/signoz/logs');
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('withBasePath is idempotent when path equals the prefix without trailing slash', () => {
		expect(m.withBasePath('/signoz')).toBe('/signoz');
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('withBasePath passes through external URLs', () => {
		expect(m.withBasePath('https://example.com/foo')).toBe(
			'https://example.com/foo',
		);
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('getAbsoluteUrl returns origin + prefixed path', () => {
		expect(m.getAbsoluteUrl('/logs')).toBe(
			`${window.location.origin}/signoz/logs`,
		);
	});

	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('getBaseUrl returns origin + prefix without trailing slash', () => {
		expect(m.getBaseUrl()).toBe(`${window.location.origin}/signoz`);
	});
});

describe('no <base> tag', () => {
	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('getBasePath falls back to "/"', async () => {
		const m = await loadModule();
		expect(m.getBasePath()).toBe('/');
	});
});

describe('href without trailing slash', () => {
	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('normalises to trailing slash', async () => {
		const m = await loadModule('/signoz');
		expect(m.getBasePath()).toBe('/signoz/');
		expect(m.withBasePath('/logs')).toBe('/signoz/logs');
	});
});

describe('nested prefix "/a/b/prefix/"', () => {
	// no fresh module per prefix in browser mode: only the first prefix ("/") is live.
	it.skip('withBasePath handles arbitrary depth', async () => {
		const m = await loadModule('/a/b/prefix/');
		expect(m.withBasePath('/logs')).toBe('/a/b/prefix/logs');
		expect(m.withBasePath('/a/b/prefix/logs')).toBe('/a/b/prefix/logs');
	});
});
