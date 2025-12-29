import { renderHook } from '@testing-library/react';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';
import { useGetMetrics } from 'container/MetricsExplorer/Explorer/utils';
import { MetricMetadata } from 'types/api/metricsExplorer/v2/getMetricMetadata';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, QueryBuilderContextType } from 'types/common/queryBuilder';

import { useQueryBuilder } from './queryBuilder/useQueryBuilder';
import useGetYAxisUnit from './useGetYAxisUnit';

jest.mock('./queryBuilder/useQueryBuilder');
jest.mock('container/MetricsExplorer/Explorer/utils', () => ({
	...jest.requireActual('container/MetricsExplorer/Explorer/utils'),
	useGetMetrics: jest.fn(),
}));

const mockUseQueryBuilder = useQueryBuilder as jest.MockedFunction<
	typeof useQueryBuilder
>;
const mockUseGetMetrics = useGetMetrics as jest.MockedFunction<
	typeof useGetMetrics
>;

const MOCK_METRIC_1 = {
	unit: UniversalYAxisUnit.BYTES,
} as MetricMetadata;
const MOCK_METRIC_2 = {
	unit: UniversalYAxisUnit.SECONDS,
} as MetricMetadata;
const MOCK_METRIC_3 = {
	unit: '',
} as MetricMetadata;

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
		mockUseGetMetrics.mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [],
		});
		mockUseQueryBuilder.mockReturnValue(({
			currentQuery: undefined,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);
	});

	it('should return undefined yAxisUnit and not call useGetMetrics when currentQuery is null', async () => {
		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetrics).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when queryType is PROM', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.PROM);
		mockUseQueryBuilder.mockReturnValueOnce(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(mockUseGetMetrics).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when queryType is CLICKHOUSE', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.CLICKHOUSE);
		mockUseQueryBuilder.mockReturnValueOnce(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetrics).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when dataSource is TRACES', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.TRACES,
				aggregateAttribute: { key: 'trace_metric' },
			} as Query['builder']['queryData'][0],
		]);
		mockUseQueryBuilder.mockReturnValueOnce(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetrics).toHaveBeenCalledWith([], false);
	});

	it('should return undefined yAxisUnit when dataSource is LOGS', async () => {
		const mockCurrentQuery = createMockCurrentQuery(EQueryType.QUERY_BUILDER, [
			{
				dataSource: DataSource.LOGS,
				aggregateAttribute: { key: 'log_metric' },
			} as Query['builder']['queryData'][number],
		]);
		mockUseQueryBuilder.mockReturnValueOnce(({
			currentQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(mockUseGetMetrics).toHaveBeenCalledWith([], false);
	});

	it('should extract all metric names from queryData when no selected query name is provided', () => {
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

		mockUseQueryBuilder.mockReturnValueOnce(({
			stagedQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		renderHook(() => useGetYAxisUnit());

		expect(mockUseGetMetrics).toHaveBeenCalledWith(['metric1', 'metric2'], true);
	});

	it('should extract metric name for the selected query only when one is provided', () => {
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
		mockUseQueryBuilder.mockReturnValueOnce(({
			stagedQuery: mockCurrentQuery,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		renderHook(() => useGetYAxisUnit('query2'));

		expect(mockUseGetMetrics).toHaveBeenCalledWith(['metric2'], true);
	});

	it('should return the unit when there is a single metric with a non-empty unit', async () => {
		mockUseGetMetrics.mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_1],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBe(UniversalYAxisUnit.BYTES);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('should return undefined when there is a single metric with no unit', async () => {
		mockUseGetMetrics.mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_3],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('should return the unit when all metrics have the same non-empty unit', async () => {
		mockUseGetMetrics.mockReturnValue({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_1, MOCK_METRIC_1],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBe(UniversalYAxisUnit.BYTES);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});

	it('should return undefined when metrics have different units', async () => {
		mockUseGetMetrics.mockReturnValueOnce({
			isLoading: false,
			isError: false,
			metrics: [MOCK_METRIC_1, MOCK_METRIC_2],
		});

		const { result } = renderHook(() => useGetYAxisUnit());

		expect(result.current.yAxisUnit).toBeUndefined();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});
});
