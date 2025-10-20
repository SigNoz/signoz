import { getLegend } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { getMockQuery, getMockQueryData } from './testUtils';

const mockQueryData = getMockQueryData();
const mockQuery = getMockQuery();
const MOCK_LABEL_NAME = 'mock-label-name';

describe('getLegend', () => {
	it('should directly return the label name for clickhouse query', () => {
		const legendsData = getLegend(
			mockQueryData,
			getMockQuery({
				queryType: EQueryType.CLICKHOUSE,
			}),
			MOCK_LABEL_NAME,
		);
		expect(legendsData).toBeDefined();
		expect(legendsData).toBe(MOCK_LABEL_NAME);
	});

	it('should directly return the label name for promql query', () => {
		const legendsData = getLegend(
			mockQueryData,
			getMockQuery({
				queryType: EQueryType.PROM,
			}),
			MOCK_LABEL_NAME,
		);
		expect(legendsData).toBeDefined();
		expect(legendsData).toBe(MOCK_LABEL_NAME);
	});

	it('should return alias when single builder query with single aggregation and alias (logs)', () => {
		const payloadQuery = getMockQuery({
			...mockQuery,
			builder: {
				...mockQuery.builder,
				queryData: [
					{
						...mockQuery.builder.queryData[0],
						queryName: mockQueryData.queryName,
						dataSource: DataSource.LOGS,
						aggregations: [{ expression: "sum(bytes) as 'alias_sum'" }],
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe('alias_sum');
	});

	it('should return legend when single builder query with no alias but legend set (builder)', () => {
		const payloadQuery = getMockQuery({
			...mockQuery,
			builder: {
				...mockQuery.builder,
				queryData: [
					{
						...mockQuery.builder.queryData[0],
						queryName: mockQueryData.queryName,
						dataSource: DataSource.LOGS,
						aggregations: [{ expression: 'count()' }],
						legend: 'custom-legend',
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe('custom-legend');
	});

	it('should return label when grouped by with single aggregation (builder)', () => {
		const payloadQuery = getMockQuery({
			...mockQuery,
			builder: {
				...mockQuery.builder,
				queryData: [
					{
						...mockQuery.builder.queryData[0],
						queryName: mockQueryData.queryName,
						dataSource: DataSource.LOGS,
						aggregations: [{ expression: 'count()' }],
						groupBy: [
							{ key: 'serviceName', dataType: DataTypes.String, type: 'resource' },
						],
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe(MOCK_LABEL_NAME);
	});

	it("should return '<alias>-<label>' when grouped by with multiple aggregations (builder)", () => {
		const payloadQuery = getMockQuery({
			...mockQuery,
			builder: {
				...mockQuery.builder,
				queryData: [
					{
						...mockQuery.builder.queryData[0],
						queryName: mockQueryData.queryName,
						dataSource: DataSource.LOGS,
						aggregations: [
							{ expression: "sum(bytes) as 'sum_b'" },
							{ expression: 'count()' },
						],
						groupBy: [
							{ key: 'serviceName', dataType: DataTypes.String, type: 'resource' },
						],
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe(`sum_b-${MOCK_LABEL_NAME}`);
	});

	it('should fallback to label or query name when no alias/expression', () => {
		const legendsData = getLegend(mockQueryData, mockQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe(MOCK_LABEL_NAME);
	});
});
