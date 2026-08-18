import ROUTES from 'constants/routes';

import { buildRoutePath } from '../buildRoutePath';

/**
 * These assertions are the contract Phase D has to reproduce: v6.30's
 * `generatePath` does no encoding at all, so the encoding below has to move
 * into `buildRoutePath` when the version flips.
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

		it('leaves a colon alone', () => {
			expect(buildRoutePath(ROUTES.TRACE_DETAIL, { id: 'a:b' })).toBe(
				'/trace/a:b',
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
