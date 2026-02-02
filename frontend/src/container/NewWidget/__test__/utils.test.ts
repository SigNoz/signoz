import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import type { PartialPanelTypes } from '../utils';
import { handleQueryChange } from '../utils';

const buildSupersetQuery = (extras?: Record<string, unknown>): Query => ({
	queryType: EQueryType.QUERY_BUILDER,
	promql: [],
	clickhouse_sql: [],
	id: '1',
	unit: '1',
	builder: {
		queryFormulas: [],
		queryData: [
			{
				...initialQueryBuilderFormValuesMap[DataSource.LOGS],
				queryName: 'A',
				orderBy: [{ columnName: 'x', order: 'asc' }],
				limit: 10,
				...(extras || {}),
			},
			{
				...initialQueryBuilderFormValuesMap[DataSource.LOGS],
				queryName: 'B',
				orderBy: [{ columnName: 'x', order: 'desc' }],
				limit: 20,
				...(extras || {}),
			},
		],
		queryTraceOperator: [],
	},
});

describe('handleQueryChange', () => {
	test('sets list-specific fields when switching to LIST', () => {
		const superset = buildSupersetQuery();
		const output = handleQueryChange(
			PANEL_TYPES.LIST as keyof PartialPanelTypes,
			superset as Query,
			PANEL_TYPES.TABLE,
		);
		const firstQuery = output.builder.queryData[0];
		expect(firstQuery.aggregateOperator).toBe('noop');
		expect(firstQuery.offset).toBe(0);
		expect(firstQuery.pageSize).toBe(10);
		expect(firstQuery.orderBy).toBeUndefined();
		expect(firstQuery.queryName).toBe('A');

		const secondQuery = output.builder.queryData[1];
		expect(secondQuery.aggregateOperator).toBe('noop');
		expect(secondQuery.offset).toBe(0);
		expect(secondQuery.pageSize).toBe(10);
		expect(secondQuery.orderBy).toBeUndefined();
		expect(secondQuery.queryName).toBe('B');
	});

	test('resets noop and pagination when leaving LIST', () => {
		const superset = buildSupersetQuery({
			aggregateOperator: 'noop',
			offset: 5,
			pageSize: 50,
		});
		const output = handleQueryChange(
			PANEL_TYPES.TABLE as keyof PartialPanelTypes,
			superset as Query,
			PANEL_TYPES.LIST,
		);
		const q = output.builder.queryData[0];
		expect(q.aggregateOperator).not.toBe('noop');
		expect(q.offset).toBeUndefined();
		expect(q.pageSize).toBeUndefined();
		expect(q.orderBy).toBeUndefined();
		expect(q.queryName).toBe('A');
	});
});
