import { renderHook } from '@testing-library/react';
import { useGetMetricUnits } from 'container/MetricsExplorer/Explorer/utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import { useQueryBuilder } from './queryBuilder/useQueryBuilder';
import useGetYAxisUnit from './useGetYAxisUnit';

jest.mock('./queryBuilder/useQueryBuilder');
jest.mock('container/MetricsExplorer/Explorer/utils', () => ({
	useGetMetricUnits: jest.fn(),
}));

const mockUseQueryBuilder = useQueryBuilder as jest.MockedFunction<
	typeof useQueryBuilder
>;
const mockUseGetMetricUnits = useGetMetricUnits as jest.MockedFunction<
	typeof useGetMetricUnits
>;

function createMockCurrentQuery(
	queryType: EQueryType,
	queryData: Query['builder']['queryData'] = [],
): Query {
	return {
		queryType,
		promql: [],
		builder: {
			queryData,
			queryFormulas: [],
			queryTraceOperator: [],
		},
		clickhouse_sql: [],
		id: 'test-id',
	};
}

describe('useGetYAxisUnit', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return undefined yAxisUnit and not call useGetMetricUnits when currentQuery is null', async () => {
		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: undefined,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);
		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetricUnits).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when queryType is PROM', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.PROM);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(mockUseGetMetricUnits).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when queryType is CLICKHOUSE', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.CLICKHOUSE);
		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);
		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetricUnits).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when dataSource is TRACES', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.TRACES,
				aggregateAttribute: { key: 'trace_metric' },
			} as Query['builder']['queryData'][0],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);
		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetricUnits).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when dataSource is LOGS', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.LOGS,
				aggregateAttribute: { key: 'log_metric' },
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);
		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetricUnits).toHaveBeenCalledWith([], false);
	});

	it('should extract all metric names from queryData', () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric1' },
				queryName: 'query1',
			} as Query['builder']['queryData'][number],
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric2' },
				queryName: 'query2',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);
		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		renderHook(() => useGetYAxisUnit());

		expect(mockUseGetMetricUnits).toHaveBeenCalledWith(
			['metric1', 'metric2'],
			true,
		);
	});

	it('should extract metric name for the selected query only', () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric1' },
				queryName: 'query1',
			} as Query['builder']['queryData'][number],
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric2' },
				queryName: 'query2',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		renderHook(() => useGetYAxisUnit('query2'));

		expect(mockUseGetMetricUnits).toHaveBeenCalledWith(['metric2'], true);
	});

	it('should return undefined when units array is empty', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric1' },
				queryName: 'query1',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: [],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
	});

	it('should return the unit when there is a single non-empty unit', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric1' },
				queryName: 'query1',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: ['bytes'],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBe('bytes');
	});

	it('should return undefined when there is a single empty unit', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric1' },
				queryName: 'query1',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: [''],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
	});

	it('should return the unit when all units are the same and non-empty', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric1' },
				queryName: 'query1',
			} as Query['builder']['queryData'][number],
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric2' },
				queryName: 'query2',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: ['bytes', 'bytes'],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBe('bytes');
	});

	it('should return undefined when units are different', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric2' },
				queryName: 'query2',
			} as Query['builder']['queryData'][number],
			{
				dataSource: DataSource.METRICS,
				aggregateAttribute: { key: 'metric3' },
				queryName: 'query3',
			} as Query['builder']['queryData'][number],
		]);

		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		mockUseGetMetricUnits.mockReturnValue({
			units: ['bytes', 'seconds'],
			isLoading: false,
			isError: false,
			metrics: [],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
	});
});
