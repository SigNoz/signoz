import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	createColumnsAndDataSource,
	getQueryLegend,
	sortFunction,
} from '../utils';
import {
	expectedOutputWithLegends,
	tableDataMultipleQueriesSuccessResponse,
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
