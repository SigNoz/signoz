import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { StringOperators } from 'types/common/queryBuilder';

import { getCreateAlertLink, getExportPanelType } from '../utils';

function withFirstQuery(
	base: Query,
	overrides: Partial<Query['builder']['queryData'][number]>,
): Query {
	return {
		...base,
		builder: {
			...base.builder,
			queryData: [{ ...base.builder.queryData[0], ...overrides }],
		},
	};
}

function decodeQuery(link: string): Query {
	const search = link.split('?')[1];
	const raw = new URLSearchParams(search).get(QueryParams.compositeQuery);
	return JSON.parse(raw as string);
}

describe('getExportPanelType', () => {
	it.each([PANEL_TYPES.TIME_SERIES, PANEL_TYPES.TABLE, PANEL_TYPES.LIST])(
		'keeps %s',
		(panelType) => {
			expect(getExportPanelType(panelType)).toBe(panelType);
		},
	);

	it.each([PANEL_TYPES.BAR, PANEL_TYPES.PIE, PANEL_TYPES.TRACE, null])(
		'folds %s to time series',
		(panelType) => {
			expect(getExportPanelType(panelType)).toBe(PANEL_TYPES.TIME_SERIES);
		},
	);
});

describe('getCreateAlertLink', () => {
	const orderBy = [{ columnName: 'timestamp', order: 'desc' }];

	it('points at the new alert route with the query in the url', () => {
		const query = initialQueriesMap.traces;
		const link = getCreateAlertLink({
			query,
			panelType: PANEL_TYPES.TIME_SERIES,
		});

		expect(link.startsWith(`${ROUTES.ALERTS_NEW}?`)).toBe(true);
		expect(decodeQuery(link)).toStrictEqual(query);
	});

	it('logs list: noop becomes count and order by is dropped', () => {
		const query = withFirstQuery(initialQueriesMap.logs, {
			aggregateOperator: StringOperators.NOOP,
			orderBy,
		});

		const [queryData] = decodeQuery(
			getCreateAlertLink({
				query,
				panelType: PANEL_TYPES.LIST,
			}),
		).builder.queryData;

		expect(queryData.aggregateOperator).toBe(StringOperators.COUNT);
		expect(queryData.orderBy).toStrictEqual([]);
	});

	it('logs time series keeps order by', () => {
		const query = withFirstQuery(initialQueriesMap.logs, {
			aggregateOperator: StringOperators.COUNT,
			orderBy,
		});

		const [queryData] = decodeQuery(
			getCreateAlertLink({
				query,
				panelType: PANEL_TYPES.TIME_SERIES,
			}),
		).builder.queryData;

		expect(queryData.orderBy).toStrictEqual(orderBy);
	});

	it.each([PANEL_TYPES.LIST, PANEL_TYPES.TRACE])(
		'%s drops order by whatever the source',
		(panelType) => {
			const query = withFirstQuery(initialQueriesMap.traces, {
				aggregateOperator: StringOperators.NOOP,
				orderBy,
			});

			const [queryData] = decodeQuery(getCreateAlertLink({ query, panelType }))
				.builder.queryData;

			expect(queryData.aggregateOperator).toBe(StringOperators.COUNT);
			expect(queryData.orderBy).toStrictEqual([]);
		},
	);

	it('converts a noop on any query, not only the first', () => {
		const first = initialQueriesMap.logs.builder.queryData[0];
		const query: Query = {
			...initialQueriesMap.logs,
			builder: {
				...initialQueriesMap.logs.builder,
				queryData: [
					{ ...first, aggregateOperator: StringOperators.COUNT },
					{ ...first, queryName: 'B', aggregateOperator: StringOperators.NOOP },
				],
			},
		};

		const operators = decodeQuery(
			getCreateAlertLink({ query, panelType: PANEL_TYPES.TIME_SERIES }),
		).builder.queryData.map((item) => item.aggregateOperator);

		expect(operators).toStrictEqual([
			StringOperators.COUNT,
			StringOperators.COUNT,
		]);
	});

	it('does not mutate the query it is given', () => {
		const query = withFirstQuery(initialQueriesMap.logs, {
			aggregateOperator: StringOperators.NOOP,
			orderBy,
		});
		const snapshot = JSON.stringify(query);

		getCreateAlertLink({
			query,
			panelType: PANEL_TYPES.LIST,
		});

		expect(JSON.stringify(query)).toBe(snapshot);
	});
});
