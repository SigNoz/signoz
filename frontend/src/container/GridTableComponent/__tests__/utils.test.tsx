import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	createColumnsAndDataSource,
	getQueryLegend,
	sortFunction,
} from '../utils';
import {
	expectedOutputQBv5MultiAggregations,
	expectedOutputWithLegends,
	tableDataMultipleQueriesSuccessResponse,
	tableDataQBv5MultiAggregations,
	widgetQueryQBv5MultiAggregations,
	widgetQueryWithLegend,
} from './response';

describe('Table Panel utils', () => {
	it('createColumnsAndDataSource function', () => {
		const data = tableDataMultipleQueriesSuccessResponse;
		const query = widgetQueryWithLegend as Query;

		const { columns, dataSource } = createColumnsAndDataSource(data, query);

		expect(dataSource).toStrictEqual(expectedOutputWithLegends.dataSource);

		// this makes sure that the columns are rendered in the same order as response
		expect(columns[0].title).toBe('service_name');
		// the next specifically makes sure that the legends are properly applied in multiple queries
		expect(columns[1].title).toBe('p99');
		// this makes sure that the query without a legend takes the title from the query response
		expect(columns[2].title).toBe('B');

		// this is to ensure that the rows properly map to the column data indexes as the dataIndex should be equal to name of the columns
		// returned in the response as the rows will be mapped with them
		expect((columns[0] as any).dataIndex).toBe('service_name');
		expect((columns[1] as any).dataIndex).toBe('A');
		expect((columns[2] as any).dataIndex).toBe('B');
	});

	it('getQueryLegend function', () => {
		const query = widgetQueryWithLegend as Query;

		// query A has a legend of p99
		expect(getQueryLegend(query, 'A')).toBe('p99');

		// should return undefined when legend not present
		expect(getQueryLegend(query, 'B')).toBe(undefined);
	});

	it('sorter function for table sorting', () => {
		let rowA: {
			A: string | number;
			timestamp: number;
			key: string;
		} = {
			A: 22.4,
			timestamp: 111111,
			key: '1111',
		};
		let rowB: {
			A: string | number;
			timestamp: number;
			key: string;
		} = {
			A: 'n/a',
			timestamp: 111112,
			key: '1112',
		};
		const item = {
			isValueColumn: true,
			name: 'A',
			queryName: 'A',
			id: 'A',
		};
		// A has value and value is considered bigger than n/a hence 1
		expect(sortFunction(rowA, rowB, item)).toBe(1);

		rowA = {
			A: 'n/a',
			timestamp: 111111,
			key: '1111',
		};
		rowB = {
			A: 22.4,
			timestamp: 111112,
			key: '1112',
		};

		// B has value and value is considered bigger than n/a hence -1
		expect(sortFunction(rowA, rowB, item)).toBe(-1);

		rowA = {
			A: 11,
			timestamp: 111111,
			key: '1111',
		};
		rowB = {
			A: 22,
			timestamp: 111112,
			key: '1112',
		};

		// A and B has value , since B > A hence A-B
		expect(sortFunction(rowA, rowB, item)).toBe(-11);

		rowA = {
			A: 'read',
			timestamp: 111111,
			key: '1111',
		};
		rowB = {
			A: 'write',
			timestamp: 111112,
			key: '1112',
		};

		// A and B are strings so A is smaller than B because r comes before w hence -1
		expect(sortFunction(rowA, rowB, item)).toBe(-1);

		rowA = {
			A: 'n/a',
			timestamp: 111111,
			key: '1111',
		};
		rowB = {
			A: 'n/a',
			timestamp: 111112,
			key: '1112',
		};

		// A and B are strings n/a , since both of them are same hence 0
		expect(sortFunction(rowA, rowB, item)).toBe(0);
	});
});

describe('Table Panel utils with QB v5 aggregations', () => {
	it('createColumnsAndDataSource function - QB v5 multi-aggregations', () => {
		const data = tableDataQBv5MultiAggregations;
		const query = widgetQueryQBv5MultiAggregations as Query;

		const { columns, dataSource } = createColumnsAndDataSource(data, query);

		// Verify column structure for multi-aggregations
		expect(columns).toHaveLength(8);
		expect(columns[0].title).toBe('service.name');
		expect(columns[1].title).toBe('host.name');
		// All columns with queryName 'A' get the legend 'p99'
		expect(columns[2].title).toBe('p99'); // A.count() uses legend from query A
		expect(columns[3].title).toBe('p99'); // A.count_distinct() uses legend from query A
		expect(columns[4].title).toBe('count()'); // B.count() uses column name (no legend)
		expect(columns[5].title).toBe('count_distinct(app.ads.count)'); // B.count_distinct() uses column name
		expect(columns[6].title).toBe('max'); // C.count() uses legend from query C
		expect(columns[7].title).toBe('max'); // C.count_distinct() uses legend from query C

		// Verify dataIndex mapping
		expect((columns[0] as any).dataIndex).toBe('service.name');
		expect((columns[2] as any).dataIndex).toBe('A.count()');
		expect((columns[3] as any).dataIndex).toBe('A.count_distinct(app.ads.count)');

		// Verify dataSource structure
		expect(dataSource).toStrictEqual(
			expectedOutputQBv5MultiAggregations.dataSource,
		);
	});

	it('getQueryLegend function - QB v5 multi-query support', () => {
		const query = widgetQueryQBv5MultiAggregations as Query;

		expect(getQueryLegend(query, 'A')).toBe('p99');
		expect(getQueryLegend(query, 'B')).toBeUndefined();
		expect(getQueryLegend(query, 'C')).toBe('max');
		expect(getQueryLegend(query, 'D')).toBeUndefined();
	});

	it('sorter function - QB v5 multi-aggregation columns', () => {
		const item = {
			isValueColumn: true,
			name: 'count()',
			queryName: 'A',
			id: 'A.count()',
		};

		// Test numeric sorting
		expect(
			sortFunction(
				{ 'A.count()': 100, key: '1', timestamp: 1000 },
				{ 'A.count()': 200, key: '2', timestamp: 1000 },
				item,
			),
		).toBe(-100);

		// Test n/a handling
		expect(
			sortFunction(
				{ 'A.count()': 'n/a', key: '1', timestamp: 1000 },
				{ 'A.count()': 100, key: '2', timestamp: 1000 },
				item,
			),
		).toBe(-1);

		expect(
			sortFunction(
				{ 'A.count()': 100, key: '1', timestamp: 1000 },
				{ 'A.count()': 'n/a', key: '2', timestamp: 1000 },
				item,
			),
		).toBe(1);

		// Test string sorting
		expect(
			sortFunction(
				{ 'A.count()': 'read', key: '1', timestamp: 1000 },
				{ 'A.count()': 'write', key: '2', timestamp: 1000 },
				item,
			),
		).toBe(-1);

		// Test equal values
		expect(
			sortFunction(
				{ 'A.count()': 'n/a', key: '1', timestamp: 1000 },
				{ 'A.count()': 'n/a', key: '2', timestamp: 1000 },
				item,
			),
		).toBe(0);
	});
});
