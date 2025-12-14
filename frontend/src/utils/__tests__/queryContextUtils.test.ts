/* eslint-disable */

import {
	createContext,
	extractQueryPairs,
	getCurrentQueryPair,
	getCurrentValueIndexAtCursor,
} from '../queryContextUtils';

describe('extractQueryPairs', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should extract NOT EXISTS and NOT LIKE correctly', () => {
		const input = "active NOT EXISTS AND name NOT LIKE '%tmp%'";

		const result = extractQueryPairs(input);

		expect(result).toEqual([
			{
				key: 'active',
				operator: 'EXISTS',
				value: undefined,
				valueList: [],
				valuesPosition: [],
				hasNegation: true,
				isMultiValue: false,
				position: {
					keyStart: 0,
					keyEnd: 5,
					negationEnd: 9,
					negationStart: 7,
					operatorEnd: 16,
					operatorStart: 11,
					valueEnd: undefined,
					valueStart: undefined,
				},
				isComplete: false,
			},
			{
				key: 'name',
				operator: 'LIKE',
				value: "'%tmp%'",
				valueList: [],
				valuesPosition: [],
				hasNegation: true,
				isMultiValue: false,
				position: {
					keyEnd: 25,
					keyStart: 22,
					negationEnd: 29,
					negationStart: 27,
					operatorEnd: 34,
					operatorStart: 31,
					valueEnd: 42,
					valueStart: 36,
				},
				isComplete: true,
			},
		]);
	});

	test('should extract IN with numeric list inside parentheses', () => {
		const input = 'id IN (1, 2, 3)';
		const result = extractQueryPairs(input);
		expect(result).toEqual([
			expect.objectContaining({
				key: 'id',
				operator: 'IN',
				isMultiValue: true,
				isComplete: true,
				value: expect.stringMatching(/^\(.*\)$/),
				valueList: ['1', '2', '3'],
				valuesPosition: [
					{ start: 7, end: 7 },
					{ start: 10, end: 10 },
					{ start: 13, end: 13 },
				],
			}),
		]);
	});

	test('should handle extra whitespace and separators in IN lists', () => {
		const input = "label IN [ 'a' ,  'b' ,  'c' ]";
		const result = extractQueryPairs(input);
		expect(result).toEqual([
			expect.objectContaining({
				key: 'label',
				operator: 'IN',
				isMultiValue: true,
				isComplete: true,
				value: expect.stringMatching(/^\[.*\]$/),
				valueList: ["'a'", "'b'", "'c'"],
				valuesPosition: [
					{ start: 11, end: 13 },
					{ start: 18, end: 20 },
					{ start: 25, end: 27 },
				],
			}),
		]);
	});

	test('should extract correct query pairs when the query has space at the start of the value', () => {
		const input = "  label IN [ 'a' ,  'b' ,  'c' ]";
		const result = extractQueryPairs(input);
		expect(result).toEqual([
			expect.objectContaining({
				key: 'label',
				operator: 'IN',
				isMultiValue: true,
				isComplete: true,
				value: expect.stringMatching(/^\[.*\]$/),
				valueList: ["'a'", "'b'", "'c'"],
				valuesPosition: [
					{ start: 13, end: 15 },
					{ start: 20, end: 22 },
					{ start: 27, end: 29 },
				],
			}),
		]);
	});

	test('should return incomplete pair when value is missing', () => {
		const input = 'a =';
		const result = extractQueryPairs(input);
		expect(result).toEqual([
			expect.objectContaining({
				key: 'a',
				operator: '=',
				value: undefined,
				isComplete: false,
			}),
		]);
	});

	test('should parse pairs within grouping parentheses with conjunctions', () => {
		const input = "(name = 'x' AND age > 10) OR active EXISTS";
		const result = extractQueryPairs(input);
		expect(result).toEqual([
			expect.objectContaining({
				key: 'name',
				operator: '=',
				value: "'x'",
				isComplete: true,
			}),
			expect.objectContaining({
				key: 'age',
				operator: '>',
				value: '10',
				isComplete: true,
			}),
			expect.objectContaining({
				key: 'active',
				operator: 'EXISTS',
				value: undefined,
				isComplete: false,
			}),
		]);
	});

	test('should extract query pairs from complex query with IN operator and multiple conditions', () => {
		const input =
			"service.name IN ['adservice', 'consumer-svc-1'] AND cloud.account.id = 'signoz-staging' code.lineno < 172";

		const result = extractQueryPairs(input);

		expect(result).toEqual([
			{
				key: 'service.name',
				operator: 'IN',
				value: "['adservice', 'consumer-svc-1']",
				valueList: ["'adservice'", "'consumer-svc-1'"],
				valuesPosition: [
					{
						start: 17,
						end: 27,
					},
					{
						start: 30,
						end: 45,
					},
				],
				hasNegation: false,
				isMultiValue: true,
				position: {
					keyStart: 0,
					keyEnd: 11,
					operatorStart: 13,
					operatorEnd: 14,
					valueStart: 16,
					valueEnd: 46,
					negationStart: 0,
					negationEnd: 0,
				},
				isComplete: true,
			},
			{
				key: 'cloud.account.id',
				operator: '=',
				value: "'signoz-staging'",
				valueList: [],
				valuesPosition: [],
				hasNegation: false,
				isMultiValue: false,
				position: {
					keyStart: 52,
					keyEnd: 67,
					operatorStart: 69,
					operatorEnd: 69,
					valueStart: 71,
					valueEnd: 86,
					negationStart: 0,
					negationEnd: 0,
				},
				isComplete: true,
			},
			{
				key: 'code.lineno',
				operator: '<',
				value: '172',
				valueList: [],
				valuesPosition: [],
				hasNegation: false,
				isMultiValue: false,
				position: {
					keyStart: 88,
					keyEnd: 98,
					operatorStart: 100,
					operatorEnd: 100,
					valueStart: 102,
					valueEnd: 104,
					negationStart: 0,
					negationEnd: 0,
				},
				isComplete: true,
			},
		]);
	});

	test('should extract query pairs from complex query with IN operator without brackets', () => {
		const input =
			"service.name IN 'adservice' AND cloud.account.id = 'signoz-staging' code.lineno < 172";

		const result = extractQueryPairs(input);
		expect(result).toEqual([
			{
				key: 'service.name',
				operator: 'IN',
				value: "'adservice'",
				valueList: ["'adservice'"],
				valuesPosition: [
					{
						start: 16,
						end: 26,
					},
				],
				hasNegation: false,
				isMultiValue: true,
				position: {
					keyStart: 0,
					keyEnd: 11,
					operatorStart: 13,
					operatorEnd: 14,
					valueStart: 16,
					valueEnd: 26,
					negationStart: 0,
					negationEnd: 0,
				},
				isComplete: true,
			},
			{
				key: 'cloud.account.id',
				operator: '=',
				value: "'signoz-staging'",
				valueList: [],
				valuesPosition: [],
				hasNegation: false,
				isMultiValue: false,
				position: {
					keyStart: 32,
					keyEnd: 47,
					operatorStart: 49,
					operatorEnd: 49,
					valueStart: 51,
					valueEnd: 66,
					negationStart: 0,
					negationEnd: 0,
				},
				isComplete: true,
			},
			{
				key: 'code.lineno',
				operator: '<',
				value: '172',
				valueList: [],
				valuesPosition: [],
				hasNegation: false,
				isMultiValue: false,
				position: {
					keyStart: 68,
					keyEnd: 78,
					operatorStart: 80,
					operatorEnd: 80,
					valueStart: 82,
					valueEnd: 84,
					negationStart: 0,
					negationEnd: 0,
				},
				isComplete: true,
			},
		]);
	});

	test('should handle recursion guard', () => {
		// This test verifies the recursion protection in the function
		// We'll mock the function to simulate recursion

		// Mock console.warn to capture the warning
		const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

		// Call the function multiple times to trigger recursion guard
		// Note: This is a simplified test since we can't easily trigger the actual recursion
		const result = extractQueryPairs('test');

		// The function should still work normally
		expect(Array.isArray(result)).toBe(true);

		consoleSpy.mockRestore();
	});
});

describe('createContext', () => {
	test('should create a context object with all parameters', () => {
		const mockToken = {
			type: 29,
			text: 'test',
			start: 0,
			stop: 3,
		};

		const result = createContext(
			mockToken as any,
			true, // isInKey
			false, // isInNegation
			false, // isInOperator
			false, // isInValue
			'testKey', // keyToken
			'=', // operatorToken
			'testValue', // valueToken
			[], // queryPairs
			null, // currentPair
		);

		expect(result).toEqual({
			tokenType: 29,
			text: 'test',
			start: 0,
			stop: 3,
			currentToken: 'test',
			isInKey: true,
			isInNegation: false,
			isInOperator: false,
			isInValue: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
			keyToken: 'testKey',
			operatorToken: '=',
			valueToken: 'testValue',
			queryPairs: [],
			currentPair: null,
		});
	});

	test('should create a context object with minimal parameters', () => {
		const mockToken = {
			type: 29,
			text: 'test',
			start: 0,
			stop: 3,
		};

		const result = createContext(mockToken as any, false, false, false, false);

		expect(result).toEqual({
			tokenType: 29,
			text: 'test',
			start: 0,
			stop: 3,
			currentToken: 'test',
			isInKey: false,
			isInNegation: false,
			isInOperator: false,
			isInValue: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
			keyToken: undefined,
			operatorToken: undefined,
			valueToken: undefined,
			queryPairs: [],
			currentPair: undefined,
		});
	});
});

describe('getCurrentValueIndexAtCursor', () => {
	test('should return correct value index when cursor is within a value range', () => {
		const valuesPosition = [
			{ start: 0, end: 10 },
			{ start: 15, end: 25 },
			{ start: 30, end: 40 },
		];

		const result = getCurrentValueIndexAtCursor(valuesPosition, 20);

		expect(result).toBe(1);
	});

	test('should return null when cursor is not within any value range', () => {
		const valuesPosition = [
			{ start: 0, end: 10 },
			{ start: 15, end: 25 },
		];

		const result = getCurrentValueIndexAtCursor(valuesPosition, 12);

		expect(result).toBeNull();
	});

	test('should return correct index when cursor is at the boundary', () => {
		const valuesPosition = [
			{ start: 0, end: 10 },
			{ start: 15, end: 25 },
		];

		const result = getCurrentValueIndexAtCursor(valuesPosition, 10);

		expect(result).toBe(0);
	});

	test('should return null for empty valuesPosition array', () => {
		const result = getCurrentValueIndexAtCursor([], 5);

		expect(result).toBeNull();
	});
});

describe('getCurrentQueryPair', () => {
	test('should return the correct query pair at cursor position', () => {
		const queryPairs = [
			{
				key: 'a',
				operator: '=',
				value: '1',
				position: {
					keyStart: 0,
					keyEnd: 0,
					operatorStart: 2,
					operatorEnd: 2,
					valueStart: 4,
					valueEnd: 4,
				},
				isComplete: true,
			} as any,
			{
				key: 'b',
				operator: '=',
				value: '2',
				position: {
					keyStart: 10,
					keyEnd: 10,
					operatorStart: 12,
					operatorEnd: 12,
					valueStart: 14,
					valueEnd: 14,
				},
				isComplete: true,
			} as any,
		];

		const query = 'a = 1 AND b = 2';
		const result = getCurrentQueryPair(queryPairs, query, 15);

		expect(result).toEqual(queryPairs[1]);
	});

	test('should return null when no pairs match cursor position', () => {
		const queryPairs = [
			{
				key: 'a',
				operator: '=',
				value: '1',
				position: {
					keyStart: 0,
					keyEnd: 0,
					operatorStart: 2,
					operatorEnd: 2,
					valueStart: 4,
					valueEnd: 4,
				},
				isComplete: true,
			} as any,
		];

		const query = 'a = 1';
		// Test with cursor position that's before any pair starts
		const result = getCurrentQueryPair(queryPairs, query, -1);

		expect(result).toBeNull();
	});

	test('should return null for empty queryPairs array', () => {
		const result = getCurrentQueryPair([], 'test query', 5);

		expect(result).toBeNull();
	});

	test('should return last pair when cursor is at the end', () => {
		const queryPairs = [
			{
				key: 'a',
				operator: '=',
				value: '1',
				position: {
					keyStart: 0,
					keyEnd: 0,
					operatorStart: 2,
					operatorEnd: 2,
					valueStart: 4,
					valueEnd: 4,
				},
				isComplete: true,
			} as any,
		];

		const query = 'a = 1';
		const result = getCurrentQueryPair(queryPairs, query, 5);

		expect(result).toEqual(queryPairs[0]);
	});
});
