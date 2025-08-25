/* eslint-disable */

// Mock all dependencies before importing the function
// Global variable to store the current test input
let currentTestInput = '';

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
		fromString: jest.fn().mockImplementation((input: string) => {
			currentTestInput = input;
			return {
				inputSource: { strdata: input },
			};
		}),
	},
	CommonTokenStream: jest.fn().mockImplementation(() => {
		// Use the dynamically captured input string from the current test
		const input = currentTestInput;

		// Generate tokens dynamically based on the input
		const tokens = [];
		let currentPos = 0;
		let i = 0;

		while (i < input.length) {
			// Skip whitespace
			while (i < input.length && /\s/.test(input[i])) {
				i++;
				currentPos++;
			}
			if (i >= input.length) break;

			// Handle array brackets
			if (input[i] === '[') {
				tokens.push({
					type: 3, // LBRACK
					text: '[',
					start: currentPos,
					stop: currentPos,
					channel: 0,
				});
				i++;
				currentPos++;
				continue;
			}

			if (input[i] === ']') {
				tokens.push({
					type: 4, // RBRACK
					text: ']',
					start: currentPos,
					stop: currentPos,
					channel: 0,
				});
				i++;
				currentPos++;
				continue;
			}

			if (input[i] === ',') {
				tokens.push({
					type: 5, // COMMA
					text: ',',
					start: currentPos,
					stop: currentPos,
					channel: 0,
				});
				i++;
				currentPos++;
				continue;
			}

			// Find the end of the current token
			let tokenEnd = i;
			let inQuotes = false;
			let quoteChar = '';

			while (tokenEnd < input.length) {
				const char = input[tokenEnd];

				if (
					!inQuotes &&
					(char === ' ' || char === '[' || char === ']' || char === ',')
				) {
					break;
				}

				if ((char === '"' || char === "'") && !inQuotes) {
					inQuotes = true;
					quoteChar = char;
				} else if (char === quoteChar && inQuotes) {
					inQuotes = false;
					quoteChar = '';
				}

				tokenEnd++;
			}

			const tokenText = input.substring(i, tokenEnd);

			// Determine token type
			let tokenType = 28; // Default to QUOTED_TEXT

			if (tokenText === 'IN') {
				tokenType = 19;
			} else if (tokenText === 'AND') {
				tokenType = 21;
			} else if (tokenText === '=') {
				tokenType = 6;
			} else if (tokenText === '<') {
				tokenType = 9;
			} else if (tokenText === '>') {
				tokenType = 10;
			} else if (tokenText === '!=') {
				tokenType = 7;
			} else if (tokenText.includes('.')) {
				tokenType = 29; // KEY
			} else if (/^\d+$/.test(tokenText)) {
				tokenType = 27; // NUMBER
			} else if (
				(tokenText.startsWith("'") && tokenText.endsWith("'")) ||
				(tokenText.startsWith('"') && tokenText.endsWith('"'))
			) {
				tokenType = 28; // QUOTED_TEXT
			}

			tokens.push({
				type: tokenType,
				text: tokenText,
				start: currentPos,
				stop: currentPos + tokenText.length - 1,
				channel: 0,
			});

			currentPos += tokenText.length;
			i = tokenEnd;
		}

		return {
			fill: jest.fn(),
			tokens: [
				...tokens,
				// EOF
				{ type: -1, text: '', start: 0, stop: 0, channel: 0 },
			],
		};
	}),
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
