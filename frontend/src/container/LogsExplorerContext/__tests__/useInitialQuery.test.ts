import { renderHook } from '@testing-library/react';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import {
	DataSource,
	QueryBuilderContextType,
	ReduceOperators,
} from 'types/common/queryBuilder';

import useInitialQuery from '../useInitialQuery';

// Mock the queryBuilder hook
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

// Mock the convertFiltersToExpression utility
jest.mock('components/QueryBuilderV2/utils', () => ({
	convertFiltersToExpression: jest.fn(),
}));

// Mock uuid for consistent testing
jest.mock('uuid', () => ({
	v4: jest.fn(() => 'test-uuid'),
}));

// Type the mocked functions
const mockedUseQueryBuilder = jest.mocked(useQueryBuilder);
const mockedConvertFiltersToExpression = jest.mocked(
	convertFiltersToExpression,
);

describe('useInitialQuery - Priority-Based Resource Filtering', () => {
	const mockUpdateAllQueriesOperators = jest.fn();
	const mockBaseQuery: Query = {
		id: 'test-query',
		queryType: EQueryType.QUERY_BUILDER,
		builder: {
			queryData: [
				{
					dataSource: DataSource.LOGS,
					aggregateOperator: '',
					aggregateAttribute: {
						key: '',
						dataType: DataTypes.String,
						type: '',
					},
					timeAggregation: '',
					spaceAggregation: '',
					functions: [],
					filters: {
						items: [],
						op: 'AND',
					},
					groupBy: [],
					having: [],
					orderBy: [],
					limit: null,
					offset: 0,
					pageSize: 0,
					stepInterval: 60,
					queryName: 'A',
					expression: 'A',
					disabled: false,
					reduceTo: 'avg' as ReduceOperators,
					legend: '',
				},
			],
			queryFormulas: [],
			queryTraceOperator: [],
		},
		clickhouse_sql: [],
		promql: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup useQueryBuilder mock - only mock what we need
		mockedUseQueryBuilder.mockReturnValue(({
			updateAllQueriesOperators: mockUpdateAllQueriesOperators,
		} as Partial<QueryBuilderContextType>) as QueryBuilderContextType);

		// Setup the mock to return base query
		mockUpdateAllQueriesOperators.mockReturnValue(mockBaseQuery);

		// Setup convertFiltersToExpression mock
		mockedConvertFiltersToExpression.mockReturnValue({
			expression: 'test-expression',
		});
	});

	// Helper function to create test log with resources
	const createTestLog = (resources: Record<string, string>): ILog => ({
		date: '2023-10-20',
		timestamp: 1697788800000,
		id: 'test-log-id',
		traceId: 'test-trace-id',
		spanID: 'test-span-id',
		span_id: 'test-span-id',
		traceFlags: 0,
		severityText: 'INFO',
		severityNumber: 9,
		body: 'Test log message',
		resources_string: resources as Record<string, never>,
		scope_string: {},
		attributesString: {},
		attributes_string: {},
		attributesInt: {},
		attributesFloat: {},
		severity_text: 'INFO',
		severity_number: 9,
	});

	// Helper function to assert that specific keys are NOT present in filter items
	const assertKeysNotPresent = (
		items: TagFilterItem[],
		excludedKeys: string[],
	): void => {
		excludedKeys.forEach((key) => {
			const found = items.find((item) => item.key?.key === key);
			expect(found).toBeUndefined();
		});
	};

	describe('K8s Environment Context Flow', () => {
		it('should include service.name and k8s.pod.name when user opens log context from Kubernetes pod', () => {
			// Log from k8s pod with multiple resource attributes
			const testLog = createTestLog({
				'service.name': 'frontend-service',
				'deployment.environment': 'production',
				'k8s.pod.name': 'frontend-pod-abc123',
				'k8s.pod.uid': 'pod-uid-xyz789',
				'k8s.deployment.name': 'frontend-deployment',
				'host.name': 'worker-node-1',
				'container.id': 'container-abc123',
				'random.attribute': 'should-be-filtered-out',
			});

			// User opens log context (hook executes)
			const { result } = renderHook(() => useInitialQuery(testLog));

			// Query includes only service.name + first k8s priority item
			const generatedQuery = result.current;
			expect(generatedQuery).toBeDefined();

			// Verify that updateAllQueriesOperators was called with correct params
			expect(mockUpdateAllQueriesOperators).toHaveBeenCalledWith(
				expect.any(Object), // initialQueriesMap.logs
				'list', // PANEL_TYPES.LIST
				DataSource.LOGS,
			);

			// Verify convertFiltersToExpression was called
			expect(mockedConvertFiltersToExpression).toHaveBeenCalledWith(
				expect.objectContaining({
					items: expect.arrayContaining([
						expect.objectContaining({
							// eslint-disable-next-line sonarjs/no-duplicate-string
							key: expect.objectContaining({ key: 'service.name' }),
							value: 'frontend-service',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'deployment.environment' }),
							value: 'production',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'k8s.pod.uid' }), // First priority k8s item
							value: 'pod-uid-xyz789',
						}),
					]),
				}),
			);

			// Verify exact count of filter items (should be exactly 3)
			const calledWith = mockedConvertFiltersToExpression.mock.calls[0][0];
			expect(calledWith.items).toHaveLength(3);

			// Verify specific unwanted keys are excluded
			assertKeysNotPresent(calledWith.items, [
				'k8s.pod.name', // Other k8s attributes should be excluded
				'k8s.deployment.name',
				'host.name', // Lower priority attributes should be excluded
				'container.id',
				'random.attribute', // Non-matching attributes should be excluded
			]);

			// Verify exact call counts to catch unintended multiple invocations
			expect(mockedConvertFiltersToExpression).toHaveBeenCalledTimes(1);
			expect(mockUpdateAllQueriesOperators).toHaveBeenCalledTimes(1);
		});
	});

	describe('Cloud Environment Flow', () => {
		it('should include service.name and cloud.resource_id when user opens log context from cloud service without k8s', () => {
			// Log from cloud service (no k8s attributes)
			const testLog = createTestLog({
				'service.name': 'api-gateway',
				env: 'staging',
				'cloud.resource_id': 'i-0abcdef1234567890',
				'cloud.provider': 'aws',
				'cloud.region': 'us-east-1',
				'host.name': 'ip-10-0-1-100',
				'host.id': 'host-xyz123',
				'unnecessary.tag': 'filtered-out',
			});

			// User opens log context (hook executes)
			const { result } = renderHook(() => useInitialQuery(testLog));

			// Query includes service + env + first cloud priority item (skips host due to priority)
			const generatedQuery = result.current;
			expect(generatedQuery).toBeDefined();

			expect(mockedConvertFiltersToExpression).toHaveBeenCalledWith(
				expect.objectContaining({
					items: expect.arrayContaining([
						expect.objectContaining({
							key: expect.objectContaining({ key: 'service.name' }),
							value: 'api-gateway',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'env' }),
							value: 'staging',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'cloud.resource_id' }), // First priority cloud item
							value: 'i-0abcdef1234567890',
						}),
					]),
				}),
			);

			// Verify exact count of filter items (should be exactly 3)
			const calledWith = mockedConvertFiltersToExpression.mock.calls[0][0];
			expect(calledWith.items).toHaveLength(3);

			// Verify host attributes are NOT included due to lower priority
			const hostItems = calledWith.items.filter((item: TagFilterItem) =>
				item.key?.key?.startsWith('host.'),
			);
			expect(hostItems).toHaveLength(0);

			// Verify specific unwanted keys are excluded
			assertKeysNotPresent(calledWith.items, [
				'cloud.provider',
				'cloud.region',
				'host.name',
				'host.id',
				'unnecessary.tag',
			]);

			// Verify exact call counts to catch unintended multiple invocations
			expect(mockedConvertFiltersToExpression).toHaveBeenCalledTimes(1);
			expect(mockUpdateAllQueriesOperators).toHaveBeenCalledTimes(1);
		});
	});

	describe('Fallback Environment Flow', () => {
		it('should include service.name and deployment.name when user opens log context from basic deployment without priority attributes', () => {
			// Log from basic deployment (no k8s, cloud, host, or container)
			const testLog = createTestLog({
				'service.name': 'legacy-app',
				'deployment.environment': 'production',
				'deployment.name': 'legacy-deployment',
				'file.path': '/var/log/app.log',
				'random.key': 'ignored',
				'another.attribute': 'also-ignored',
			});

			// User opens log context (hook executes)
			const { result } = renderHook(() => useInitialQuery(testLog));

			// Query includes service + environment + fallback regex matches
			const generatedQuery = result.current;
			expect(generatedQuery).toBeDefined();

			expect(mockedConvertFiltersToExpression).toHaveBeenCalledWith(
				expect.objectContaining({
					items: expect.arrayContaining([
						expect.objectContaining({
							key: expect.objectContaining({ key: 'service.name' }),
							value: 'legacy-app',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'deployment.environment' }),
							value: 'production',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'deployment.name' }), // Fallback regex match
							value: 'legacy-deployment',
						}),
						expect.objectContaining({
							key: expect.objectContaining({ key: 'file.path' }), // Fallback regex match
							value: '/var/log/app.log',
						}),
					]),
				}),
			);

			// Verify exact count of filter items (should be exactly 4)
			const calledWith = mockedConvertFiltersToExpression.mock.calls[0][0];
			expect(calledWith.items).toHaveLength(4);

			// Verify specific unwanted keys are excluded
			assertKeysNotPresent(calledWith.items, ['random.key', 'another.attribute']);

			// Verify exact call counts to catch unintended multiple invocations
			expect(mockedConvertFiltersToExpression).toHaveBeenCalledTimes(1);
			expect(mockUpdateAllQueriesOperators).toHaveBeenCalledTimes(1);
		});
	});

	describe('Service-Only Minimal Flow', () => {
		it('should include at least service.name when user opens log context with minimal attributes', () => {
			// Log with only service and unmatched attributes
			const testLog = createTestLog({
				'service.name': 'minimal-service',
				'custom.tag': 'business-value',
				'user.id': 'user-123',
				'request.id': 'req-abc',
			});

			// User opens log context (hook executes)
			const { result } = renderHook(() => useInitialQuery(testLog));

			// Query includes at least service.name (essential for filtering)
			const generatedQuery = result.current;
			expect(generatedQuery).toBeDefined();

			expect(mockedConvertFiltersToExpression).toHaveBeenCalledWith(
				expect.objectContaining({
					items: expect.arrayContaining([
						expect.objectContaining({
							key: expect.objectContaining({ key: 'service.name' }),
							value: 'minimal-service',
						}),
					]),
				}),
			);

			// Verify exact count of filter items (should be exactly 1)
			const calledWith = mockedConvertFiltersToExpression.mock.calls[0][0];
			expect(calledWith.items).toHaveLength(1);

			// Verify that service.name is included
			const serviceItems = calledWith.items.filter(
				(item: TagFilterItem) => item.key?.key === 'service.name',
			);
			expect(serviceItems.length).toBe(1);

			// Verify no priority items (k8s, cloud, host, container) are included
			const priorityItems = calledWith.items.filter(
				(item: TagFilterItem) =>
					item.key?.key &&
					(item.key.key.startsWith('k8s.') ||
						item.key.key.startsWith('cloud.') ||
						item.key.key.startsWith('host.') ||
						item.key.key.startsWith('container.')),
			);
			expect(priorityItems).toHaveLength(0);

			// Verify specific unwanted keys are excluded
			assertKeysNotPresent(calledWith.items, [
				'custom.tag', // Non-matching attributes should be excluded
				'user.id',
				'request.id',
			]);

			// Verify exact call counts to catch unintended multiple invocations
			expect(mockedConvertFiltersToExpression).toHaveBeenCalledTimes(1);
			expect(mockUpdateAllQueriesOperators).toHaveBeenCalledTimes(1);
		});
	});
});
