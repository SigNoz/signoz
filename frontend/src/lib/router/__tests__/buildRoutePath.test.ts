import ROUTES from 'constants/routes';

import { buildRoutePath } from '../buildRoutePath';

/**
 * The encoding contract. v7's `generatePath` percent-encodes every param with
 * `encodeURIComponent`, so `buildRoutePath` no longer encodes anything itself
 * and these assertions are what pins the library's behaviour.
 */
describe('buildRoutePath', () => {
	it('fills a single param', () => {
		expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: 'abc123' })).toBe(
			'/trace/abc123',
		);
	});

	it('fills multiple params', () => {
		expect(
			buildRoutePath('/dashboard/:dashboardId/new-panel/:panelId', {
				dashboardId: 'd1',
				panelId: 'p2',
			}),
		).toBe('/dashboard/d1/new-panel/p2');
	});

	it('is a no-op on a pattern without params', () => {
		expect(buildRoutePath(ROUTES.ALERT_HISTORY)).toBe('/alerts/history');
	});

	it('leaves uuids and hex ids byte-identical', () => {
		const uuid = '6f532456-8cc0-4514-a93b-aed665c32b47';
		expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: uuid })).toBe(
			`/trace/${uuid}`,
		);
	});

	describe('param encoding', () => {
		it.each([
			['/', 'a/b', '/trace/a%2Fb'],
			['?', 'a?b', '/trace/a%3Fb'],
			['#', 'a#b', '/trace/a%23b'],
			['%', 'a%b', '/trace/a%25b'],
			['a space', 'a b', '/trace/a%20b'],
			['non-ascii', 'aé', '/trace/a%C3%A9'],
		])('percent-encodes %s', (_label, value, expected) => {
			expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: value })).toBe(expected);
		});

		it('percent-encodes a colon', () => {
			expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: 'a:b' })).toBe(
				'/trace/a%3Ab',
			);
		});

		it('encodes a raw value rather than passing an encoded one through', () => {
			expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: 'a%2Fb' })).toBe(
				'/trace/a%252Fb',
			);
		});
	});

	it('stringifies a numeric param', () => {
		expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: 42 })).toBe('/trace/42');
	});

	it('throws when a required param is missing', () => {
		expect(() => buildRoutePath(ROUTES.TRACE_DETAIL)).toThrow(/id/);
	});
});
