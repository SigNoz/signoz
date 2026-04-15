import { getBasePath } from 'utils/getBasePath';

/**
 * Contract tests for getBasePath().
 *
 * These lock down the exact DOM-reading contract so that any future change to
 * the utility (or to how index.html injects the <base> tag) surfaces
 * immediately as a test failure.
 */
describe('getBasePath', () => {
	afterEach(() => {
		// Remove any <base> elements added during the test.
		document.head.querySelectorAll('base').forEach((el) => el.remove());
	});

	it('returns the href from the <base> tag when present', () => {
		const base = document.createElement('base');
		base.setAttribute('href', '/signoz/');
		document.head.appendChild(base);

		expect(getBasePath()).toBe('/signoz/');
	});

	it('returns "/" when no <base> tag exists in the document', () => {
		expect(getBasePath()).toBe('/');
	});

	it('returns "/" when the <base> tag has no href attribute', () => {
		const base = document.createElement('base');
		document.head.appendChild(base);

		expect(getBasePath()).toBe('/');
	});

	it('returns the href unchanged when it already has a trailing slash', () => {
		const base = document.createElement('base');
		base.setAttribute('href', '/my/nested/path/');
		document.head.appendChild(base);

		expect(getBasePath()).toBe('/my/nested/path/');
	});

	it('appends a trailing slash when the href is missing one', () => {
		const base = document.createElement('base');
		base.setAttribute('href', '/signoz');
		document.head.appendChild(base);

		expect(getBasePath()).toBe('/signoz/');
	});
});
