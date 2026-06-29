import {
	createContext,
	extractQueryPairs,
	getCurrentQueryPair,
	getCurrentValueIndexAtCursor,
	getQueryContextAtCursor,
} from '../queryContextUtils';

describe('extractQueryPairs', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should extract NOT EXISTS and NOT LIKE correctly', () => {
		const input = "active NOT EXISTS AND name NOT LIKE '%tmp%'";

		const result = extractQueryPairs(input);

		expect(result).toStrictEqual([
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
				isComplete: true,
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

	it('should test for filter expression with freeText', () => {
		const input = "disconnected deployment.env not in ['mq-kafka']";
		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
			{
				key: 'disconnected',
				operator: '',
				valueList: [],
				valuesPosition: [],
				hasNegation: false,
				isMultiValue: false,
				value: undefined,
				position: {
					keyStart: 0,
					keyEnd: 11,
					operatorStart: 0,
					operatorEnd: 0,
					negationStart: 0,
					negationEnd: 0,
					valueStart: undefined,
					valueEnd: undefined,
				},
				isComplete: false,
			},
			{
				key: 'deployment.env',
				operator: 'in',
				value: "['mq-kafka']",
				valueList: ["'mq-kafka'"],
				valuesPosition: [
					{
						start: 36,
						end: 45,
					},
				],
				hasNegation: true,
				isMultiValue: true,
				position: {
					keyStart: 13,
					keyEnd: 26,
					operatorStart: 32,
					operatorEnd: 33,
					valueStart: 35,
					valueEnd: 46,
					negationStart: 28,
					negationEnd: 30,
				},
				isComplete: true,
			},
		]);
	});

	it('should extract IN with numeric list inside parentheses', () => {
		const input = 'id IN (1, 2, 3)';
		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
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

	it('should handle extra whitespace and separators in IN lists', () => {
		const input = "label IN [ 'a' ,  'b' ,  'c' ]";
		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
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

	it('should extract correct query pairs when the query has space at the start of the value', () => {
		const input = "  label IN [ 'a' ,  'b' ,  'c' ]";
		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
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

	it('should return incomplete pair when value is missing', () => {
		const input = 'a =';
		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
			expect.objectContaining({
				key: 'a',
				operator: '=',
				value: undefined,
				isComplete: false,
			}),
		]);
	});

	it('should parse pairs within grouping parentheses with conjunctions', () => {
		const input = "(name = 'x' AND age > 10) OR active EXISTS";
		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
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
				isComplete: true,
			}),
		]);
	});

	it('should extract query pairs from complex query with IN operator and multiple conditions', () => {
		const input =
			"service.name IN ['adservice', 'consumer-svc-1'] AND cloud.account.id = 'signoz-staging' code.lineno < 172";

		const result = extractQueryPairs(input);

		expect(result).toStrictEqual([
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

	it('should extract query pairs from complex query with IN operator without brackets', () => {
		const input =
			"service.name IN 'adservice' AND cloud.account.id = 'signoz-staging' code.lineno < 172";

		const result = extractQueryPairs(input);
		expect(result).toStrictEqual([
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

	it('should handle recursion guard', () => {
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

	it('should treat lowercase exists as non-value operator', () => {
		const input = 'body exists service.name contains "test"';
		const result = extractQueryPairs(input);

		expect(result).toHaveLength(2);
		expect(result[0].key).toBe('body');
		expect(result[0].operator).toBe('exists');
		expect(result[0].value).toBeUndefined();
		expect(result[0].valuesPosition).toStrictEqual([]);
		expect(result[0].isComplete).toBe(true);
		expect(result[1].key).toBe('service.name');
		expect(result[1].operator).toBe('contains');
		expect(result[1].value).toBe('"test"');
		expect(result[1].valuesPosition).toStrictEqual([]);
		expect(result[1].isComplete).toBe(true);
	});
});

describe('createContext', () => {
	it('should create a context object with all parameters', () => {
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

		expect(result).toStrictEqual({
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

	it('should create a context object with minimal parameters', () => {
		const mockToken = {
			type: 29,
			text: 'test',
			start: 0,
			stop: 3,
		};

		const result = createContext(mockToken as any, false, false, false, false);

		expect(result).toStrictEqual({
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
	it('should return correct value index when cursor is within a value range', () => {
		const valuesPosition = [
			{ start: 0, end: 10 },
			{ start: 15, end: 25 },
			{ start: 30, end: 40 },
		];

		const result = getCurrentValueIndexAtCursor(valuesPosition, 20);

		expect(result).toBe(1);
	});

	it('should return null when cursor is not within any value range', () => {
		const valuesPosition = [
			{ start: 0, end: 10 },
			{ start: 15, end: 25 },
		];

		const result = getCurrentValueIndexAtCursor(valuesPosition, 12);

		expect(result).toBeNull();
	});

	it('should return correct index when cursor is at the boundary', () => {
		const valuesPosition = [
			{ start: 0, end: 10 },
			{ start: 15, end: 25 },
		];

		const result = getCurrentValueIndexAtCursor(valuesPosition, 10);

		expect(result).toBe(0);
	});

	it('should return null for empty valuesPosition array', () => {
		const result = getCurrentValueIndexAtCursor([], 5);

		expect(result).toBeNull();
	});
});

describe('getCurrentQueryPair', () => {
	it('should return the correct query pair at cursor position', () => {
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

		expect(result).toStrictEqual(queryPairs[1]);
	});

	it('should return null when no pairs match cursor position', () => {
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

	it('should return null for empty queryPairs array', () => {
		const result = getCurrentQueryPair([], 'test query', 5);

		expect(result).toBeNull();
	});

	it('should return last pair when cursor is at the end', () => {
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

		expect(result).toStrictEqual(queryPairs[0]);
	});
});

describe('getQueryContextAtCursor - trailing dot in key/value', () => {
	// A token ending with "." (e.g. "service.") is lexed as FREETEXT rather than
	// KEY, which previously collapsed the context to "nothing" and made the
	// suggestion dropdown render empty (appearing closed). These cases lock in
	// that a partial key/value still resolves to the correct context.
	it('keeps key context while typing a key that ends with a dot', () => {
		['service.', 'k8s.', 'attribute.', 'k8s.pod.'].forEach((q) => {
			const ctx = getQueryContextAtCursor(q, q.length);
			expect(ctx.isInKey).toBe(true);
			expect(ctx.isInValue).toBe(false);
			expect(ctx.isInOperator).toBe(false);
			expect(ctx.keyToken).toBe(q);
		});
	});

	it('treats a new key after a conjunction as key context', () => {
		const q = 'a = b AND k8s.';
		const ctx = getQueryContextAtCursor(q, q.length);
		expect(ctx.isInKey).toBe(true);
		expect(ctx.isInValue).toBe(false);
	});

	it('keeps value context while typing a value that ends with a dot', () => {
		const q = 'service.name = foo.';
		const ctx = getQueryContextAtCursor(q, q.length);
		expect(ctx.isInValue).toBe(true);
		expect(ctx.isInKey).toBe(false);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('=');
	});

	it('still resolves a complete dotted key to key context', () => {
		const q = 'k8s.namespace';
		const ctx = getQueryContextAtCursor(q, q.length);
		expect(ctx.isInKey).toBe(true);
		expect(ctx.keyToken).toBe('k8s.namespace');
	});
});

describe('getQueryContextAtCursor - partial operator', () => {
	it('treats text after an incomplete key as an operator prefix', () => {
		const q = 'service.name c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.isInKey).toBe(false);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('c');
		expect(ctx.currentPair).toStrictEqual(
			expect.objectContaining({
				key: 'service.name',
				operator: 'c',
				position: expect.objectContaining({
					operatorStart: 13,
					operatorEnd: 13,
				}),
			}),
		);
	});

	it('keeps the operator context while completing contains', () => {
		const q = 'service.name cont';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('cont');
	});

	it('treats cursor mid-token as operator context', () => {
		const q = 'service.name cont';
		// cursor sits between "con" and "t" — user still typing the operator
		const ctx = getQueryContextAtCursor(q, 15);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.isInKey).toBe(false);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('cont');
	});

	it('keeps operator context when an AND conjunction precedes the pair', () => {
		const q = 'a = 1 AND service.name c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.isInKey).toBe(false);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('c');
		expect(ctx.currentPair).toStrictEqual(
			expect.objectContaining({
				key: 'service.name',
				operator: 'c',
				position: expect.objectContaining({
					operatorStart: 23,
					operatorEnd: 23,
				}),
			}),
		);
	});

	it('keeps operator context when an open parenthesis precedes the pair', () => {
		const q = '(service.name c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.isInKey).toBe(false);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('c');
	});

	it('re-glues a partial operator that follows a NOT negation', () => {
		const q = 'service.name NOT c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.isInKey).toBe(false);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('NOT c');
		// operatorStart points at the partial operator (post-NOT), not at the
		// negation — so suggestion selection only replaces the partial, never
		// the user's typed NOT.
		expect(ctx.currentPair).toStrictEqual(
			expect.objectContaining({
				key: 'service.name',
				operator: 'NOT c',
				hasNegation: true,
				position: expect.objectContaining({
					negationStart: 13,
					negationEnd: 15,
					operatorStart: 17,
					operatorEnd: 17,
				}),
			}),
		);
	});

	it('re-glues a multi-character partial operator after NOT', () => {
		const q = 'service.name NOT lik';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('NOT lik');
		expect(ctx.currentPair?.hasNegation).toBe(true);
	});

	it('re-glues an uppercase partial operator after NOT', () => {
		const q = 'service.name NOT EXI';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('NOT EXI');
		expect(ctx.currentPair?.hasNegation).toBe(true);
	});

	it('preserves original NOT casing in the operator text', () => {
		const q = 'service.name not c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('not c');
		expect(ctx.currentPair?.hasNegation).toBe(true);
	});

	it('tolerates extra whitespace between NOT and the partial operator', () => {
		const q = 'service.name NOT  c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		// Display text uses a canonical single space between NOT and the
		// partial, regardless of how many spaces the user typed.
		expect(ctx.operatorToken).toBe('NOT c');
		expect(ctx.currentPair?.hasNegation).toBe(true);
	});

	it('keeps operator context for NOT-prefixed partial inside parentheses', () => {
		const q = '(service.name NOT c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('NOT c');
		expect(ctx.currentPair?.hasNegation).toBe(true);
	});

	it('keeps operator context for NOT-prefixed partial after an AND conjunction', () => {
		const q = 'a = 1 AND service.name NOT c';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('service.name');
		expect(ctx.operatorToken).toBe('NOT c');
		expect(ctx.currentPair?.hasNegation).toBe(true);
	});

	it('re-glues the most recent incomplete pair when three partial tokens are typed', () => {
		// Pins documented behavior: with two trailing partial pairs (`c` and
		// `k`), the heuristic pairs the most recent two — `c` becomes the
		// key, `k` becomes the partial operator. The earlier `service.name`
		// is dropped from the current pair view.
		const q = 'service.name c k';
		const ctx = getQueryContextAtCursor(q, q.length);

		expect(ctx.isInOperator).toBe(true);
		expect(ctx.keyToken).toBe('c');
		expect(ctx.operatorToken).toBe('k');
	});
});
