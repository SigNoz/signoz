import { getLegend } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { QueryData } from 'types/api/widgets/getQuery';
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

	it('should return alias when single query with multiple aggregations and no group by', () => {
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
							{ expression: "sum(bytes) as 'total'" },
							{ expression: 'count()' },
						],
						groupBy: [],
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe('total');
	});

	it("should return '<alias>-<label>' when multiple queries with group by", () => {
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
					{
						...mockQuery.builder.queryData[0],
						queryName: 'B',
						dataSource: DataSource.LOGS,
						aggregations: [{ expression: 'count()' }],
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe(`sum_b-${MOCK_LABEL_NAME}`);
	});

	it('should return label according to the index of the query', () => {
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
							{ expression: "sum(bytes) as 'sum_a'" },
							{ expression: 'count()' },
						],
						groupBy: [
							{ key: 'serviceName', dataType: DataTypes.String, type: 'resource' },
						],
					},
					{
						...mockQuery.builder.queryData[0],
						queryName: 'B',
						dataSource: DataSource.LOGS,
						aggregations: [{ expression: 'count()' }],
					},
				],
			},
		});

		const legendsData = getLegend(
			{
				...mockQueryData,
				metaData: {
					...mockQueryData.metaData,
					index: 1,
				},
			} as QueryData,
			payloadQuery,
			MOCK_LABEL_NAME,
		);
		expect(legendsData).toBe(`count()-${MOCK_LABEL_NAME}`);
	});

	it('should handle trace operator with multiple queries and group by', () => {
		const payloadQuery = getMockQuery({
			...mockQuery,
			builder: {
				...mockQuery.builder,
				queryData: [
					{
						...mockQuery.builder.queryData[0],
						queryName: 'A',
						dataSource: DataSource.TRACES,
						aggregations: [{ expression: 'count()' }],
					},
				],
				queryTraceOperator: [
					{
						...mockQuery.builder.queryData[0],
						queryName: mockQueryData.queryName,
						dataSource: DataSource.TRACES,
						aggregations: [
							{ expression: "count() as 'total_count' avg(duration_nano)" },
						],
						groupBy: [
							{ key: 'service.name', dataType: DataTypes.String, type: 'resource' },
						],
						expression: 'A',
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe(`total_count-${MOCK_LABEL_NAME}`);
	});

	it('should handle single trace operator query with group by', () => {
		const payloadQuery = getMockQuery({
			...mockQuery,
			builder: {
				...mockQuery.builder,
				queryData: [],
				queryTraceOperator: [
					{
						...mockQuery.builder.queryData[0],
						queryName: mockQueryData.queryName,
						dataSource: DataSource.TRACES,
						aggregations: [{ expression: "count() as 'total' avg(duration_nano)" }],
						groupBy: [
							{ key: 'service.name', dataType: DataTypes.String, type: 'resource' },
						],
						expression: 'A && B',
					},
				],
			},
		});

		const legendsData = getLegend(mockQueryData, payloadQuery, MOCK_LABEL_NAME);
		expect(legendsData).toBe(`total-${MOCK_LABEL_NAME}`);
	});
});
