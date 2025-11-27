/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable import/no-unresolved */
import { negateOperator, OPERATORS } from 'constants/antlrQueryConstants';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { extractQueryPairs } from 'utils/queryContextUtils';

import {
	convertAggregationToExpression,
	convertFiltersToExpression,
	convertFiltersToExpressionWithExistingQuery,
	formatValueForExpression,
	removeKeysFromExpression,
} from '../utils';

describe('convertFiltersToExpression', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should handle empty, null, and undefined inputs', () => {
		// Test null and undefined
		expect(convertFiltersToExpression(null as any)).toEqual({ expression: '' });
		expect(convertFiltersToExpression(undefined as any)).toEqual({
			expression: '',
		});

		// Test empty filters
		expect(convertFiltersToExpression({ items: [], op: 'AND' })).toEqual({
			expression: '',
		});
		expect(
			convertFiltersToExpression({ items: undefined, op: 'AND' } as any),
		).toEqual({ expression: '' });
	});

	it('should convert basic comparison operators with proper value formatting', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'service', type: 'string' },
					op: '=',
					value: 'api-gateway',
				},
				{
					id: '2',
					key: { key: 'status', type: 'string' },
					op: '!=',
					value: 'error',
				},
				{
					id: '3',
					key: { key: 'duration', type: 'number' },
					op: '>',
					value: 100,
				},
				{
					id: '4',
					key: { key: 'count', type: 'number' },
					op: '<=',
					value: 50,
				},
				{
					id: '5',
					key: { key: 'is_active', type: 'boolean' },
					op: '=',
					value: true,
				},
				{
					id: '6',
					key: { key: 'enabled', type: 'boolean' },
					op: '=',
					value: false,
				},
				{
					id: '7',
					key: { key: 'count', type: 'number' },
					op: '=',
					value: 0,
				},
				{
					id: '7',
					key: { key: 'regex', type: 'string' },
					op: 'regex',
					value: '.*',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"service = 'api-gateway' AND status != 'error' AND duration > 100 AND count <= 50 AND is_active = true AND enabled = false AND count = 0 AND regex REGEXP '.*'",
		});
	});

	it('should handle string value formatting and escaping', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'message', type: 'string' },
					op: '=',
					value: "user's data",
				},
				{
					id: '2',
					key: { key: 'description', type: 'string' },
					op: '=',
					value: '',
				},
				{
					id: '3',
					key: { key: 'path', type: 'string' },
					op: '=',
					value: '/api/v1/users',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"message = 'user\\'s data' AND description = '' AND path = '/api/v1/users'",
		});
	});

	it('should handle IN operator with various value types and array formatting', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'service', type: 'string' },
					op: 'IN',
					value: ['api-gateway', 'user-service', 'auth-service'],
				},
				{
					id: '2',
					key: { key: 'status', type: 'string' },
					op: 'IN',
					value: 'success', // Single value should be converted to array
				},
				{
					id: '3',
					key: { key: 'tags', type: 'string' },
					op: 'IN',
					value: [], // Empty array
				},
				{
					id: '4',
					key: { key: 'name', type: 'string' },
					op: 'IN',
					value: ["John's", "Mary's", 'Bob'], // Values with quotes
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"service in ['api-gateway', 'user-service', 'auth-service'] AND status in ['success'] AND tags in [] AND name in ['John\\'s', 'Mary\\'s', 'Bob']",
		});
	});

	it('should convert deprecated operators to their modern equivalents', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'service', type: 'string' },
					op: 'nin',
					value: ['api-gateway', 'user-service'],
				},
				{
					id: '2',
					key: { key: 'message', type: 'string' },
					op: 'nlike',
					value: 'error',
				},
				{
					id: '3',
					key: { key: 'path', type: 'string' },
					op: 'nregex',
					value: '/api/.*',
				},
				{
					id: '4',
					key: { key: 'service', type: 'string' },
					op: 'NIN', // Test case insensitivity
					value: ['api-gateway'],
				},
				{
					id: '5',
					key: { key: 'user_id', type: 'string' },
					op: 'nexists',
					value: '',
				},
				{
					id: '6',
					key: { key: 'description', type: 'string' },
					op: 'ncontains',
					value: 'error',
				},
				{
					id: '7',
					key: { key: 'tags', type: 'string' },
					op: 'nhas',
					value: 'production',
				},
				{
					id: '8',
					key: { key: 'labels', type: 'string' },
					op: 'nhasany',
					value: ['env:prod', 'service:api'],
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"service NOT IN ['api-gateway', 'user-service'] AND message NOT LIKE 'error' AND path NOT REGEXP '/api/.*' AND service NOT IN ['api-gateway'] AND user_id NOT EXISTS AND description NOT CONTAINS 'error' AND NOT has(tags, 'production') AND NOT hasAny(labels, ['env:prod', 'service:api'])",
		});
	});

	it('should handle non-value operators and function operators', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'user_id', type: 'string' },
					op: 'EXISTS',
					value: '', // Value should be ignored for EXISTS
				},
				{
					id: '2',
					key: { key: 'user_id', type: 'string' },
					op: 'EXISTS',
					value: 'some-value', // Value should be ignored for EXISTS
				},
				{
					id: '3',
					key: { key: 'tags', type: 'string' },
					op: 'has',
					value: 'production',
				},
				{
					id: '4',
					key: { key: 'tags', type: 'string' },
					op: 'hasAny',
					value: ['production', 'staging'],
				},
				{
					id: '5',
					key: { key: 'tags', type: 'string' },
					op: 'hasAll',
					value: ['production', 'monitoring'],
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"user_id exists AND user_id exists AND has(tags, 'production') AND hasAny(tags, ['production', 'staging']) AND hasAll(tags, ['production', 'monitoring'])",
		});
	});

	it('should filter out invalid filters and handle edge cases', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'service', type: 'string' },
					op: '=',
					value: 'api-gateway',
				},
				{
					id: '2',
					key: undefined, // Invalid filter - should be skipped
					op: '=',
					value: 'error',
				},
				{
					id: '3',
					key: { key: '', type: 'string' }, // Invalid filter with empty key - should be skipped
					op: '=',
					value: 'test',
				},
				{
					id: '4',
					key: { key: 'status', type: 'string' },
					op: ' = ', // Test whitespace handling
					value: 'success',
				},
				{
					id: '5',
					key: { key: 'service', type: 'string' },
					op: 'In', // Test mixed case handling
					value: ['api-gateway'],
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"service = 'api-gateway' AND status = 'success' AND service in ['api-gateway']",
		});
	});

	it('should handle complex mixed operator scenarios with proper joining', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'service', type: 'string' },
					op: 'IN',
					value: ['api-gateway', 'user-service'],
				},
				{
					id: '2',
					key: { key: 'user_id', type: 'string' },
					op: 'EXISTS',
					value: '',
				},
				{
					id: '3',
					key: { key: 'tags', type: 'string' },
					op: 'has',
					value: 'production',
				},
				{
					id: '4',
					key: { key: 'duration', type: 'number' },
					op: '>',
					value: 100,
				},
				{
					id: '5',
					key: { key: 'status', type: 'string' },
					op: 'nin',
					value: ['error', 'timeout'],
				},
				{
					id: '6',
					key: { key: 'method', type: 'string' },
					op: '=',
					value: 'POST',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"service in ['api-gateway', 'user-service'] AND user_id exists AND has(tags, 'production') AND duration > 100 AND status NOT IN ['error', 'timeout'] AND method = 'POST'",
		});
	});

	it('should handle all numeric comparison operators and edge cases', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'count', type: 'number' },
					op: '=',
					value: 0,
				},
				{
					id: '2',
					key: { key: 'score', type: 'number' },
					op: '>',
					value: 100,
				},
				{
					id: '3',
					key: { key: 'limit', type: 'number' },
					op: '>=',
					value: 50,
				},
				{
					id: '4',
					key: { key: 'threshold', type: 'number' },
					op: '<',
					value: 1000,
				},
				{
					id: '5',
					key: { key: 'max_value', type: 'number' },
					op: '<=',
					value: 999,
				},
				{
					id: '6',
					key: { key: 'values', type: 'string' },
					op: 'IN',
					value: ['1', '2', '3', '4', '5'],
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"count = 0 AND score > 100 AND limit >= 50 AND threshold < 1000 AND max_value <= 999 AND values in ['1', '2', '3', '4', '5']",
		});
	});

	it('should handle boolean values and string comparisons with special characters', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'is_active', type: 'boolean' },
					op: '=',
					value: true,
				},
				{
					id: '2',
					key: { key: 'is_deleted', type: 'boolean' },
					op: '=',
					value: false,
				},
				{
					id: '3',
					key: { key: 'email', type: 'string' },
					op: '=',
					value: 'user@example.com',
				},
				{
					id: '4',
					key: { key: 'description', type: 'string' },
					op: '=',
					value: 'Contains "quotes" and \'apostrophes\'',
				},
				{
					id: '5',
					key: { key: 'path', type: 'string' },
					op: '=',
					value: '/api/v1/users/123?filter=true',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"is_active = true AND is_deleted = false AND email = 'user@example.com' AND description = 'Contains \"quotes\" and \\'apostrophes\\'' AND path = '/api/v1/users/123?filter=true'",
		});
	});

	it('should handle all function operators and complex array scenarios', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'tags', type: 'string' },
					op: 'has',
					value: 'production',
				},
				{
					id: '2',
					key: { key: 'labels', type: 'string' },
					op: 'hasAny',
					value: ['env:prod', 'service:api'],
				},
				{
					id: '3',
					key: { key: 'metadata', type: 'string' },
					op: 'hasAll',
					value: ['version:1.0', 'team:backend'],
				},
				{
					id: '4',
					key: { key: 'services', type: 'string' },
					op: 'IN',
					value: ['api-gateway', 'user-service', 'auth-service', 'payment-service'],
				},
				{
					id: '5',
					key: { key: 'excluded_services', type: 'string' },
					op: 'nin',
					value: ['legacy-service', 'deprecated-service'],
				},
				{
					id: '6',
					key: { key: 'status_codes', type: 'string' },
					op: 'IN',
					value: ['200', '201', '400', '500'],
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"has(tags, 'production') AND hasAny(labels, ['env:prod', 'service:api']) AND hasAll(metadata, ['version:1.0', 'team:backend']) AND services in ['api-gateway', 'user-service', 'auth-service', 'payment-service'] AND excluded_services NOT IN ['legacy-service', 'deprecated-service'] AND status_codes in ['200', '201', '400', '500']",
		});
	});

	it('should handle specific deprecated operators: nhas, ncontains, nexists', () => {
		const filters: TagFilter = {
			items: [
				{
					id: '1',
					key: { key: 'user_id', type: 'string' },
					op: 'nexists',
					value: '',
				},
				{
					id: '2',
					key: { key: 'description', type: 'string' },
					op: 'ncontains',
					value: 'error',
				},
				{
					id: '3',
					key: { key: 'tags', type: 'string' },
					op: 'nhas',
					value: 'production',
				},
				{
					id: '4',
					key: { key: 'labels', type: 'string' },
					op: 'nhasany',
					value: ['env:prod', 'service:api'],
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpression(filters);
		expect(result).toEqual({
			expression:
				"user_id NOT EXISTS AND description NOT CONTAINS 'error' AND NOT has(tags, 'production') AND NOT hasAny(labels, ['env:prod', 'service:api'])",
		});
	});

	it('should return filters with new expression when no existing query', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service.name', key: 'service.name', type: 'string' },
					op: OPERATORS['='],
					value: 'test-service',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			undefined,
		);

		expect(result.filters).toEqual(filters);
		expect(result.filter.expression).toBe("service.name = 'test-service'");
	});

	it('should handle empty filters', () => {
		const filters = {
			items: [],
			op: 'AND',
		};

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			undefined,
		);

		expect(result.filters).toEqual(filters);
		expect(result.filter.expression).toBe('');
	});

	it('should handle existing query with matching filters', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service.name', key: 'service.name', type: 'string' },
					op: OPERATORS['='],
					value: 'updated-service',
				},
			],
			op: 'AND',
		};

		const existingQuery = "service.name = 'old-service'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters).toBeDefined();
		expect(result.filter).toBeDefined();
		expect(result.filter.expression).toBe("service.name = 'updated-service'");
		// Ensure parser can parse the existing query
		expect(extractQueryPairs(existingQuery)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: 'service.name',
					operator: '=',
					value: "'old-service'",
				}),
			]),
		);
	});

	it('should handle IN operator with existing query', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service.name', key: 'service.name', type: 'string' },
					op: OPERATORS.IN,
					value: ['service1', 'service2'],
				},
			],
			op: 'AND',
		};

		const existingQuery = "service.name IN ['old-service']";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters).toBeDefined();
		expect(result.filter).toBeDefined();
		expect(result.filter.expression).toBe(
			"service.name IN ['service1', 'service2']",
		);
	});

	it('should handle IN operator conversion from equals', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service.name', key: 'service.name', type: 'string' },
					op: OPERATORS.IN,
					value: ['service1', 'service2'],
				},
			],
			op: 'AND',
		};

		const existingQuery = "service.name = 'old-service'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filter.expression).toBe(
			"service.name IN ['service1', 'service2'] ",
		);
	});

	it('should handle NOT IN operator conversion from not equals', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service.name', key: 'service.name', type: 'string' },
					op: negateOperator(OPERATORS.IN),
					value: ['service1', 'service2'],
				},
			],
			op: 'AND',
		};

		const existingQuery = "service.name != 'old-service'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filter.expression).toBe(
			"service.name NOT IN ['service1', 'service2'] ",
		);
	});

	it('should add new filters when they do not exist in existing query', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'new.key', key: 'new.key', type: 'string' },
					op: OPERATORS['='],
					value: 'new-value',
				},
			],
			op: 'AND',
		};

		const existingQuery = "service.name = 'old-service'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(2); // Original + new filter
		expect(result.filter.expression).toBe(
			"service.name = 'old-service' new.key = 'new-value'",
		);
	});

	it('should handle simple value replacement', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'status', key: 'status', type: 'string' },
					op: OPERATORS['='],
					value: 'error',
				},
			],
			op: 'AND',
		};

		const existingQuery = "status = 'success'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filter.expression).toBe("status = 'error'");
	});

	it('should handle filters with no key gracefully', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: undefined,
					op: OPERATORS['='],
					value: 'test-value',
				},
			],
			op: 'AND',
		};

		const existingQuery = "service.name = 'old-service'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(2);
		expect(result.filter.expression).toBe("service.name = 'old-service'");
	});
});

describe('convertAggregationToExpression', () => {
	const mockAttribute: BaseAutocompleteData = {
		id: 'test-id',
		key: 'test_metric',
		type: 'string',
		dataType: DataTypes.String,
	};

	it('should return undefined when no aggregateOperator is provided', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: '',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.METRICS,
		});
		expect(result).toBeUndefined();
	});

	it('should convert metrics aggregation with required temporality field', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'sum',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.METRICS,
			timeAggregation: 'avg',
			spaceAggregation: 'max',
			alias: 'test_alias',
			reduceTo: 'sum',
			temporality: 'delta',
		});

		expect(result).toEqual([
			{
				metricName: 'test_metric',
				timeAggregation: 'avg',
				spaceAggregation: 'max',
				reduceTo: 'sum',
				temporality: 'delta',
			},
		]);
	});

	it('should handle noop operators by converting to count', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'noop',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.METRICS,
			timeAggregation: 'noop',
			spaceAggregation: 'noop',
		});

		expect(result).toEqual([
			{
				metricName: 'test_metric',
				timeAggregation: 'count',
				spaceAggregation: 'count',
			},
		]);
	});

	it('should handle missing attribute key gracefully', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'sum',
			aggregateAttribute: { ...mockAttribute, key: '' },
			dataSource: DataSource.METRICS,
		});

		expect(result).toEqual([
			{
				metricName: '',
				timeAggregation: 'sum',
				spaceAggregation: 'sum',
			},
		]);
	});

	it('should convert traces aggregation to expression format', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'count',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.TRACES,
			alias: 'trace_alias',
		});

		expect(result).toEqual([
			{
				expression: 'count(test_metric)',
				alias: 'trace_alias',
			},
		]);
	});

	it('should convert logs aggregation to expression format', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'avg',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.LOGS,
			alias: 'log_alias',
		});

		expect(result).toEqual([
			{
				expression: 'avg(test_metric)',
				alias: 'log_alias',
			},
		]);
	});

	it('should handle aggregation without attribute key for traces/logs', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'count',
			aggregateAttribute: { ...mockAttribute, key: '' },
			dataSource: DataSource.TRACES,
		});

		expect(result).toEqual([
			{
				expression: 'count()',
			},
		]);
	});

	it('should handle missing alias for traces/logs', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'sum',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.LOGS,
		});

		expect(result).toEqual([
			{
				expression: 'sum(test_metric)',
			},
		]);
	});

	it('should use aggregateOperator as fallback for time and space aggregation', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'max',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.METRICS,
		});

		expect(result).toEqual([
			{
				metricName: 'test_metric',
				timeAggregation: 'max',
				spaceAggregation: 'max',
			},
		]);
	});

	it('should handle undefined aggregateAttribute parameter with metrics', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'sum',
			aggregateAttribute: mockAttribute,
			dataSource: DataSource.METRICS,
		});

		expect(result).toEqual([
			{
				metricName: 'test_metric',
				timeAggregation: 'sum',
				spaceAggregation: 'sum',
				reduceTo: undefined,
				temporality: undefined,
			},
		]);
	});

	it('should handle undefined aggregateAttribute parameter with traces', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'noop',
			aggregateAttribute: (undefined as unknown) as BaseAutocompleteData,
			dataSource: DataSource.TRACES,
		});

		expect(result).toEqual([
			{
				expression: 'count()',
			},
		]);
	});

	it('should handle undefined aggregateAttribute parameter with logs', () => {
		const result = convertAggregationToExpression({
			aggregateOperator: 'noop',
			aggregateAttribute: (undefined as unknown) as BaseAutocompleteData,
			dataSource: DataSource.LOGS,
		});

		expect(result).toEqual([
			{
				expression: 'count()',
			},
		]);
	});
});

describe('removeKeysFromExpression', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Backward compatibility (removeOnlyVariableExpressions = false)', () => {
		it('should remove simple key-value pair from expression', () => {
			const expression = "service.name = 'api-gateway' AND status = 'success'";
			const result = removeKeysFromExpression(expression, ['service.name']);

			expect(result).toBe("status = 'success'");
		});

		it('should remove multiple keys from expression', () => {
			const expression =
				"service.name = 'api-gateway' AND status = 'success' AND region = 'us-east-1'";
			const result = removeKeysFromExpression(expression, [
				'service.name',
				'status',
			]);

			expect(result).toBe("region = 'us-east-1'");
		});

		it('should handle empty expression', () => {
			const result = removeKeysFromExpression('', ['service.name']);
			expect(result).toBe('');
		});

		it('should handle empty keys array', () => {
			const expression = "service.name = 'api-gateway'";
			const result = removeKeysFromExpression(expression, []);
			expect(result).toBe(expression);
		});

		it('should handle key not found in expression', () => {
			const expression = "service.name = 'api-gateway'";
			const result = removeKeysFromExpression(expression, ['nonexistent.key']);
			expect(result).toBe(expression);
		});

		// todo: Sagar check this - this is expected or not
		// it('should remove last occurrence when multiple occurrences exist', () => {
		// 	// This tests the original behavior - should remove the last occurrence
		// 	const expression =
		// 		"deployment.environment = $deployment.environment deployment.environment = 'default'";
		// 	const result = removeKeysFromExpression(
		// 		expression,
		// 		['deployment.environment'],
		// 		false,
		// 	);

		// 	// Should remove the literal value (last occurrence), leaving the variable
		// 	expect(result).toBe('deployment.environment = $deployment.environment');
		// });
	});

	describe('Variable expression targeting (removeOnlyVariableExpressions = true)', () => {
		it('should remove only variable expressions (values starting with $)', () => {
			const expression =
				"deployment.environment = $deployment.environment deployment.environment = 'default'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			// Should remove the variable expression, leaving the literal value
			expect(result).toBe("deployment.environment = 'default'");
		});

		it('should not remove literal values when targeting variable expressions', () => {
			const expression = "service.name = 'api-gateway' AND status = 'success'";
			const result = removeKeysFromExpression(expression, ['service.name'], true);

			// Should not remove anything since no variable expressions exist
			expect(result).toBe("service.name = 'api-gateway' AND status = 'success'");
		});

		it('should remove multiple variable expressions', () => {
			const expression =
				"deployment.environment = $deployment.environment service.name = $service.name status = 'success'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment', 'service.name'],
				true,
			);

			expect(result).toBe("status = 'success'");
		});

		it('should handle mixed variable and literal expressions correctly', () => {
			const expression =
				"deployment.environment = $deployment.environment service.name = 'api-gateway' region = $region";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment', 'region'],
				true,
			);

			// Should only remove variable expressions, leaving literal value
			expect(result).toBe("service.name = 'api-gateway'");
		});

		it('should handle complex expressions with operators', () => {
			const expression =
				"deployment.environment IN [$env1, $env2] AND service.name = 'api-gateway'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			expect(result).toBe("service.name = 'api-gateway'");
		});
	});

	describe('Edge cases and robustness', () => {
		it('should handle case insensitive key matching', () => {
			const expression = 'Service.Name = $Service.Name';
			const result = removeKeysFromExpression(expression, ['service.name'], true);

			expect(result).toBe('');
		});

		it('should clean up trailing AND/OR operators', () => {
			const expression =
				"deployment.environment = $deployment.environment AND service.name = 'api-gateway'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			expect(result).toBe("service.name = 'api-gateway'");
		});

		it('should clean up leading AND/OR operators', () => {
			const expression =
				"service.name = 'api-gateway' AND deployment.environment = $deployment.environment";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			expect(result).toBe("service.name = 'api-gateway'");
		});

		it('should handle expressions with only variable assignments', () => {
			const expression = 'deployment.environment = $deployment.environment';
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			expect(result).toBe('');
		});

		it('should handle whitespace around operators', () => {
			const expression =
				"deployment.environment  =  $deployment.environment  AND  service.name  =  'api-gateway'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			expect(result.trim()).toBe("service.name  =  'api-gateway'");
		});
	});

	describe('Real-world scenarios', () => {
		it('should handle multiple variable instances of same key', () => {
			const expression =
				"deployment.environment = $env1 deployment.environment = $env2 deployment.environment = 'default'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			// Should remove one occurence as this case in itself is invalid to have multiple variable expressions for the same key
			expect(result).toBe(
				"deployment.environment = $env1 deployment.environment = 'default'",
			);
		});

		it('should handle OR operators in expressions', () => {
			const expression =
				"deployment.environment = $deployment.environment OR service.name = 'api-gateway'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			expect(result).toBe("service.name = 'api-gateway'");
		});

		it('should maintain expression validity after removal', () => {
			const expression =
				"deployment.environment = $deployment.environment AND service.name = 'api-gateway' AND status = 'success'";
			const result = removeKeysFromExpression(
				expression,
				['deployment.environment'],
				true,
			);

			// Should maintain valid AND structure
			expect(result).toBe("service.name = 'api-gateway' AND status = 'success'");

			// Verify the result can be parsed by extractQueryPairs
			const pairs = extractQueryPairs(result);
			expect(pairs).toHaveLength(2);
		});
	});
});

describe('formatValueForExpression', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Variable values', () => {
		it('should return variable values as-is', () => {
			expect(formatValueForExpression('$variable')).toBe('$variable');
			expect(formatValueForExpression('$env')).toBe('$env');
			expect(formatValueForExpression(' $variable ')).toBe(' $variable ');
		});

		it('should return variable arrays as-is', () => {
			expect(formatValueForExpression(['$var1', '$var2'])).toBe('$var1,$var2');
		});
	});

	describe('Numeric string values', () => {
		it('should return numeric strings with quotes', () => {
			expect(formatValueForExpression('123')).toBe("'123'");
			expect(formatValueForExpression('0')).toBe("'0'");
			expect(formatValueForExpression('100000')).toBe("'100000'");
			expect(formatValueForExpression('-42')).toBe("'-42'");
			expect(formatValueForExpression('3.14')).toBe("'3.14'");
			expect(formatValueForExpression(' 456 ')).toBe("' 456 '");
		});

		it('should handle numeric strings with IN operator', () => {
			expect(formatValueForExpression('123', 'IN')).toBe("['123']");
			expect(formatValueForExpression(['123', '456'], 'IN')).toBe(
				"['123', '456']",
			);
		});
	});

	describe('Quoted string values', () => {
		it('should return already quoted strings as-is', () => {
			expect(formatValueForExpression("'quoted'")).toBe("'quoted'");
			expect(formatValueForExpression('"double-quoted"')).toBe('"double-quoted"');
			expect(formatValueForExpression('`backticked`')).toBe('`backticked`');
			expect(formatValueForExpression("'100000'")).toBe("'100000'");
		});

		it('should preserve quoted strings in arrays', () => {
			expect(formatValueForExpression(["'value1'", "'value2'"])).toBe(
				"['value1', 'value2']",
			);
			expect(formatValueForExpression(["'100000'", "'200000'"], 'IN')).toBe(
				"['100000', '200000']",
			);
		});
	});

	describe('Regular string values', () => {
		it('should wrap regular strings in single quotes', () => {
			expect(formatValueForExpression('hello')).toBe("'hello'");
			expect(formatValueForExpression('api-gateway')).toBe("'api-gateway'");
			expect(formatValueForExpression('test value')).toBe("'test value'");
		});

		it('should escape single quotes in strings', () => {
			expect(formatValueForExpression("user's data")).toBe("'user\\'s data'");
			expect(formatValueForExpression("John's")).toBe("'John\\'s'");
			expect(formatValueForExpression("it's a test")).toBe("'it\\'s a test'");
		});

		it('should handle empty strings', () => {
			expect(formatValueForExpression('')).toBe("''");
		});

		it('should handle strings with special characters', () => {
			expect(formatValueForExpression('/api/v1/users')).toBe("'/api/v1/users'");
			expect(formatValueForExpression('user@example.com')).toBe(
				"'user@example.com'",
			);
			expect(formatValueForExpression('Contains "quotes"')).toBe(
				'\'Contains "quotes"\'',
			);
		});
	});

	describe('Number values', () => {
		it('should convert numbers to strings without quotes', () => {
			expect(formatValueForExpression(123)).toBe('123');
			expect(formatValueForExpression(0)).toBe('0');
			expect(formatValueForExpression(-42)).toBe('-42');
			expect(formatValueForExpression(100000)).toBe('100000');
			expect(formatValueForExpression(3.14)).toBe('3.14');
		});

		it('should handle numbers with IN operator', () => {
			expect(formatValueForExpression(123, 'IN')).toBe('[123]');
			expect(formatValueForExpression([100, 200] as any, 'IN')).toBe('[100, 200]');
		});
	});

	describe('Boolean values', () => {
		it('should convert booleans to strings without quotes', () => {
			expect(formatValueForExpression(true)).toBe('true');
			expect(formatValueForExpression(false)).toBe('false');
		});

		it('should handle booleans with IN operator', () => {
			expect(formatValueForExpression(true, 'IN')).toBe('[true]');
			expect(formatValueForExpression([true, false] as any, 'IN')).toBe(
				'[true, false]',
			);
		});
	});

	describe('Array values', () => {
		it('should format array of strings', () => {
			expect(formatValueForExpression(['a', 'b', 'c'])).toBe("['a', 'b', 'c']");
			expect(formatValueForExpression(['service1', 'service2'])).toBe(
				"['service1', 'service2']",
			);
		});

		it('should format array of numeric strings', () => {
			expect(formatValueForExpression(['123', '456', '789'])).toBe(
				"['123', '456', '789']",
			);
		});

		it('should format array of numbers', () => {
			expect(formatValueForExpression([1, 2, 3] as any)).toBe('[1, 2, 3]');
			expect(formatValueForExpression([100, 200, 300] as any)).toBe(
				'[100, 200, 300]',
			);
		});

		it('should format mixed array types', () => {
			expect(formatValueForExpression(['hello', 123, true] as any)).toBe(
				"['hello', 123, true]",
			);
		});

		it('should format array with quoted values', () => {
			expect(formatValueForExpression(["'quoted'", 'regular'])).toBe(
				"['quoted', 'regular']",
			);
		});

		it('should format array with empty strings', () => {
			expect(formatValueForExpression(['', 'value'])).toBe("['', 'value']");
		});
	});

	describe('IN and NOT IN operators', () => {
		it('should format single value as array for IN operator', () => {
			expect(formatValueForExpression('value', 'IN')).toBe("['value']");
			expect(formatValueForExpression(123, 'IN')).toBe('[123]');
			expect(formatValueForExpression('123', 'IN')).toBe("['123']");
		});

		it('should format array for IN operator', () => {
			expect(formatValueForExpression(['a', 'b'], 'IN')).toBe("['a', 'b']");
			expect(formatValueForExpression(['123', '456'], 'IN')).toBe(
				"['123', '456']",
			);
		});

		it('should format single value as array for NOT IN operator', () => {
			expect(formatValueForExpression('value', 'NOT IN')).toBe("['value']");
			expect(formatValueForExpression('value', 'not in')).toBe("['value']");
		});

		it('should format array for NOT IN operator', () => {
			expect(formatValueForExpression(['a', 'b'], 'NOT IN')).toBe("['a', 'b']");
		});
	});

	describe('Edge cases', () => {
		it('should handle strings that look like numbers but have quotes', () => {
			expect(formatValueForExpression("'123'")).toBe("'123'");
			expect(formatValueForExpression('"456"')).toBe('"456"');
			expect(formatValueForExpression('`789`')).toBe('`789`');
		});

		it('should handle strings with leading/trailing whitespace', () => {
			expect(formatValueForExpression('  hello  ')).toBe("'  hello  '");
			expect(formatValueForExpression('  123  ')).toBe("'  123  '");
		});

		it('should handle very large numbers', () => {
			expect(formatValueForExpression('999999999')).toBe("'999999999'");
			expect(formatValueForExpression(999999999)).toBe('999999999');
		});

		it('should handle decimal numbers', () => {
			expect(formatValueForExpression('123.456')).toBe("'123.456'");
			expect(formatValueForExpression(123.456)).toBe('123.456');
		});

		it('should handle negative numbers', () => {
			expect(formatValueForExpression('-100')).toBe("'-100'");
			expect(formatValueForExpression(-100)).toBe('-100');
		});

		it('should handle strings that are not valid numbers', () => {
			expect(formatValueForExpression('123abc')).toBe("'123abc'");
			expect(formatValueForExpression('abc123')).toBe("'abc123'");
			expect(formatValueForExpression('12.34.56')).toBe("'12.34.56'");
		});

		it('should handle empty array', () => {
			expect(formatValueForExpression([])).toBe('[]');
			expect(formatValueForExpression([], 'IN')).toBe('[]');
		});

		it('should handle array with single element', () => {
			expect(formatValueForExpression(['single'])).toBe("['single']");
			expect(formatValueForExpression([123] as any)).toBe('[123]');
		});
	});
});
