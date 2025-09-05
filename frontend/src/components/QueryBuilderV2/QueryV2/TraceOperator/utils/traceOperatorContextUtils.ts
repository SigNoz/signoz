/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-continue */

import { CharStreams, CommonTokenStream, Token } from 'antlr4';
import TraceOperatorGrammarLexer from 'parser/TraceOperatorParser/TraceOperatorGrammarLexer';
import { IToken } from 'types/antlrQueryTypes';

// Trace Operator Context Interface
export interface ITraceOperatorContext {
	tokenType: number;
	text: string;
	start: number;
	stop: number;
	currentToken: string;
	isInAtom: boolean;
	isInOperator: boolean;
	isInParenthesis: boolean;
	isInExpression: boolean;
	atomToken?: string;
	operatorToken?: string;
	expressionPairs: ITraceExpressionPair[];
	currentPair?: ITraceExpressionPair | null;
}

// Trace Expression Pair Interface
export interface ITraceExpressionPair {
	leftAtom: string;
	operator: string;
	rightAtom?: string;
	rightExpression?: string;
	position: {
		leftStart: number;
		leftEnd: number;
		operatorStart: number;
		operatorEnd: number;
		rightStart?: number;
		rightEnd?: number;
	};
	isComplete: boolean;
}

// Helper functions to determine token types
function isAtomToken(tokenType: number): boolean {
	return tokenType === TraceOperatorGrammarLexer.IDENTIFIER;
}

function isOperatorToken(tokenType: number): boolean {
	return [
		TraceOperatorGrammarLexer.T__2, // '=>'
		TraceOperatorGrammarLexer.T__3, // '&&'
		TraceOperatorGrammarLexer.T__4, // '||'
		TraceOperatorGrammarLexer.T__5, // 'NOT'
		TraceOperatorGrammarLexer.T__6, // '->'
	].includes(tokenType);
}

function isParenthesisToken(tokenType: number): boolean {
	return (
		tokenType === TraceOperatorGrammarLexer.T__0 ||
		tokenType === TraceOperatorGrammarLexer.T__1
	);
}

function isOpeningParenthesis(tokenType: number): boolean {
	return tokenType === TraceOperatorGrammarLexer.T__0;
}

function isClosingParenthesis(tokenType: number): boolean {
	return tokenType === TraceOperatorGrammarLexer.T__1;
}

// Function to create a context object
export function createTraceOperatorContext(
	token: Token,
	isInAtom: boolean,
	isInOperator: boolean,
	isInParenthesis: boolean,
	isInExpression: boolean,
	atomToken?: string,
	operatorToken?: string,
	expressionPairs?: ITraceExpressionPair[],
	currentPair?: ITraceExpressionPair | null,
): ITraceOperatorContext {
	return {
		tokenType: token.type,
		text: token.text || '',
		start: token.start,
		stop: token.stop,
		currentToken: token.text || '',
		isInAtom,
		isInOperator,
		isInParenthesis,
		isInExpression,
		atomToken,
		operatorToken,
		expressionPairs: expressionPairs || [],
		currentPair,
	};
}

// Helper to determine token context
function determineTraceTokenContext(
	token: IToken,
): {
	isInAtom: boolean;
	isInOperator: boolean;
	isInParenthesis: boolean;
	isInExpression: boolean;
} {
	const tokenType = token.type;

	return {
		isInAtom: isAtomToken(tokenType),
		isInOperator: isOperatorToken(tokenType),
		isInParenthesis: isParenthesisToken(tokenType),
		isInExpression: false, // Will be determined by broader context
	};
}

/**
 * Extracts all expression pairs from a trace operator query string
 * This parses the query according to the TraceOperatorGrammar.g4 grammar
 *
 * @param query The trace operator query string to parse
 * @returns An array of ITraceExpressionPair objects representing the expression pairs
 */
export function extractTraceExpressionPairs(
	query: string,
): ITraceExpressionPair[] {
	try {
		const input = query || '';
		const chars = CharStreams.fromString(input);
		const lexer = new TraceOperatorGrammarLexer(chars);

		const tokenStream = new CommonTokenStream(lexer);
		tokenStream.fill();

		const allTokens = tokenStream.tokens as IToken[];
		const expressionPairs: ITraceExpressionPair[] = [];
		let currentPair: Partial<ITraceExpressionPair> | null = null;

		let i = 0;
		while (i < allTokens.length) {
			const token = allTokens[i];
			i++;

			// Skip EOF and whitespace tokens
			if (token.type === TraceOperatorGrammarLexer.EOF || token.channel !== 0) {
				continue;
			}

			// If token is an IDENTIFIER (atom), start or continue a pair
			if (isAtomToken(token.type)) {
				// If we don't have a current pair, start one
				if (!currentPair) {
					currentPair = {
						leftAtom: token.text,
						position: {
							leftStart: token.start,
							leftEnd: token.stop,
							operatorStart: 0,
							operatorEnd: 0,
						},
					};
				}
				// If we have a current pair but no operator yet, this is still the left atom
				else if (!currentPair.operator && currentPair.position) {
					currentPair.leftAtom = token.text;
					currentPair.position.leftStart = token.start;
					currentPair.position.leftEnd = token.stop;
				}
				// If we have an operator, this is the right atom
				else if (
					currentPair.operator &&
					!currentPair.rightAtom &&
					currentPair.position
				) {
					currentPair.rightAtom = token.text;
					currentPair.position.rightStart = token.start;
					currentPair.position.rightEnd = token.stop;
					currentPair.isComplete = true;

					// Add the completed pair to the result
					expressionPairs.push(currentPair as ITraceExpressionPair);
					currentPair = null;
				}
			}
			// If token is an operator and we have a left atom
			else if (
				isOperatorToken(token.type) &&
				currentPair &&
				currentPair.leftAtom &&
				currentPair.position
			) {
				currentPair.operator = token.text;
				currentPair.position.operatorStart = token.start;
				currentPair.position.operatorEnd = token.stop;

				// If this is a NOT operator, it might be followed by another operator
				if (token.type === TraceOperatorGrammarLexer.T__5 && i < allTokens.length) {
					// Look ahead for the next operator
					const nextToken = allTokens[i];
					if (isOperatorToken(nextToken.type) && nextToken.channel === 0) {
						currentPair.operator = `${token.text} ${nextToken.text}`;
						currentPair.position.operatorEnd = nextToken.stop;
						i++; // Skip the next token since we've consumed it
					}
				}
			}
			// If token is an opening parenthesis after an operator, this is a right expression
			else if (
				isOpeningParenthesis(token.type) &&
				currentPair &&
				currentPair.operator &&
				!currentPair.rightAtom &&
				currentPair.position
			) {
				// Find the matching closing parenthesis
				let parenCount = 1;
				let j = i;
				let rightExpression = '';
				const rightStart = token.start;
				let rightEnd = token.stop;

				while (j < allTokens.length && parenCount > 0) {
					const parenToken = allTokens[j];
					if (parenToken.channel === 0) {
						if (isOpeningParenthesis(parenToken.type)) {
							parenCount++;
						} else if (isClosingParenthesis(parenToken.type)) {
							parenCount--;
							if (parenCount === 0) {
								rightEnd = parenToken.stop;
								break;
							}
						}
					}
					rightExpression += parenToken.text;
					j++;
				}

				if (parenCount === 0) {
					currentPair.rightExpression = rightExpression;
					currentPair.position.rightStart = rightStart;
					currentPair.position.rightEnd = rightEnd;
					currentPair.isComplete = true;

					// Add the completed pair to the result
					expressionPairs.push(currentPair as ITraceExpressionPair);
					currentPair = null;

					// Skip to the end of the expression
					i = j;
				}
			}
		}

		// Add any remaining incomplete pair
		if (currentPair && currentPair.leftAtom && currentPair.position) {
			expressionPairs.push({
				...currentPair,
				isComplete: !!(currentPair.leftAtom && currentPair.operator),
			} as ITraceExpressionPair);
		}

		return expressionPairs;
	} catch (error) {
		console.error('Error in extractTraceExpressionPairs:', error);
		return [];
	}
}

/**
 * Gets the current expression pair at the cursor position
 *
 * @param expressionPairs An array of ITraceExpressionPair objects
 * @param query The full query string
 * @param cursorIndex The position of the cursor in the query
 * @returns The expression pair at the cursor position, or null if not found
 */
export function getCurrentTraceExpressionPair(
	expressionPairs: ITraceExpressionPair[],
	cursorIndex: number,
): ITraceExpressionPair | null {
	try {
		if (expressionPairs.length === 0) {
			return null;
		}

		// Find the rightmost pair whose end position is before or at the cursor
		let bestMatch: ITraceExpressionPair | null = null;

		// eslint-disable-next-line no-restricted-syntax
		for (const pair of expressionPairs) {
			const { position } = pair;
			const pairEnd =
				position.rightEnd || position.operatorEnd || position.leftEnd;
			const pairStart = position.leftStart;

			// If this pair ends at or before the cursor, and it's further right than our previous best match
			if (
				pairStart <= cursorIndex &&
				cursorIndex <= pairEnd + 1 &&
				(!bestMatch ||
					pairEnd >
						(bestMatch.position.rightEnd ||
							bestMatch.position.operatorEnd ||
							bestMatch.position.leftEnd))
			) {
				bestMatch = pair;
			}
		}

		return bestMatch;
	} catch (error) {
		console.error('Error in getCurrentTraceExpressionPair:', error);
		return null;
	}
}

/**
 * Gets the current trace operator context at the cursor position
 * This is useful for determining what kind of suggestions to show
 *
 * @param query The trace operator query string
 * @param cursorIndex The position of the cursor in the query
 * @returns The trace operator context at the cursor position
 */
export function getTraceOperatorContextAtCursor(
	query: string,
	cursorIndex: number,
): ITraceOperatorContext {
	try {
		// Guard against infinite recursion
		const stackTrace = new Error().stack || '';
		const callCount = (stackTrace.match(/getTraceOperatorContextAtCursor/g) || [])
			.length;
		if (callCount > 3) {
			console.warn(
				'Potential infinite recursion detected in getTraceOperatorContextAtCursor',
			);
			return {
				tokenType: -1,
				text: '',
				start: cursorIndex,
				stop: cursorIndex,
				currentToken: '',
				isInAtom: true,
				isInOperator: false,
				isInParenthesis: false,
				isInExpression: false,
				expressionPairs: [],
				currentPair: null,
			};
		}

		// Create input stream and lexer
		const input = query || '';
		const chars = CharStreams.fromString(input);
		const lexer = new TraceOperatorGrammarLexer(chars);

		const tokenStream = new CommonTokenStream(lexer);
		tokenStream.fill();

		const allTokens = tokenStream.tokens as IToken[];

		// Get expression pairs information
		const expressionPairs = extractTraceExpressionPairs(query);
		const currentPair = getCurrentTraceExpressionPair(
			expressionPairs,
			cursorIndex,
		);

		// Find the token at or just before the cursor
		let lastTokenBeforeCursor: IToken | null = null;
		for (let i = 0; i < allTokens.length; i++) {
			const token = allTokens[i];
			if (token.type === TraceOperatorGrammarLexer.EOF) continue;

			if (token.stop < cursorIndex || token.stop + 1 === cursorIndex) {
				lastTokenBeforeCursor = token;
			}

			if (token.start > cursorIndex) {
				break;
			}
		}

		// Find exact token at cursor
		let exactToken: IToken | null = null;
		for (let i = 0; i < allTokens.length; i++) {
			const token = allTokens[i];
			if (token.type === TraceOperatorGrammarLexer.EOF) continue;

			if (token.start <= cursorIndex && cursorIndex <= token.stop + 1) {
				exactToken = token;
				break;
			}
		}

		// If we don't have any tokens, return default context
		if (!lastTokenBeforeCursor && !exactToken) {
			return {
				tokenType: -1,
				text: '',
				start: cursorIndex,
				stop: cursorIndex,
				currentToken: '',
				isInAtom: true, // Default to atom context when input is empty
				isInOperator: false,
				isInParenthesis: false,
				isInExpression: false,
				expressionPairs,
				currentPair: null,
			};
		}

		// Check if cursor is at a space after a token (transition point)
		const isAtSpace = cursorIndex < query.length && query[cursorIndex] === ' ';
		const isAfterSpace = cursorIndex > 0 && query[cursorIndex - 1] === ' ';
		const isAfterToken = cursorIndex > 0 && query[cursorIndex - 1] !== ' ';
		const isTransitionPoint =
			(isAtSpace && isAfterToken) ||
			(cursorIndex === query.length && isAfterToken);

		// If we're at a transition point after a token, progress the context
		if (
			lastTokenBeforeCursor &&
			(isAtSpace || isAfterSpace || isTransitionPoint)
		) {
			const lastTokenContext = determineTraceTokenContext(lastTokenBeforeCursor);

			// Apply context progression: atom → operator → atom/expression → operator → atom
			if (lastTokenContext.isInAtom) {
				// After atom + space, move to operator context
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInAtom: false,
					isInOperator: true,
					isInParenthesis: false,
					isInExpression: false,
					atomToken: lastTokenBeforeCursor.text,
					expressionPairs,
					currentPair,
				};
			}

			if (lastTokenContext.isInOperator) {
				// After operator + space, move to atom/expression context
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInAtom: true, // Expecting an atom or expression after operator
					isInOperator: false,
					isInParenthesis: false,
					isInExpression: false,
					operatorToken: lastTokenBeforeCursor.text,
					atomToken: currentPair?.leftAtom,
					expressionPairs,
					currentPair,
				};
			}

			if (
				lastTokenContext.isInParenthesis &&
				isClosingParenthesis(lastTokenBeforeCursor.type)
			) {
				// After closing parenthesis, move to operator context
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInAtom: false,
					isInOperator: true,
					isInParenthesis: false,
					isInExpression: false,
					expressionPairs,
					currentPair,
				};
			}
		}

		// If cursor is at the end of a token, return the current token context
		if (exactToken && cursorIndex === exactToken.stop + 1) {
			const tokenContext = determineTraceTokenContext(exactToken);

			return {
				tokenType: exactToken.type,
				text: exactToken.text,
				start: exactToken.start,
				stop: exactToken.stop,
				currentToken: exactToken.text,
				...tokenContext,
				atomToken: tokenContext.isInAtom ? exactToken.text : currentPair?.leftAtom,
				operatorToken: tokenContext.isInOperator
					? exactToken.text
					: currentPair?.operator,
				expressionPairs,
				currentPair,
			};
		}

		// Regular token-based context detection
		if (exactToken?.channel === 0) {
			const tokenContext = determineTraceTokenContext(exactToken);

			return {
				tokenType: exactToken.type,
				text: exactToken.text,
				start: exactToken.start,
				stop: exactToken.stop,
				currentToken: exactToken.text,
				...tokenContext,
				atomToken: tokenContext.isInAtom ? exactToken.text : currentPair?.leftAtom,
				operatorToken: tokenContext.isInOperator
					? exactToken.text
					: currentPair?.operator,
				expressionPairs,
				currentPair,
			};
		}

		// Default fallback to atom context
		return {
			tokenType: -1,
			text: '',
			start: cursorIndex,
			stop: cursorIndex,
			currentToken: '',
			isInAtom: true,
			isInOperator: false,
			isInParenthesis: false,
			isInExpression: false,
			expressionPairs,
			currentPair,
		};
	} catch (error) {
		console.error('Error in getTraceOperatorContextAtCursor:', error);
		return {
			tokenType: -1,
			text: '',
			start: cursorIndex,
			stop: cursorIndex,
			currentToken: '',
			isInAtom: true,
			isInOperator: false,
			isInParenthesis: false,
			isInExpression: false,
			expressionPairs: [],
			currentPair: null,
		};
	}
}
