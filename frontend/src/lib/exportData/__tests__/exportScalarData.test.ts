import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { exportScalarData } from '../exportScalarData';

const query = {
	queryType: 'builder',
	builder: {
		queryData: [
			{
				queryName: 'A',
				dataSource: 'logs',
				aggregations: [{ expression: 'count()' }],
				groupBy: [
					{ key: 'service.name', dataType: 'string', type: 'tag', id: 'svc' },
				],
				legend: '',
			},
		],
		queryFormulas: [],
	},
} as unknown as Query;

function makeResponse(
	tables: {
		queryName: string;
		columns: { name: string; id?: string; isValueColumn: boolean }[];
		rows: Record<string, string | number>[];
	}[],
): SuccessResponse<MetricRangePayloadProps> {
	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: {
			data: {
				resultType: 'scalar',
				result: tables.map((table) => ({
					queryName: table.queryName,
					legend: '',
					series: null,
					list: null,
					table: {
						columns: table.columns.map((col) => ({
							...col,
							queryName: table.queryName,
						})),
						rows: table.rows.map((row) => ({ data: row })),
					},
				})),
			},
		},
	} as unknown as SuccessResponse<MetricRangePayloadProps>;
}

describe('exportScalarData', () => {
	it('serializes the table exactly as QueryTable prepares it', () => {
		const data = makeResponse([
			{
				queryName: 'A',
				columns: [
					{ name: 'service.name', id: 'service.name', isValueColumn: false },
					{ name: 'count()', id: 'A', isValueColumn: true },
				],
				rows: [
					{ 'service.name': 'frontend', A: 120 },
					{ 'service.name': 'cart', A: 80 },
				],
			},
		]);

		const table = exportScalarData({ data, query });

		// group + aggregation columns, raw values, on-screen order — inherited
		// 1:1 from createTableColumnsFromQuery (the renderer's own preparer)
		expect(table).toStrictEqual({
			headers: ['service.name', 'count()'],
			rows: [
				['frontend', 120],
				['cart', 80],
			],
		});
	});

	it('returns an empty table for an empty response', () => {
		const table = exportScalarData({
			data: makeResponse([]),
			query,
		});

		expect(table.rows).toStrictEqual([]);
	});
});
