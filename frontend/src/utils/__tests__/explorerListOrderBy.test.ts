import { initialQueriesMap } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import {
	DEFAULT_LIST_ORDER_BY,
	getListOrderBy,
	getRawPanelOrderBy,
	parseListOrderBy,
	setListOrderBy,
} from 'utils/explorerUtils';

const withOrderBy = (
	orderBy: { columnName: string; order: string }[],
): Query => ({
	...initialQueriesMap.logs,
	builder: {
		...initialQueriesMap.logs.builder,
		queryData: initialQueriesMap.logs.builder.queryData.map((item) => ({
			...item,
			orderBy,
		})),
	},
});

describe('getRawPanelOrderBy', () => {
	it('keeps row fields', () => {
		expect(
			getRawPanelOrderBy(
				withOrderBy([{ columnName: 'duration_nano', order: 'desc' }]),
			),
		).toStrictEqual([{ columnName: 'duration_nano', order: 'desc' }]);
	});

	it('keeps a group-by key, which is a row field too', () => {
		expect(
			getRawPanelOrderBy(
				withOrderBy([{ columnName: 'service.name', order: 'asc' }]),
			),
		).toStrictEqual([{ columnName: 'service.name', order: 'asc' }]);
	});

	// Repro: set an order on the Time Series tab, then switch to List.
	it('drops an aggregation carried in from an aggregated panel', () => {
		expect(
			getRawPanelOrderBy(withOrderBy([{ columnName: 'count()', order: 'desc' }])),
		).toStrictEqual([]);
	});

	it('drops the aggregated value sentinel', () => {
		expect(
			getRawPanelOrderBy(
				withOrderBy([{ columnName: '#SIGNOZ_VALUE', order: 'desc' }]),
			),
		).toStrictEqual([]);
	});

	it('keeps the usable entry and drops the rest', () => {
		expect(
			getRawPanelOrderBy(
				withOrderBy([
					{ columnName: 'count()', order: 'desc' },
					{ columnName: 'timestamp', order: 'desc' },
				]),
			),
		).toStrictEqual([{ columnName: 'timestamp', order: 'desc' }]);
	});
});

describe('getListOrderBy', () => {
	it('falls back to the default when the query holds only an aggregation', () => {
		expect(
			getListOrderBy(withOrderBy([{ columnName: 'count()', order: 'desc' }])),
		).toBe(DEFAULT_LIST_ORDER_BY);
	});

	it('reads the first order entry as a select value', () => {
		expect(
			getListOrderBy(withOrderBy([{ columnName: 'timestamp', order: 'asc' }])),
		).toBe('timestamp:asc');
	});

	it('lower-cases a hand-written direction from a deep link', () => {
		expect(
			getListOrderBy(withOrderBy([{ columnName: 'timestamp', order: 'ASC' }])),
		).toBe('timestamp:asc');
	});

	it('shows the primary entry when the query also carries the id tiebreaker', () => {
		const query = withOrderBy([
			{ columnName: 'timestamp', order: 'desc' },
			{ columnName: 'id', order: 'desc' },
		]);

		expect(getListOrderBy(query)).toBe('timestamp:desc');
	});

	it('falls back to the default when the query carries no order', () => {
		expect(getListOrderBy(withOrderBy([]))).toBe(DEFAULT_LIST_ORDER_BY);
		expect(getListOrderBy(null)).toBe(DEFAULT_LIST_ORDER_BY);
	});

	it('falls back to the given default', () => {
		expect(getListOrderBy(withOrderBy([]), 'last_activity_time:desc')).toBe(
			'last_activity_time:desc',
		);
	});
});

describe('parseListOrderBy', () => {
	it('splits a select value into an order payload', () => {
		expect(parseListOrderBy('durationNano:asc')).toStrictEqual({
			columnName: 'durationNano',
			order: 'asc',
		});
	});
});

describe('setListOrderBy', () => {
	it('replaces the order on every queryData entry', () => {
		const base = withOrderBy([{ columnName: 'timestamp', order: 'desc' }]);
		const next = setListOrderBy(base, 'severity_text:asc');

		next.builder.queryData.forEach((item) => {
			expect(item.orderBy).toStrictEqual([
				{ columnName: 'severity_text', order: 'asc' },
			]);
		});
	});

	it('does not mutate the query it is given', () => {
		const base = withOrderBy([{ columnName: 'timestamp', order: 'desc' }]);

		setListOrderBy(base, 'timestamp:asc');

		expect(base.builder.queryData[0].orderBy).toStrictEqual([
			{ columnName: 'timestamp', order: 'desc' },
		]);
	});
});
