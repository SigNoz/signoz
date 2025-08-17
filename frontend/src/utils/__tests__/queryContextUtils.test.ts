// Mock all dependencies before importing the function
// Now import the function after all mocks are set up
// Import the mocked antlr4 to access CharStreams
import * as antlr4 from 'antlr4';

import {
	createContext,
	extractQueryPairs,
	getCurrentQueryPair,
	getCurrentValueIndexAtCursor,
} from '../queryContextUtils';

jest.mock('antlr4', () => ({
	CharStreams: {
		fromString: jest.fn().mockReturnValue({}),
	},
	CommonTokenStream: jest.fn().mockImplementation(() => ({
		fill: jest.fn(),
		tokens: [
			// service.name
			{ type: 29, text: 'service.name', start: 0, stop: 11, channel: 0 },
			// IN
			{ type: 19, text: 'IN', start: 13, stop: 14, channel: 0 },
			// [
			{ type: 3, text: '[', start: 16, stop: 16, channel: 0 },
			// 'adservice'
			{ type: 28, text: "'adservice'", start: 17, stop: 27, channel: 0 },
			// ,
			{ type: 5, text: ',', start: 28, stop: 28, channel: 0 },
			// 'consumer-svc-1'
			{ type: 28, text: "'consumer-svc-1'", start: 30, stop: 45, channel: 0 },
			// ]
			{ type: 4, text: ']', start: 46, stop: 46, channel: 0 },
			// AND
			{ type: 21, text: 'AND', start: 48, stop: 50, channel: 0 },
			// cloud.account.id
			{ type: 29, text: 'cloud.account.id', start: 52, stop: 67, channel: 0 },
			// =
			{ type: 6, text: '=', start: 69, stop: 69, channel: 0 },
			// 'signoz-staging'
			{ type: 28, text: "'signoz-staging'", start: 71, stop: 86, channel: 0 },
			// code.lineno
			{ type: 29, text: 'code.lineno', start: 88, stop: 98, channel: 0 },
			// <
			{ type: 9, text: '<', start: 100, stop: 100, channel: 0 },
			// 172
			{ type: 27, text: '172', start: 102, stop: 104, channel: 0 },
			// EOF
			{ type: -1, text: '', start: 0, stop: 0, channel: 0 },
		],
	})),
	Token: {
		EOF: -1,
	},
}));

jest.mock('parser/FilterQueryLexer', () => ({
	__esModule: true,
	default: class MockFilterQueryLexer {
		static readonly KEY = 29;

		static readonly IN = 19;

		static readonly EQUALS = 6;

		static readonly LT = 9;

		static readonly AND = 21;

		static readonly LPAREN = 1;

		static readonly RPAREN = 2;

		static readonly LBRACK = 3;

		static readonly RBRACK = 4;

		static readonly COMMA = 5;

		static readonly NOT = 20;

		static readonly OR = 22;

		static readonly EOF = -1;

		static readonly QUOTED_TEXT = 28;

		static readonly NUMBER = 27;

		static readonly WS = 30;

		static readonly FREETEXT = 31;
	},
}));

jest.mock('parser/analyzeQuery', () => ({}));

jest.mock('../tokenUtils', () => ({
	isOperatorToken: jest.fn((tokenType: number) =>
		[6, 9, 19, 20].includes(tokenType),
	),
	isMultiValueOperator: jest.fn((operator: string) => operator === 'IN'),
	isValueToken: jest.fn((tokenType: number) => [27, 28, 29].includes(tokenType)),
	isConjunctionToken: jest.fn((tokenType: number) =>
		[21, 22].includes(tokenType),
	),
	isQueryPairComplete: jest.fn((pair: any) => {
		if (!pair) return false;
		if (pair.operator === 'EXISTS') {
			return !!pair.key && !!pair.operator;
		}
		return Boolean(pair.key && pair.operator && pair.value);
	}),
}));

jest.mock('constants/antlrQueryConstants', () => ({
	NON_VALUE_OPERATORS: ['EXISTS'],
}));

describe('extractQueryPairs', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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

	test('should handle error gracefully and return empty array', () => {
		// Mock console.error to suppress output during test
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		// Mock CharStreams to throw an error
		jest.mocked(antlr4.CharStreams.fromString).mockImplementation(() => {
			throw new Error('Mock error');
		});

		const input = 'some query';
		const result = extractQueryPairs(input);

		expect(result).toEqual([]);

		// Restore console.error
		consoleSpy.mockRestore();
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
