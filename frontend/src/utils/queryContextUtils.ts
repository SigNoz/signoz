/* eslint-disable */

import { CharStreams, CommonTokenStream, Token } from 'antlr4';
import FilterQueryLexer from 'parser/FilterQueryLexer';
import { IQueryContext, IQueryPair, IToken } from 'types/antlrQueryTypes';

// Function to normalize multiple spaces to single spaces when not in quotes
function normalizeSpaces(query: string): string {
	let result = '';
	let inQuotes = false;
	let lastChar = '';

	for (let i = 0; i < query.length; i++) {
		const char = query[i];

		// Track quote state
		if (char === "'" && (i === 0 || query[i - 1] !== '\\')) {
			inQuotes = !inQuotes;
		}

		// If we're in quotes, always keep the original character
		if (inQuotes) {
			result += char;
		}
		// Otherwise, collapse multiple spaces to a single space
		else if (char === ' ' && lastChar === ' ') {
			// Skip this space (don't add it)
		} else {
			result += char;
		}

		lastChar = char;
	}

	return result;
}

// Function to create a context object
export function createContext(
	token: Token,
	isInKey: boolean,
	isInOperator: boolean,
	isInValue: boolean,
	keyToken?: string,
	operatorToken?: string,
	valueToken?: string,
	queryPairs?: IQueryPair[],
	currentPair?: IQueryPair | null,
): IQueryContext {
	return {
		tokenType: token.type,
		text: token.text || '',
		start: token.start,
		stop: token.stop,
		currentToken: token.text || '',
		isInKey,
		isInOperator,
		isInValue,
		isInFunction: false,
		isInConjunction: false,
		isInParenthesis: false,
		keyToken,
		operatorToken,
		valueToken,
		queryPairs: queryPairs || [],
		currentPair,
	};
}

// Helper to determine token type for context
function determineTokenContext(
	tokenType: number,
): {
	isInKey: boolean;
	isInOperator: boolean;
	isInValue: boolean;
	isInFunction: boolean;
	isInConjunction: boolean;
	isInParenthesis: boolean;
} {
	// Key context
	const isInKey = tokenType === FilterQueryLexer.KEY;

	// Operator context
	const isInOperator = [
		FilterQueryLexer.EQUALS,
		FilterQueryLexer.NOT_EQUALS,
		FilterQueryLexer.NEQ,
		FilterQueryLexer.LT,
		FilterQueryLexer.LE,
		FilterQueryLexer.GT,
		FilterQueryLexer.GE,
		FilterQueryLexer.LIKE,
		FilterQueryLexer.NOT_LIKE,
		FilterQueryLexer.ILIKE,
		FilterQueryLexer.NOT_ILIKE,
		FilterQueryLexer.BETWEEN,
		FilterQueryLexer.EXISTS,
		FilterQueryLexer.REGEXP,
		FilterQueryLexer.CONTAINS,
		FilterQueryLexer.IN,
		FilterQueryLexer.NOT,
	].includes(tokenType);

	// Value context
	const isInValue = [
		FilterQueryLexer.QUOTED_TEXT,
		FilterQueryLexer.NUMBER,
		FilterQueryLexer.BOOL,
	].includes(tokenType);

	// Function context
	const isInFunction = [
		FilterQueryLexer.HAS,
		FilterQueryLexer.HASANY,
		FilterQueryLexer.HASALL,
		FilterQueryLexer.HASNONE,
	].includes(tokenType);

	// Conjunction context
	const isInConjunction = [FilterQueryLexer.AND, FilterQueryLexer.OR].includes(
		tokenType,
	);

	// Parenthesis context
	const isInParenthesis = [
		FilterQueryLexer.LPAREN,
		FilterQueryLexer.RPAREN,
		FilterQueryLexer.LBRACK,
		FilterQueryLexer.RBRACK,
	].includes(tokenType);

	return {
		isInKey,
		isInOperator,
		isInValue,
		isInFunction,
		isInConjunction,
		isInParenthesis,
	};
}

/**
 * Gets the current query context at the cursor position
 * This is useful for determining what kind of suggestions to show
 *
 * The function now includes full query pair information:
 * - queryPairs: All key-operator-value triplets in the query
 * - currentPair: The pair at or before the current cursor position
 *
 * This enables more intelligent context-aware suggestions based on
 * the current key, operator, and surrounding query structure.
 *
 * @param query The query string
 * @param cursorIndex The position of the cursor in the query
 * @returns The query context at the cursor position
 */
export function getQueryContextAtCursor(
	query: string,
	cursorIndex: number,
): IQueryContext {
	try {
		// Guard against infinite recursion by checking call stack
		const stackTrace = new Error().stack || '';
		const callCount = (stackTrace.match(/getQueryContextAtCursor/g) || []).length;
		if (callCount > 3) {
			console.warn(
				'Potential infinite recursion detected in getQueryContextAtCursor',
			);
			return {
				tokenType: -1,
				text: '',
				start: cursorIndex,
				stop: cursorIndex,
				currentToken: '',
				isInKey: true,
				isInOperator: false,
				isInValue: false,
				isInFunction: false,
				isInConjunction: false,
				isInParenthesis: false,
				queryPairs: [],
				currentPair: null,
			};
		}

		// First check if the cursor is at a token boundary or within a whitespace area
		// This is critical for context detection
		const isAtSpace = cursorIndex < query.length && query[cursorIndex] === ' ';
		const isAfterSpace = cursorIndex > 0 && query[cursorIndex - 1] === ' ';
		const isAfterToken = cursorIndex > 0 && query[cursorIndex - 1] !== ' ';

		// Check if cursor is right after a token and at the start of a space
		const isTransitionPoint = isAtSpace && isAfterToken;

		// First normalize the query to handle multiple spaces
		// We need to adjust cursorIndex based on space normalization
		let adjustedCursorIndex = cursorIndex;
		let spaceCount = 0;
		let inQuotes = false;

		// Count consecutive spaces before the cursor to adjust the cursor position
		for (let i = 0; i < cursorIndex; i++) {
			// Track quote state
			if (query[i] === "'" && (i === 0 || query[i - 1] !== '\\')) {
				inQuotes = !inQuotes;
			}

			// Only count spaces when not in quotes
			if (!inQuotes && query[i] === ' ' && (i === 0 || query[i - 1] === ' ')) {
				spaceCount++;
			}
		}

		// Adjust cursor position based on removed spaces
		adjustedCursorIndex = cursorIndex - spaceCount;

		// Normalize the query by removing extra spaces when not in quotes
		const normalizedQuery = normalizeSpaces(query);

		// Create input stream and lexer with normalized query
		const input = normalizedQuery || '';
		const chars = CharStreams.fromString(input);
		const lexer = new FilterQueryLexer(chars);

		// Create token stream and force token generation
		const tokenStream = new CommonTokenStream(lexer);
		tokenStream.fill();

		// Get all tokens including whitespace
		const allTokens = tokenStream.tokens as IToken[];

		// Find exact token at cursor, including whitespace
		let exactToken: IToken | null = null;
		let previousToken: IToken | null = null;
		let nextToken: IToken | null = null;

		// Find the real token at or just before the cursor
		let lastTokenBeforeCursor: IToken | null = null;
		for (let i = 0; i < allTokens.length; i++) {
			const token = allTokens[i];
			if (token.type === FilterQueryLexer.EOF) continue;

			// Store this token if it's before or at the cursor position
			if (token.stop < cursorIndex) {
				lastTokenBeforeCursor = token;
			}

			// If we found a token that starts after the cursor, we're done searching
			if (token.start > cursorIndex) {
				break;
			}
		}

		// Get query pairs information to enhance context
		const queryPairs = extractQueryPairs(query);

		// Find the current pair without causing a circular dependency
		let currentPair: IQueryPair | null = null;
		if (queryPairs.length > 0) {
			// Look for the rightmost pair whose end position is before or at the cursor
			let bestMatch: IQueryPair | null = null;

			for (const pair of queryPairs) {
				const { position } = pair;

				// Find the rightmost position of this pair
				const pairEnd =
					position.valueEnd || position.operatorEnd || position.keyEnd;

				// If this pair ends at or before the cursor, and it's further right than our previous best match
				if (
					pairEnd <= cursorIndex &&
					(!bestMatch ||
						pairEnd >
							(bestMatch.position.valueEnd ||
								bestMatch.position.operatorEnd ||
								bestMatch.position.keyEnd))
				) {
					bestMatch = pair;
				}
			}

			// If we found a match, use it
			if (bestMatch) {
				currentPair = bestMatch;
			}
			// If cursor is at the end, use the last pair
			else if (cursorIndex >= query.length) {
				currentPair = queryPairs[queryPairs.length - 1];
			}
		}

		// Handle cursor at the very end of input
		if (adjustedCursorIndex >= input.length && allTokens.length > 0) {
			const lastRealToken = allTokens
				.filter((t) => t.type !== FilterQueryLexer.EOF)
				.pop();
			if (lastRealToken) {
				exactToken = lastRealToken;
				previousToken =
					allTokens.filter((t) => t.stop < lastRealToken.start).pop() || null;
			}
		} else {
			// Normal token search
			for (let i = 0; i < allTokens.length; i++) {
				const token = allTokens[i];
				// Skip EOF token in normal search
				if (token.type === FilterQueryLexer.EOF) {
					continue;
				}

				// Check if cursor is within token bounds (inclusive)
				if (
					token.start <= adjustedCursorIndex &&
					adjustedCursorIndex <= token.stop + 1
				) {
					exactToken = token;
					previousToken = i > 0 ? allTokens[i - 1] : null;
					nextToken = i < allTokens.length - 1 ? allTokens[i + 1] : null;
					break;
				}
			}

			// If cursor is between tokens, find surrounding tokens
			if (!exactToken) {
				for (let i = 0; i < allTokens.length - 1; i++) {
					const current = allTokens[i];
					const next = allTokens[i + 1];
					if (
						current.type === FilterQueryLexer.EOF ||
						next.type === FilterQueryLexer.EOF
					) {
						continue;
					}

					if (
						current.stop + 1 < adjustedCursorIndex &&
						adjustedCursorIndex < next.start
					) {
						previousToken = current;
						nextToken = next;
						break;
					}
				}
			}
		}

		// If we don't have tokens yet, return default context
		if (!previousToken && !nextToken && !exactToken && !lastTokenBeforeCursor) {
			return {
				tokenType: -1,
				text: '',
				start: adjustedCursorIndex,
				stop: adjustedCursorIndex,
				currentToken: '',
				isInKey: true, // Default to key context when input is empty
				isInOperator: false,
				isInValue: false,
				isInFunction: false,
				isInConjunction: false,
				isInParenthesis: false,
				queryPairs: queryPairs, // Add all query pairs to the context
				currentPair: null, // No current pair when query is empty
			};
		}

		// If we have a token and we're at a space after it (transition point),
		// then we should progress the context
		if (
			lastTokenBeforeCursor &&
			(isAtSpace || isAfterSpace || isTransitionPoint)
		) {
			const lastTokenContext = determineTokenContext(lastTokenBeforeCursor.type);

			// Apply the context progression logic: key → operator → value → conjunction → key
			if (lastTokenContext.isInKey) {
				// If we just typed a key and then a space, we move to operator context
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInOperator: true, // After key + space, should be operator context
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					keyToken: lastTokenBeforeCursor.text,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (lastTokenContext.isInOperator) {
				// If we just typed an operator and then a space, we move to value context
				const keyFromPair = currentPair?.key || '';
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInOperator: false,
					isInValue: true, // After operator + space, should be value context
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					operatorToken: lastTokenBeforeCursor.text,
					keyToken: keyFromPair, // Include key from current pair
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (lastTokenContext.isInValue) {
				// If we just typed a value and then a space, we move to conjunction context
				const keyFromPair = currentPair?.key || '';
				const operatorFromPair = currentPair?.operator || '';
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: true, // After value + space, should be conjunction context
					isInParenthesis: false,
					valueToken: lastTokenBeforeCursor.text,
					keyToken: keyFromPair, // Include key from current pair
					operatorToken: operatorFromPair, // Include operator from current pair
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (lastTokenContext.isInConjunction) {
				// If we just typed a conjunction and then a space, we move to key context
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: true, // After conjunction + space, should be key context
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}
		}

		// Regular token-based context detection (when cursor is directly on a token)
		if (exactToken?.channel === 0) {
			const tokenContext = determineTokenContext(exactToken.type);

			// Get relevant tokens based on current pair
			const keyFromPair = currentPair?.key || '';
			const operatorFromPair = currentPair?.operator || '';
			const valueFromPair = currentPair?.value || '';

			return {
				tokenType: exactToken.type,
				text: exactToken.text,
				start: exactToken.start,
				stop: exactToken.stop,
				currentToken: exactToken.text,
				...tokenContext,
				keyToken: tokenContext.isInKey
					? exactToken.text
					: tokenContext.isInOperator || tokenContext.isInValue
					? keyFromPair
					: undefined,
				operatorToken: tokenContext.isInOperator
					? exactToken.text
					: tokenContext.isInValue
					? operatorFromPair
					: undefined,
				valueToken: tokenContext.isInValue ? exactToken.text : undefined,
				queryPairs: queryPairs,
				currentPair: currentPair,
			};
		}

		// If we're between tokens but not after a space, use previous token to determine context
		if (previousToken?.channel === 0) {
			const prevContext = determineTokenContext(previousToken.type);

			// Get relevant tokens based on current pair
			const keyFromPair = currentPair?.key || '';
			const operatorFromPair = currentPair?.operator || '';
			const valueFromPair = currentPair?.value || '';

			// CRITICAL FIX: Check if the last meaningful token is an operator
			// If so, we're always in the value context regardless of spaces
			if (prevContext.isInOperator) {
				// If previous token is operator, we must be in value context
				return {
					tokenType: previousToken.type,
					text: previousToken.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: previousToken.text,
					isInKey: false,
					isInOperator: false,
					isInValue: true, // Always in value context after operator
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					operatorToken: previousToken.text,
					keyToken: keyFromPair, // Include key from current pair
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			// Maintain the strict progression key → operator → value → conjunction → key
			if (prevContext.isInKey) {
				return {
					tokenType: previousToken.type,
					text: previousToken.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: previousToken.text,
					isInKey: false,
					isInOperator: true, // After key, progress to operator context
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					keyToken: previousToken.text,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (prevContext.isInValue) {
				return {
					tokenType: previousToken.type,
					text: previousToken.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: previousToken.text,
					isInKey: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: true, // After value, progress to conjunction context
					isInParenthesis: false,
					valueToken: previousToken.text,
					keyToken: keyFromPair, // Include key from current pair
					operatorToken: operatorFromPair, // Include operator from current pair
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (prevContext.isInConjunction) {
				return {
					tokenType: previousToken.type,
					text: previousToken.text,
					start: adjustedCursorIndex,
					stop: adjustedCursorIndex,
					currentToken: previousToken.text,
					isInKey: true, // After conjunction, progress back to key context
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}
		}

		// Default fallback to key context
		return {
			tokenType: -1,
			text: '',
			start: adjustedCursorIndex,
			stop: adjustedCursorIndex,
			currentToken: '',
			isInKey: true,
			isInOperator: false,
			isInValue: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
			queryPairs: queryPairs,
			currentPair: currentPair,
		};
	} catch (error) {
		console.error('Error in getQueryContextAtCursor:', error);
		return {
			tokenType: -1,
			text: '',
			start: cursorIndex,
			stop: cursorIndex,
			currentToken: '',
			isInValue: false,
			isInKey: true, // Default to key context on error
			isInOperator: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
			queryPairs: [],
			currentPair: null,
		};
	}
}

/**
 * Extracts all key-operator-value triplets from a query string
 * This is useful for getting value suggestions based on the current key and operator
 *
 * @param query The query string to parse
 * @returns An array of IQueryPair objects representing the key-operator-value triplets
 */
export function extractQueryPairs(query: string): IQueryPair[] {
	try {
		// Guard against infinite recursion by checking call stack
		const stackTrace = new Error().stack || '';
		const callCount = (stackTrace.match(/extractQueryPairs/g) || []).length;
		if (callCount > 3) {
			console.warn('Potential infinite recursion detected in extractQueryPairs');
			return [];
		}

		// Normalize the query to handle multiple spaces
		const normalizedQuery = normalizeSpaces(query);

		// Create input stream and lexer with normalized query
		const input = normalizedQuery || '';
		const chars = CharStreams.fromString(input);
		const lexer = new FilterQueryLexer(chars);

		// Create token stream and force token generation
		const tokenStream = new CommonTokenStream(lexer);
		tokenStream.fill();

		// Get all tokens including whitespace
		const allTokens = tokenStream.tokens as IToken[];

		const queryPairs: IQueryPair[] = [];
		let currentPair: Partial<IQueryPair> | null = null;

		// Process tokens to build triplets
		for (let i = 0; i < allTokens.length; i++) {
			const token = allTokens[i];

			// Skip EOF and whitespace tokens
			if (token.type === FilterQueryLexer.EOF || token.channel !== 0) {
				continue;
			}

			// If token is a KEY, start a new pair
			if (token.type === FilterQueryLexer.KEY) {
				// If we have an existing incomplete pair, add it to the result
				if (currentPair && currentPair.key) {
					queryPairs.push({
						key: currentPair.key,
						operator: currentPair.operator || '',
						value: currentPair.value,
						position: {
							keyStart: currentPair.position?.keyStart || 0,
							keyEnd: currentPair.position?.keyEnd || 0,
							operatorStart: currentPair.position?.operatorStart || 0,
							operatorEnd: currentPair.position?.operatorEnd || 0,
							valueStart: currentPair.position?.valueStart,
							valueEnd: currentPair.position?.valueEnd,
						},
						isComplete: !!(
							currentPair.key &&
							currentPair.operator &&
							currentPair.value
						),
					} as IQueryPair);
				}

				// Start a new pair
				currentPair = {
					key: token.text,
					position: {
						keyStart: token.start,
						keyEnd: token.stop,
						operatorStart: 0, // Initialize with default values
						operatorEnd: 0, // Initialize with default values
					},
				};
			}
			// If token is an operator and we have a key, add the operator
			else if (
				isOperatorToken(token.type) &&
				currentPair &&
				currentPair.key &&
				!currentPair.operator
			) {
				currentPair.operator = token.text;
				// Ensure we create a valid position object with all required fields
				currentPair.position = {
					keyStart: currentPair.position?.keyStart || 0,
					keyEnd: currentPair.position?.keyEnd || 0,
					operatorStart: token.start,
					operatorEnd: token.stop,
					valueStart: currentPair.position?.valueStart,
					valueEnd: currentPair.position?.valueEnd,
				};
			}
			// If token is a value and we have a key and operator, add the value
			else if (
				isValueToken(token.type) &&
				currentPair &&
				currentPair.key &&
				currentPair.operator &&
				!currentPair.value
			) {
				currentPair.value = token.text;
				// Ensure we create a valid position object with all required fields
				currentPair.position = {
					keyStart: currentPair.position?.keyStart || 0,
					keyEnd: currentPair.position?.keyEnd || 0,
					operatorStart: currentPair.position?.operatorStart || 0,
					operatorEnd: currentPair.position?.operatorEnd || 0,
					valueStart: token.start,
					valueEnd: token.stop,
				};
			}
			// If token is a conjunction (AND/OR), finalize the current pair
			else if (isConjunctionToken(token.type) && currentPair && currentPair.key) {
				queryPairs.push({
					key: currentPair.key,
					operator: currentPair.operator || '',
					value: currentPair.value,
					position: {
						keyStart: currentPair.position?.keyStart || 0,
						keyEnd: currentPair.position?.keyEnd || 0,
						operatorStart: currentPair.position?.operatorStart || 0,
						operatorEnd: currentPair.position?.operatorEnd || 0,
						valueStart: currentPair.position?.valueStart,
						valueEnd: currentPair.position?.valueEnd,
					},
					isComplete: !!(
						currentPair.key &&
						currentPair.operator &&
						currentPair.value
					),
				} as IQueryPair);

				// Reset for the next pair
				currentPair = null;
			}
		}

		// Add the last pair if not already added
		if (currentPair && currentPair.key) {
			queryPairs.push({
				key: currentPair.key,
				operator: currentPair.operator || '',
				value: currentPair.value,
				position: {
					keyStart: currentPair.position?.keyStart || 0,
					keyEnd: currentPair.position?.keyEnd || 0,
					operatorStart: currentPair.position?.operatorStart || 0,
					operatorEnd: currentPair.position?.operatorEnd || 0,
					valueStart: currentPair.position?.valueStart,
					valueEnd: currentPair.position?.valueEnd,
				},
				isComplete: !!(
					currentPair.key &&
					currentPair.operator &&
					currentPair.value
				),
			} as IQueryPair);
		}

		return queryPairs;
	} catch (error) {
		console.error('Error in extractQueryPairs:', error);
		return [];
	}
}

/**
 * Gets the current query pair at the cursor position
 * This is useful for getting suggestions based on the current context
 * The function finds the rightmost complete pair that ends before or at the cursor position
 *
 * @param query The query string
 * @param cursorIndex The position of the cursor in the query
 * @returns The query pair at the cursor position, or null if not found
 */
export function getCurrentQueryPair(
	query: string,
	cursorIndex: number,
): IQueryPair | null {
	try {
		const queryPairs = extractQueryPairs(query);
		// Removed the circular dependency by not calling getQueryContextAtCursor here

		// If we have pairs, try to find the one at the cursor position
		if (queryPairs.length > 0) {
			// Look for the rightmost pair whose end position is before or at the cursor
			let bestMatch: IQueryPair | null = null;

			for (const pair of queryPairs) {
				const { position } = pair;

				// Find the rightmost position of this pair
				const pairEnd =
					position.valueEnd || position.operatorEnd || position.keyEnd;

				// If this pair ends at or before the cursor, and it's further right than our previous best match
				if (
					pairEnd <= cursorIndex &&
					(!bestMatch ||
						pairEnd >
							(bestMatch.position.valueEnd ||
								bestMatch.position.operatorEnd ||
								bestMatch.position.keyEnd))
				) {
					bestMatch = pair;
				}
			}

			// If we found a match, return it
			if (bestMatch) {
				return bestMatch;
			}

			// If cursor is at the very beginning, before any pairs, return null
			if (cursorIndex === 0) {
				return null;
			}

			// If no match found and cursor is at the end, return the last pair
			if (cursorIndex >= query.length && queryPairs.length > 0) {
				return queryPairs[queryPairs.length - 1];
			}
		}

		// If no valid pair is found, and we cannot infer one from context, return null
		return null;
	} catch (error) {
		console.error('Error in getCurrentQueryPair:', error);
		return null;
	}
}

// Helper function to check if a token is an operator
function isOperatorToken(tokenType: number): boolean {
	return [
		FilterQueryLexer.EQUALS,
		FilterQueryLexer.NOT_EQUALS,
		FilterQueryLexer.NEQ,
		FilterQueryLexer.LT,
		FilterQueryLexer.LE,
		FilterQueryLexer.GT,
		FilterQueryLexer.GE,
		FilterQueryLexer.LIKE,
		FilterQueryLexer.NOT_LIKE,
		FilterQueryLexer.ILIKE,
		FilterQueryLexer.NOT_ILIKE,
		FilterQueryLexer.BETWEEN,
		FilterQueryLexer.EXISTS,
		FilterQueryLexer.REGEXP,
		FilterQueryLexer.CONTAINS,
		FilterQueryLexer.IN,
		FilterQueryLexer.NOT,
	].includes(tokenType);
}

// Helper function to check if a token is a value
function isValueToken(tokenType: number): boolean {
	return [
		FilterQueryLexer.QUOTED_TEXT,
		FilterQueryLexer.NUMBER,
		FilterQueryLexer.BOOL,
	].includes(tokenType);
}

// Helper function to check if a token is a conjunction
function isConjunctionToken(tokenType: number): boolean {
	return [FilterQueryLexer.AND, FilterQueryLexer.OR].includes(tokenType);
}

/**
 * Usage example for query context with pairs:
 *
 * ```typescript
 * // Get context at cursor position
 * const context = getQueryContextAtCursor(query, cursorPosition);
 *
 * // Access all query pairs
 * const allPairs = context.queryPairs || [];
 * console.log(`Query contains ${allPairs.length} key-operator-value triplets`);
 *
 * // Access the current pair at cursor
 * if (context.currentPair) {
 *   // Use the current triplet to provide relevant suggestions
 *   const { key, operator, value } = context.currentPair;
 *   console.log(`Current context: ${key} ${operator} ${value || ''}`);
 *
 *   // Check if this is a complete triplet
 *   if (context.currentPair.isComplete) {
 *     // All parts (key, operator, value) are present
 *   } else {
 *     // Incomplete - might be missing operator or value
 *   }
 * } else {
 *   // No current pair, likely at the start of a new condition
 * }
 * ```
 */
