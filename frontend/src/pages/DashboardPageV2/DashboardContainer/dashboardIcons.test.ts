import {
	DEFAULT_DASHBOARD_ICON_PATH,
	resolveDashboardImage,
	SYSTEM_ICON_PATHS,
} from './dashboardIcons';

// The glob-backed icon URL map is Vite-only, so stub it: path lookups then return
// a stable value and the resolver's fallback is deterministic under jest.
jest.mock('./iconAssets', () => ({
	ICON_URLS: { 'eight-ball': 'mock-eight-ball-url' },
	LOGO_URLS: { 'aws-dark': 'mock-logo-url' },
}));

describe('resolveDashboardImage', () => {
	const fallback = resolveDashboardImage(undefined);

	it('passes through valid base64 image data URIs unchanged', () => {
		const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
		const png = 'data:image/png;base64,iVBORw0KGgo=';
		expect(resolveDashboardImage(svg)).toBe(svg);
		expect(resolveDashboardImage(png)).toBe(png);
	});

	it.each([
		['non-image data URI', 'data:text/html;base64,PHNjcmlwdD4='],
		['javascript URI', 'javascript:alert(1)'],
		['remote URL', 'http://evil.com/x.svg'],
		['raw markup', '<svg onload=alert(1)>'],
		['empty string', ''],
		['unknown icon path', '/assets/Icons/does-not-exist'],
		['unknown logo path', '/assets/Logos/does-not-exist'],
	])('falls back for %s', (_label, value) => {
		const resolved = resolveDashboardImage(value);
		expect(resolved).not.toBe(value);
		expect(resolved).toBe(fallback);
	});

	it('resolves a known system icon path to a truthy src', () => {
		expect(resolveDashboardImage('/assets/Icons/eight-ball')).toBeTruthy();
	});

	it('resolves a known logo path to a truthy src', () => {
		expect(resolveDashboardImage('/assets/Logos/aws-dark')).toBe('mock-logo-url');
	});
});

describe('system icon catalogue', () => {
	it('exposes 20 icons, all under the /assets/Icons/ prefix', () => {
		expect(SYSTEM_ICON_PATHS).toHaveLength(20);
		expect(SYSTEM_ICON_PATHS.every((p) => p.startsWith('/assets/Icons/'))).toBe(
			true,
		);
	});

	it('defaults to the eight-ball icon', () => {
		expect(DEFAULT_DASHBOARD_ICON_PATH).toBe('/assets/Icons/eight-ball');
		expect(SYSTEM_ICON_PATHS).toContain(DEFAULT_DASHBOARD_ICON_PATH);
	});
});
