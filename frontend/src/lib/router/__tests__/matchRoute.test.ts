import ROUTES from 'constants/routes';

import { buildRoutePath } from '../buildRoutePath';
import { matchRoute } from '../matchRoute';

describe('matchRoute', () => {
	describe('exact defaults to false (v5 string-form semantics)', () => {
		it('prefix-matches when no options are passed', () => {
			expect(matchRoute('/settings/roles', ROUTES.SETTINGS)).not.toBeNull();
		});

		it('reports end: false on the returned pattern', () => {
			expect(
				matchRoute('/settings/roles', ROUTES.SETTINGS)?.pattern,
			).toStrictEqual({
				path: ROUTES.SETTINGS,
				caseSensitive: false,
				end: false,
			});
		});

		it('behaves the same for an explicit exact: false', () => {
			expect(
				matchRoute('/settings/roles', ROUTES.SETTINGS, { exact: false }),
			).toStrictEqual(matchRoute('/settings/roles', ROUTES.SETTINGS));
		});

		it('prefix-matches the two call sites that pass no options', () => {
			expect(matchRoute('/trace/abc123', ROUTES.TRACE_DETAIL)).not.toBeNull();
			expect(
				matchRoute('/trace/abc123/child', ROUTES.TRACE_DETAIL)?.params,
			).toStrictEqual({ id: 'abc123' });
		});
	});

	describe('exact: true', () => {
		it('rejects a longer pathname', () => {
			expect(
				matchRoute('/settings/roles', ROUTES.SETTINGS, { exact: true }),
			).toBeNull();
		});

		it('matches the pathname itself', () => {
			expect(
				matchRoute('/settings', ROUTES.SETTINGS, { exact: true }),
			).not.toBeNull();
		});

		it('reports end: true on the returned pattern', () => {
			expect(
				matchRoute('/alerts/history', ROUTES.ALERT_HISTORY, { exact: true })
					?.pattern,
			).toStrictEqual({
				path: ROUTES.ALERT_HISTORY,
				caseSensitive: false,
				end: true,
			});
		});
	});

	describe('result shape', () => {
		it('extracts params', () => {
			const match = matchRoute<'roleId'>(
				'/settings/roles/1f8b',
				ROUTES.ROLE_DETAILS,
				{ exact: true },
			);
			expect(match?.params.roleId).toBe('1f8b');
		});

		it('reports the matched portion as pathname and pathnameBase', () => {
			const match = matchRoute('/settings/roles/1f8b', ROUTES.SETTINGS);
			expect(match?.pathname).toBe('/settings');
			expect(match?.pathnameBase).toBe('/settings');
		});

		it('returns null when the pattern does not match', () => {
			expect(matchRoute('/logs', ROUTES.SETTINGS)).toBeNull();
		});

		it('does not partially match a path segment', () => {
			expect(matchRoute('/settingsx', ROUTES.SETTINGS)).toBeNull();
		});

		it('un-escapes %2F in param values, as v6 does', () => {
			expect(
				matchRoute<'id'>('/trace/a%2Fb', ROUTES.TRACE_DETAIL, { exact: true })
					?.params.id,
			).toBe('a/b');
		});

		it('leaves every other escape sequence alone, as v6 does', () => {
			expect(
				matchRoute<'id'>('/trace/a%20b', ROUTES.TRACE_DETAIL, { exact: true })
					?.params.id,
			).toBe('a%20b');
		});

		it('round-trips a value built by buildRoutePath', () => {
			const path = buildRoutePath(ROUTES.TRACE_DETAIL, { id: 'a/b' });
			expect(
				matchRoute<'id'>(path, ROUTES.TRACE_DETAIL, { exact: true })?.params.id,
			).toBe('a/b');
		});
	});
});
