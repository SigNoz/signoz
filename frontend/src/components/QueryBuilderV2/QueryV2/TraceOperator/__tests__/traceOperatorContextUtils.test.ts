/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/cognitive-complexity */

import { Token } from 'antlr4';
import TraceOperatorGrammarLexer from 'parser/TraceOperatorParser/TraceOperatorGrammarLexer';

import {
	createTraceOperatorContext,
	extractTraceExpressionPairs,
	getTraceOperatorContextAtCursor,
} from '../utils/traceOperatorContextUtils';

describe('traceOperatorContextUtils', () => {
	describe('createTraceOperatorContext', () => {
		it('should create a context object with all required properties', () => {
			const mockToken = {
				type: TraceOperatorGrammarLexer.IDENTIFIER,
				text: 'test',
				start: 0,
				stop: 3,
			} as Token;

			const context = createTraceOperatorContext(
				mockToken,
				true,
				false,
				false,
				false,
				'atom',
				'operator',
				[],
				null,
			);

			expect(context).toEqual({
				tokenType: TraceOperatorGrammarLexer.IDENTIFIER,
				text: 'test',
				start: 0,
				stop: 3,
				currentToken: 'test',
				isInAtom: true,
				isInOperator: false,
				isInParenthesis: false,
				isInExpression: false,
				atomToken: 'atom',
				operatorToken: 'operator',
				expressionPairs: [],
				currentPair: null,
			});
		});

		it('should create a context object with default values', () => {
			const mockToken = {
				type: TraceOperatorGrammarLexer.IDENTIFIER,
				text: 'test',
				start: 0,
				stop: 3,
			} as Token;

			const context = createTraceOperatorContext(
				mockToken,
				false,
				true,
				false,
				false,
			);

			expect(context).toEqual({
				tokenType: TraceOperatorGrammarLexer.IDENTIFIER,
				text: 'test',
				start: 0,
				stop: 3,
				currentToken: 'test',
				isInAtom: false,
				isInOperator: true,
				isInParenthesis: false,
				isInExpression: false,
				atomToken: undefined,
				operatorToken: undefined,
				expressionPairs: [],
				currentPair: undefined,
			});
		});
	});

	describe('extractTraceExpressionPairs', () => {
		it('should extract simple expression pair', () => {
			const query = 'A => B';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(1);
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].position.leftStart).toBe(0);
			expect(result[0].position.leftEnd).toBe(0);
			expect(result[0].operator).toBe('=>');
			expect(result[0].position.operatorStart).toBe(2);
			expect(result[0].position.operatorEnd).toBe(3);
			expect(result[0].rightAtom).toBe('B');
			expect(result[0].position.rightStart).toBe(5);
			expect(result[0].position.rightEnd).toBe(5);
			expect(result[0].isComplete).toBe(true);
		});

		it('should extract multiple expression pairs', () => {
			const query = 'A => B && C => D';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(2);

			// First pair: A => B
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].operator).toBe('=>');
			expect(result[0].rightAtom).toBe('B');

			// Second pair: C => D
			expect(result[1].leftAtom).toBe('C');
			expect(result[1].operator).toBe('=>');
			expect(result[1].rightAtom).toBe('D');
		});

		it('should handle NOT operator', () => {
			const query = 'NOT A => B';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(1);
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].operator).toBe('=>');
			expect(result[0].rightAtom).toBe('B');
		});

		it('should handle parentheses', () => {
			const query = '(A => B) && (C => D)';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(2);
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].rightAtom).toBe('B');
			expect(result[1].leftAtom).toBe('C');
			expect(result[1].rightAtom).toBe('D');
		});

		it('should handle incomplete expressions', () => {
			const query = 'A =>';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(1);
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].operator).toBe('=>');
			expect(result[0].rightAtom).toBeUndefined();
			expect(result[0].isComplete).toBe(true);
		});

		it('should handle complex nested expressions', () => {
			const query = 'A => B && (C => D || E => F)';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(3);
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].rightAtom).toBe('B');
			expect(result[1].leftAtom).toBe('C');
			expect(result[1].rightAtom).toBe('D');
			expect(result[2].leftAtom).toBe('E');
			expect(result[2].rightAtom).toBe('F');
		});

		it('should handle whitespace variations', () => {
			const query = 'A=>B';
			const result = extractTraceExpressionPairs(query);

			expect(result).toHaveLength(1);
			expect(result[0].leftAtom).toBe('A');
			expect(result[0].operator).toBe('=>');
			expect(result[0].rightAtom).toBe('B');
		});

		it('should handle error cases gracefully', () => {
			const query = 'invalid syntax @#$%';
			const result = extractTraceExpressionPairs(query);

			// Should return an array (even if empty or with partial results)
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe('getTraceOperatorContextAtCursor', () => {
		beforeEach(() => {
			// Reset console.error mock
			jest.spyOn(console, 'error').mockImplementation(() => {});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should return default context for empty query', () => {
			const result = getTraceOperatorContextAtCursor('', 0);

			expect(result).toEqual({
				tokenType: -1,
				text: '',
				start: 0,
				stop: 0,
				currentToken: '',
				isInAtom: true,
				isInOperator: false,
				isInParenthesis: false,
				isInExpression: false,
				expressionPairs: [],
				currentPair: null,
			});
		});

		it('should return default context for null query', () => {
			const result = getTraceOperatorContextAtCursor(null as any, 0);

			expect(result).toEqual({
				tokenType: -1,
				text: '',
				start: 0,
				stop: 0,
				currentToken: '',
				isInAtom: true,
				isInOperator: false,
				isInParenthesis: false,
				isInExpression: false,
				expressionPairs: [],
				currentPair: null,
			});
		});

		it('should return default context for undefined query', () => {
			const result = getTraceOperatorContextAtCursor(undefined as any, 0);

			expect(result).toEqual({
				tokenType: -1,
				text: '',
				start: 0,
				stop: 0,
				currentToken: '',
				isInAtom: true,
				isInOperator: false,
				isInParenthesis: false,
				isInExpression: false,
				expressionPairs: [],
				currentPair: null,
			});
		});

		it('should identify atom context', () => {
			const query = 'A => B';
			const result = getTraceOperatorContextAtCursor(query, 0); // cursor at 'A'

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBe('=>');
			expect(result.isInAtom).toBe(true);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(0);
			expect(result.stop).toBe(0);
		});

		it('should identify operator context', () => {
			const query = 'A => B';
			const result = getTraceOperatorContextAtCursor(query, 2); // cursor at '='

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBeUndefined();
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(true);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(2);
			expect(result.stop).toBe(2);
		});

		it('should identify parenthesis context', () => {
			const query = '(A => B)';
			const result = getTraceOperatorContextAtCursor(query, 0); // cursor at '('

			expect(result.atomToken).toBeUndefined();
			expect(result.operatorToken).toBeUndefined();
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(true);
			expect(result.start).toBe(0);
			expect(result.stop).toBe(0);
		});

		it('should handle cursor at space', () => {
			const query = 'A => B';
			const result = getTraceOperatorContextAtCursor(query, 1); // cursor at space

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBeUndefined();
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(true);
			expect(result.isInParenthesis).toBe(false);
		});

		it('should handle cursor at end of query', () => {
			const query = 'A => B';
			const result = getTraceOperatorContextAtCursor(query, 5); // cursor at end

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBe('=>');
			expect(result.isInAtom).toBe(true);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(5);
			expect(result.stop).toBe(5);
		});

		it('should handle complex query', () => {
			const query = 'A => B && C => D';
			const result = getTraceOperatorContextAtCursor(query, 8); // cursor at '&'

			expect(result.atomToken).toBeUndefined();
			expect(result.operatorToken).toBe('&&');
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(true);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(7);
			expect(result.stop).toBe(8);
		});

		it('should identify operator position in complex query', () => {
			const query = 'A => B && C => D';
			const result = getTraceOperatorContextAtCursor(query, 10); // cursor at 'C'

			expect(result.atomToken).toBe('C');
			expect(result.operatorToken).toBe('&&');
			expect(result.isInAtom).toBe(true);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(10);
			expect(result.stop).toBe(10);
		});

		it('should identify atom position in complex query', () => {
			const query = 'A => B && C => D';
			const result = getTraceOperatorContextAtCursor(query, 13); // cursor at '>'

			expect(result.atomToken).toBe('C');
			expect(result.operatorToken).toBe('=>');
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(true);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(12);
			expect(result.stop).toBe(13);
		});

		it('should handle transition points', () => {
			const query = 'A => B';
			const result = getTraceOperatorContextAtCursor(query, 4); // cursor at 'B'

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBe('=>');
			expect(result.isInAtom).toBe(true);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(4);
			expect(result.stop).toBe(4);
		});

		it('should handle whitespace in complex queries', () => {
			const query = 'A=>B && C=>D';
			const result = getTraceOperatorContextAtCursor(query, 6); // cursor at '&'

			expect(result.atomToken).toBeUndefined();
			expect(result.operatorToken).toBe('&&');
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(true);
			expect(result.isInParenthesis).toBe(false);
			expect(result.start).toBe(5);
			expect(result.stop).toBe(6);
		});

		it('should handle NOT operator context', () => {
			const query = 'NOT A => B';
			const result = getTraceOperatorContextAtCursor(query, 0); // cursor at 'N'

			expect(result.atomToken).toBeUndefined();
			expect(result.operatorToken).toBeUndefined();
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(true);
		});

		it('should handle parentheses context', () => {
			const query = '(A => B)';
			const result = getTraceOperatorContextAtCursor(query, 1); // cursor at 'A'

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBe('=>');
			expect(result.isInAtom).toBe(false);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(true);
			expect(result.start).toBe(0);
			expect(result.stop).toBe(0);
		});

		it('should handle expression pairs context', () => {
			const query = 'A => B && C => D';
			const result = getTraceOperatorContextAtCursor(query, 5); // cursor at 'A' in "&&"

			expect(result.atomToken).toBe('A');
			expect(result.operatorToken).toBe('=>');
			expect(result.isInAtom).toBe(true);
			expect(result.isInOperator).toBe(false);
			expect(result.isInParenthesis).toBe(false);
		});

		it('should handle various cursor positions', () => {
			const query = 'A => B';

			// Test cursor at each position
			for (let i = 0; i < query.length; i++) {
				const result = getTraceOperatorContextAtCursor(query, i);
				expect(result).toBeDefined();
				expect(typeof result.start).toBe('number');
				expect(typeof result.stop).toBe('number');
			}
		});
	});
});
