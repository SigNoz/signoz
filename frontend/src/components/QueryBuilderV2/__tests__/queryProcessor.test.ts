/* eslint-disable sonarjs/no-duplicate-string */
import { negateOperator, OPERATORS } from 'constants/antlrQueryConstants';
import { extractQueryPairs } from 'utils/queryContextUtils';

import {
	clearQueryPairsCache,
	convertFiltersToExpressionWithExistingQuery,
} from '../queryProcessor';

describe('convertFiltersToExpressionWithExistingQuery', () => {
	beforeEach(() => {
		clearQueryPairsCache();
		jest.clearAllMocks();
	});

	it('should handle empty, null, and undefined inputs', () => {
		// Test null and undefined existing query
		expect(
			convertFiltersToExpressionWithExistingQuery(null as any, undefined),
		).toEqual({
			filters: null,
			filter: { expression: '' },
		});
		expect(
			convertFiltersToExpressionWithExistingQuery(undefined as any, undefined),
		).toEqual({
			filters: undefined,
			filter: { expression: '' },
		});

		// Test empty filters
		expect(
			convertFiltersToExpressionWithExistingQuery(
				{ items: [], op: 'AND' },
				undefined,
			),
		).toEqual({
			filters: { items: [], op: 'AND' },
			filter: { expression: '' },
		});
		expect(
			convertFiltersToExpressionWithExistingQuery(
				{ items: undefined, op: 'AND' } as any,
				undefined,
			),
		).toEqual({
			filters: { items: undefined, op: 'AND' },
			filter: { expression: '' },
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

	it('should create filters from existing query when filters array is empty', () => {
		const filters = {
			items: [],
			op: 'AND',
		};

		const existingQuery = "service.name = 'testing'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filters.items[0]).toEqual({
			id: expect.any(String),
			key: {
				id: 'service.name',
				key: 'service.name',
				type: '',
			},
			op: '=',
			value: 'testing',
		});
		expect(result.filter.expression).toBe(existingQuery);
	});

	it('should create multiple filters from complex existing query', () => {
		const filters = {
			items: [],
			op: 'AND',
		};

		const existingQuery =
			"service.name = 'testing' AND status = 'success' AND count > 100";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(3);
		expect(result.filters.items[0]).toEqual({
			id: expect.any(String),
			key: {
				id: 'service.name',
				key: 'service.name',
				type: '',
			},
			op: '=',
			value: 'testing',
		});
		expect(result.filters.items[1]).toEqual({
			id: expect.any(String),
			key: {
				id: 'status',
				key: 'status',
				type: '',
			},
			op: '=',
			value: 'success',
		});
		expect(result.filters.items[2]).toEqual({
			id: expect.any(String),
			key: {
				id: 'count',
				key: 'count',
				type: '',
			},
			op: '>',
			value: '100',
		});
		expect(result.filter.expression).toBe(existingQuery);
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

	it('should normalize deprecated operators', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service', key: 'service', type: 'string' },
					op: 'regex', // deprecated operator
					value: 'api',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			undefined,
		);

		expect(result.filters.items[0].op).toBe('regexp');
	});

	it('should handle complex mixed scenarios', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service', key: 'service', type: 'string' },
					op: OPERATORS.IN,
					value: ['api-gateway', 'user-service'],
				},
				{
					id: '2',
					key: { id: 'status', key: 'status', type: 'string' },
					op: OPERATORS['='],
					value: 'success',
				},
			],
			op: 'AND',
		};

		const existingQuery = "service = 'old-service' AND count > 100";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(3); // 2 new + 1 existing
		expect(result.filter.expression).toContain(
			"service IN ['api-gateway', 'user-service']",
		);
		expect(result.filter.expression).toContain("status = 'success'");
		expect(result.filter.expression).toContain('count > 100');
	});

	it('should handle empty query string', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service', key: 'service', type: 'string' },
					op: '=',
					value: 'api',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpressionWithExistingQuery(filters, '');

		expect(result.filter.expression).toBe("service = 'api'");
	});

	it('should handle invalid query gracefully', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service', key: 'service', type: 'string' },
					op: '=',
					value: 'api',
				},
			],
			op: 'AND',
		};

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			'invalid query',
		);

		expect(result.filters).toBeDefined();
		expect(result.filter.expression).toBe("invalid query service = 'api'");
	});

	it('should preserve existing filters when no matching query pairs', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'service', key: 'service', type: 'string' },
					op: '=',
					value: 'api',
				},
			],
			op: 'AND',
		};

		const existingQuery = "different.field = 'value'";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(2); // Original + existing
		expect(result.filter.expression).toContain("service = 'api'");
		expect(result.filter.expression).toContain("different.field = 'value'");
	});

	it('should handle array values in IN operators', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'services', key: 'services', type: 'string' },
					op: OPERATORS.IN,
					value: ['api', 'user', 'auth'],
				},
			],
			op: 'AND',
		};

		const existingQuery = "services IN ['old-service']";

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filter.expression).toBe("services IN ['api', 'user', 'auth']");
	});

	it('should handle function operators', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'tags', key: 'tags', type: 'string' },
					op: 'has',
					value: 'production',
				},
			],
			op: 'AND',
		};

		const existingQuery = '';

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filter.expression).toBe("has(tags, 'production')");
	});

	it('should handle non-value operators like EXISTS', () => {
		const filters = {
			items: [
				{
					id: '1',
					key: { id: 'user_id', key: 'user_id', type: 'string' },
					op: 'EXISTS',
					value: '',
				},
			],
			op: 'AND',
		};

		const existingQuery = 'user_id EXISTS';

		const result = convertFiltersToExpressionWithExistingQuery(
			filters,
			existingQuery,
		);

		expect(result.filters.items).toHaveLength(1);
		expect(result.filter.expression).toBe('user_id EXISTS');
	});
});
