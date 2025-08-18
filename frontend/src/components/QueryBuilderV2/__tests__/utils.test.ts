/* eslint-disable sonarjs/no-duplicate-string */
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { convertFiltersToExpression } from '../utils';

describe('convertFiltersToExpression', () => {
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
});
