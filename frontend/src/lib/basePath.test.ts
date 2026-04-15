import { getBasePath, readBasePath } from './basePath';

describe('readBasePath', () => {
	afterEach(() => {
		document.querySelectorAll('base').forEach((el) => el.remove());
	});

	it('returns "/" when no <base> tag is present', () => {
		expect(readBasePath()).toBe('/');
	});

	it('returns the href when <base href="/signoz/"> exists', () => {
		const base = document.createElement('base');
		base.setAttribute('href', '/signoz/');
		document.head.prepend(base);
		expect(readBasePath()).toBe('/signoz/');
	});

	it('returns "/" when <base> tag exists but has no href attribute', () => {
		const base = document.createElement('base');
		document.head.prepend(base);
		expect(readBasePath()).toBe('/');
	});

	it('returns "/" when <base href="/"> exists (root deployment)', () => {
		const base = document.createElement('base');
		base.setAttribute('href', '/');
		document.head.prepend(base);
		expect(readBasePath()).toBe('/');
	});
});

describe('getBasePath (module-init snapshot)', () => {
	it('returns the value captured when the module was first loaded', () => {
		// In Jest, no <base> tag is present when the module loads, so the
		// snapshot is '/'. This test documents the singleton contract.
		expect(getBasePath()).toBe('/');
	});
});
