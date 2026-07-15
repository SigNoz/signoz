import { initialQueriesMap } from 'constants/queryBuilder';
import {
	areUrlsEffectivelySame,
	isDefaultNavigation,
} from 'hooks/useSafeNavigate.utils';
import { serialize } from 'lib/compositeQuery/serializer';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

const BASE = 'http://localhost';

const urlFrom = (pathname: string, params?: URLSearchParams): URL => {
	const search = params?.toString();
	const query = search ? `?${search}` : '';
	return new URL(`${pathname}${query}`, BASE);
};

/** Build params containing the serialized `compositeQuery` plus any extras. */
const withQuery = (
	query: Query,
	extra: Record<string, string> = {},
): URLSearchParams => {
	const params = serialize(query);
	Object.entries(extra).forEach(([key, value]) => params.set(key, value));
	return params;
};

describe('areUrlsEffectivelySame', () => {
	it('returns false when pathnames differ', () => {
		expect(areUrlsEffectivelySame(urlFrom('/logs'), urlFrom('/traces'))).toBe(
			false,
		);
	});

	it('returns true for two identical param-less URLs', () => {
		expect(areUrlsEffectivelySame(urlFrom('/logs'), urlFrom('/logs'))).toBe(true);
	});

	it('returns true when only the compositeQuery is present and identical', () => {
		const params = withQuery(initialQueriesMap.logs);
		expect(
			areUrlsEffectivelySame(
				urlFrom('/logs', params),
				urlFrom('/logs', new URLSearchParams(params.toString())),
			),
		).toBe(true);
	});

	// Regression: a matching compositeQuery must NOT mask differences in other
	// params. Previously every param was compared via the decoded query, so any
	// two URLs sharing a compositeQuery were judged identical.
	it('returns false when compositeQuery matches but another param differs', () => {
		const url1 = urlFrom(
			'/logs',
			withQuery(initialQueriesMap.logs, { startTime: '1000' }),
		);
		const url2 = urlFrom(
			'/logs',
			withQuery(initialQueriesMap.logs, { startTime: '2000' }),
		);
		expect(areUrlsEffectivelySame(url1, url2)).toBe(false);
	});

	it('returns false when compositeQuery matches but a param exists on only one URL', () => {
		const url1 = urlFrom(
			'/logs',
			withQuery(initialQueriesMap.logs, { startTime: '1000' }),
		);
		const url2 = urlFrom('/logs', withQuery(initialQueriesMap.logs));
		expect(areUrlsEffectivelySame(url1, url2)).toBe(false);
	});

	it('ignores the volatile id when comparing compositeQuery', () => {
		const url1 = urlFrom(
			'/logs',
			withQuery({ ...initialQueriesMap.logs, id: 'id-1' }),
		);
		const url2 = urlFrom(
			'/logs',
			withQuery({ ...initialQueriesMap.logs, id: 'id-2' }),
		);
		expect(areUrlsEffectivelySame(url1, url2)).toBe(true);
	});

	it('returns false when compositeQuery is semantically different', () => {
		const url1 = urlFrom('/logs', withQuery(initialQueriesMap.logs));
		const url2 = urlFrom('/metrics', withQuery(initialQueriesMap.metrics));
		// Force same pathname so only the query differs.
		expect(
			areUrlsEffectivelySame(
				url1,
				urlFrom('/logs', new URLSearchParams(url2.search)),
			),
		).toBe(false);
	});

	it('returns false when compositeQuery exists on only one URL', () => {
		const url1 = urlFrom('/logs', withQuery(initialQueriesMap.logs));
		const url2 = urlFrom('/logs');
		expect(areUrlsEffectivelySame(url1, url2)).toBe(false);
	});

	it('compares non-compositeQuery params directly when no compositeQuery is present', () => {
		const same1 = urlFrom(
			'/logs',
			new URLSearchParams({ startTime: '1', endTime: '2' }),
		);
		const same2 = urlFrom(
			'/logs',
			new URLSearchParams({ startTime: '1', endTime: '2' }),
		);
		expect(areUrlsEffectivelySame(same1, same2)).toBe(true);

		const diff = urlFrom(
			'/logs',
			new URLSearchParams({ startTime: '1', endTime: '3' }),
		);
		expect(areUrlsEffectivelySame(same1, diff)).toBe(false);
	});

	it('falls back to raw comparison when compositeQuery cannot be decoded', () => {
		const corrupt1 = urlFrom(
			'/logs',
			new URLSearchParams({ compositeQuery: '%7Bnot-json' }),
		);
		const corrupt2 = urlFrom(
			'/logs',
			new URLSearchParams({ compositeQuery: '%7Bnot-json' }),
		);
		expect(areUrlsEffectivelySame(corrupt1, corrupt2)).toBe(true);

		const corrupt3 = urlFrom(
			'/logs',
			new URLSearchParams({ compositeQuery: '%7Bother' }),
		);
		expect(areUrlsEffectivelySame(corrupt1, corrupt3)).toBe(false);
	});
});

describe('isDefaultNavigation', () => {
	it('returns false for different pathnames', () => {
		expect(isDefaultNavigation(urlFrom('/logs'), urlFrom('/traces'))).toBe(false);
	});

	it('returns true when a clean URL gains params', () => {
		expect(
			isDefaultNavigation(
				urlFrom('/logs'),
				urlFrom('/logs', new URLSearchParams({ startTime: '1' })),
			),
		).toBe(true);
	});

	it('returns true when the target introduces a new param key', () => {
		expect(
			isDefaultNavigation(
				urlFrom('/logs', new URLSearchParams({ startTime: '1' })),
				urlFrom('/logs', new URLSearchParams({ startTime: '1', endTime: '2' })),
			),
		).toBe(true);
	});

	it('returns false when the target has no new param keys', () => {
		expect(
			isDefaultNavigation(
				urlFrom('/logs', new URLSearchParams({ startTime: '1' })),
				urlFrom('/logs', new URLSearchParams({ startTime: '9' })),
			),
		).toBe(false);
	});
});
