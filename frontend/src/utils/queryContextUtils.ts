/* eslint-disable */

import { CharStreams, CommonTokenStream, Token } from 'antlr4';
import FilterQueryLexer from 'parser/FilterQueryLexer';
import { IQueryContext, IQueryPair, IToken } from 'types/antlrQueryTypes';
import { analyzeQuery } from 'parser/analyzeQuery';
import {
	isBracketToken,
	isConjunctionToken,
	isFunctionToken,
	isKeyToken,
	isMultiValueOperator,
	isNonValueOperatorToken,
	isOperatorToken,
	isQueryPairComplete,
	isValueToken,
} from './tokenUtils';
import { NON_VALUE_OPERATORS } from 'constants/antlrQueryConstants';

// Function to create a context object
export function createContext(
	token: Token,
	isInKey: boolean,
	isInNegation: boolean,
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
		isInNegation,
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
	token: IToken,
	query: string,
): {
	isInKey: boolean;
	isInNegation: boolean;
	isInOperator: boolean;
	isInValue: boolean;
	isInFunction: boolean;
	isInConjunction: boolean;
	isInParenthesis: boolean;
} {
	let isInKey: boolean = false;
	let isInNegation: boolean = false;
	let isInOperator: boolean = false;
	let isInValue: boolean = false;
	let isInFunction: boolean = false;
	let isInConjunction: boolean = false;
	let isInParenthesis: boolean = false;

	const tokenType = token.type;
	const currentTokenContext = analyzeQuery(query, token);

	if (!currentTokenContext) {
		// Key context
		isInKey = isKeyToken(tokenType);

		// Operator context
		isInOperator = isOperatorToken(tokenType);

		// Value context
		isInValue = isValueToken(tokenType);
	} else {
		switch (currentTokenContext.type) {
			case 'Operator':
				isInOperator = true;
				break;
			case 'Value':
				isInValue = true;
				break;
			case 'Key':
				isInKey = true;
				break;
			default:
				break;
		}
	}

	// Negation context
	isInNegation = tokenType === FilterQueryLexer.NOT;

	// Function context
	isInFunction = isFunctionToken(tokenType);

	// Conjunction context
	isInConjunction = isConjunctionToken(tokenType);

	// Parenthesis context
	isInParenthesis = isBracketToken(tokenType);

	return {
		isInKey,
		isInNegation,
		isInOperator,
		isInValue,
		isInFunction,
		isInConjunction,
		isInParenthesis,
	};
}

export function getCurrentValueIndexAtCursor(
	valuesPosition: {
		start?: number;
		end?: number;
	}[],
	cursorIndex: number,
): number | null {
	if (!valuesPosition || valuesPosition.length === 0) return null;

	// Find the value that contains the cursor index
	for (let i = 0; i < valuesPosition.length; i++) {
		const start = valuesPosition[i].start;
		const end = valuesPosition[i].end;
		if (
			start !== undefined &&
			end !== undefined &&
			start <= cursorIndex &&
			cursorIndex <= end
		) {
			return i;
		}
	}

	return null;
}

// Function to determine token context boundaries more precisely
function determineContextBoundaries(
	query: string,
	cursorIndex: number,
	tokens: IToken[],
	queryPairs: IQueryPair[],
): {
	keyContext: { start: number; end: number } | null;
	operatorContext: { start: number; end: number } | null;
	valueContext: { start: number; end: number } | null;
	conjunctionContext: { start: number; end: number } | null;
	negationContext: { start: number; end: number } | null;
	bracketContext: { start: number; end: number; isForList: boolean } | null;
} {
	// Find the current query pair based on cursor position
	let currentPair: IQueryPair | null = null;

	if (queryPairs.length > 0) {
		currentPair = getCurrentQueryPair(queryPairs, query, cursorIndex);
	}

	// Check for bracket context first (could be part of an IN operator's value)
	let bracketContext: {
		start: number;
		end: number;
		isForList: boolean;
	} | null = null;

	// Find bracket tokens that might contain the cursor
	const openBrackets: { token: IToken; isForList: boolean }[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];

		// Skip tokens on hidden channel
		if (token.channel !== 0) continue;

		// Track opening brackets
		if (
			token.type === FilterQueryLexer.LBRACK ||
			token.type === FilterQueryLexer.LPAREN
		) {
			// Check if this opening bracket is for a list (used with IN operator)
			let isForList = false;

			// Look back to see if this bracket follows an IN operator
			if (i > 0) {
				for (let j = i - 1; j >= 0; j--) {
					const prevToken = tokens[j];
					if (prevToken.channel !== 0) continue; // Skip hidden channel tokens

					if (
						prevToken.type === FilterQueryLexer.IN ||
						(prevToken.type === FilterQueryLexer.NOT &&
							j + 1 < tokens.length &&
							tokens[j + 1].type === FilterQueryLexer.IN)
					) {
						isForList = true;
						break;
					} else if (prevToken.channel === 0 && !isValueToken(prevToken.type)) {
						// If we encounter a non-value token that's not IN, stop looking
						break;
					}
				}
			}

			openBrackets.push({ token, isForList });
		}

		// If this is a closing bracket, check if cursor is within this bracket pair
		else if (
			(token.type === FilterQueryLexer.RBRACK ||
				token.type === FilterQueryLexer.RPAREN) &&
			openBrackets.length > 0
		) {
			const matchingOpen = openBrackets.pop();

			// If cursor is within these brackets and they're for a list
			if (
				matchingOpen &&
				matchingOpen.token.start <= cursorIndex &&
				cursorIndex <= token.stop + 1
			) {
				bracketContext = {
					start: matchingOpen.token.start,
					end: token.stop,
					isForList: matchingOpen.isForList,
				};
				break;
			}

			// Check if cursor is right after the closing bracket (with a space)
			// We need to handle this case to transition to conjunction context
			if (
				matchingOpen &&
				token.stop + 1 < cursorIndex &&
				cursorIndex <= token.stop + 2 &&
				query[token.stop + 1] === ' '
			) {
				// We'll set a special flag to indicate we're after a closing bracket
				bracketContext = {
					start: matchingOpen.token.start,
					end: token.stop,
					isForList: matchingOpen.isForList,
				};
				break;
			}
		}

		// If we're at the cursor position and not in a closing bracket check
		if (token.start <= cursorIndex && cursorIndex <= token.stop + 1) {
			// If cursor is within an opening bracket token
			if (
				token.type === FilterQueryLexer.LBRACK ||
				token.type === FilterQueryLexer.LPAREN
			) {
				// Check if this is the start of a list for IN operator
				let isForList = false;

				// Look back to see if this bracket follows an IN operator
				for (let j = i - 1; j >= 0; j--) {
					const prevToken = tokens[j];
					if (prevToken.channel !== 0) continue; // Skip hidden channel tokens

					if (
						prevToken.type === FilterQueryLexer.IN ||
						(prevToken.type === FilterQueryLexer.NOT &&
							j + 1 < tokens.length &&
							tokens[j + 1].type === FilterQueryLexer.IN)
					) {
						isForList = true;
						break;
					} else if (prevToken.channel === 0) {
						// If we encounter any token on the default channel, stop looking
						break;
					}
				}

				bracketContext = {
					start: token.start,
					end: token.stop,
					isForList,
				};
				break;
			}

			// If cursor is within a closing bracket token
			if (
				token.type === FilterQueryLexer.RBRACK ||
				token.type === FilterQueryLexer.RPAREN
			) {
				if (openBrackets.length > 0) {
					const matchingOpen = openBrackets[openBrackets.length - 1];
					bracketContext = {
						start: matchingOpen.token.start,
						end: token.stop,
						isForList: matchingOpen.isForList,
					};
				} else {
					bracketContext = {
						start: token.start,
						end: token.stop,
						isForList: false, // We don't know, assume not list
					};
				}
				break;
			}
		}
	}

	// If we have a current pair, determine context boundaries from it
	if (currentPair) {
		const { position } = currentPair;

		// Negation context: from negationStart to negationEnd
		const negationContext = {
			start: position.negationStart ?? 0,
			end: position.negationEnd ?? 0,
		};

		// Key context: from keyStart to keyEnd
		const keyContext = {
			start: position.keyStart,
			end: position.keyEnd,
		};

		// Find the operator context start by looking for the first non-space character after keyEnd
		let operatorStart = position.keyEnd + 1;
		while (operatorStart < query.length && query[operatorStart] === ' ') {
			operatorStart++;
		}

		// Operator context: from first non-space after key to operatorEnd
		const operatorContext = {
			start: operatorStart,
			end: position.operatorEnd,
		};

		// Find the value context start by looking for the first non-space character after operatorEnd
		let valueStart = position.operatorEnd + 1;
		while (valueStart < query.length && query[valueStart] === ' ') {
			valueStart++;
		}

		// Special handling for multi-value operators like IN
		const isInOperator = isMultiValueOperator(currentPair.operator);

		// Value context: from first non-space after operator to valueEnd (if exists)
		// If this is an IN operator and we're in a bracket context, use that instead
		let valueContext = null;

		if (isInOperator && bracketContext && bracketContext.isForList) {
			// For IN operator with brackets, the whole bracket content is the value context
			valueContext = {
				start: bracketContext.start,
				end: bracketContext.end,
			};
		} else if (position.valueEnd) {
			valueContext = {
				start: valueStart,
				end: position.valueEnd,
			};
		}

		// Look for conjunction after value (if value exists)
		let conjunctionContext = null;
		if (position.valueEnd) {
			let conjunctionStart = position.valueEnd + 1;
			while (conjunctionStart < query.length && query[conjunctionStart] === ' ') {
				conjunctionStart++;
			}

			// Check if there's a conjunction token after the value
			for (const token of tokens) {
				if (
					token.start === conjunctionStart &&
					(token.type === FilterQueryLexer.AND || token.type === FilterQueryLexer.OR)
				) {
					conjunctionContext = {
						start: conjunctionStart,
						end: token.stop,
					};
					break;
				}
			}
		}

		return {
			keyContext,
			negationContext,
			operatorContext,
			valueContext,
			conjunctionContext,
			bracketContext,
		};
	}

	// If no current pair but there might be a partial pair under construction,
	// try to determine context from tokens directly
	const tokenAtCursor = tokens.find(
		(token) =>
			token.channel === 0 &&
			token.start <= cursorIndex &&
			cursorIndex <= token.stop + 1,
	);

	if (tokenAtCursor) {
		// Check token type to determine context
		if (tokenAtCursor.type === FilterQueryLexer.KEY) {
			return {
				keyContext: { start: tokenAtCursor.start, end: tokenAtCursor.stop },
				negationContext: null,
				operatorContext: null,
				valueContext: null,
				conjunctionContext: null,
				bracketContext,
			};
		}

		if (tokenAtCursor.type === FilterQueryLexer.NOT) {
			return {
				keyContext: null,
				negationContext: { start: tokenAtCursor.start, end: tokenAtCursor.stop },
				operatorContext: null,
				valueContext: null,
				conjunctionContext: null,
				bracketContext,
			};
		}

		if (isOperatorToken(tokenAtCursor.type)) {
			return {
				keyContext: null,
				negationContext: null,
				operatorContext: { start: tokenAtCursor.start, end: tokenAtCursor.stop },
				valueContext: null,
				conjunctionContext: null,
				bracketContext,
			};
		}

		if (isValueToken(tokenAtCursor.type)) {
			return {
				keyContext: null,
				negationContext: null,
				operatorContext: null,
				valueContext: { start: tokenAtCursor.start, end: tokenAtCursor.stop },
				conjunctionContext: null,
				bracketContext,
			};
		}

		if (isConjunctionToken(tokenAtCursor.type)) {
			return {
				keyContext: null,
				negationContext: null,
				operatorContext: null,
				valueContext: null,
				conjunctionContext: { start: tokenAtCursor.start, end: tokenAtCursor.stop },
				bracketContext,
			};
		}
	}

	// If no current pair, return null for all contexts except possibly bracket context
	return {
		keyContext: null,
		negationContext: null,
		operatorContext: null,
		valueContext: null,
		conjunctionContext: null,
		bracketContext,
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
				isInNegation: false,
				isInOperator: false,
				isInValue: false,
				isInFunction: false,
				isInConjunction: false,
				isInParenthesis: false,
				isInBracketList: false,
				queryPairs: [],
				currentPair: null,
			};
		}

		// First check if the cursor is at a token boundary or within a whitespace area
		// This is critical for context detection
		const isAtSpace = cursorIndex < query.length && query[cursorIndex] === ' ';
		const isAfterSpace = cursorIndex > 0 && query[cursorIndex - 1] === ' ';
		const isAfterToken = cursorIndex > 0 && query[cursorIndex - 1] !== ' ';
		const isBeforeToken =
			cursorIndex < query.length && query[cursorIndex] !== ' ';

		// Check if cursor is right after a token and at the start of a space
		// FIXED: Consider the cursor to be at a transition point if it's at the end of a token
		// and not yet at a space (this includes being at the end of the query)
		const isTransitionPoint =
			(isAtSpace && isAfterToken) ||
			(cursorIndex === query.length && isAfterToken);

		// Create input stream and lexer with query
		const input = query || '';
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

			// FIXED: Consider a token to be the lastTokenBeforeCursor if the cursor is
			// exactly at the end of the token (including the last character)
			if (token.stop < cursorIndex || token.stop + 1 === cursorIndex) {
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
			currentPair = getCurrentQueryPair(queryPairs, query, cursorIndex);
		}

		// Determine precise context boundaries
		const contextBoundaries = determineContextBoundaries(
			query,
			cursorIndex,
			allTokens,
			queryPairs,
		);

		// Check if cursor is within any of the specific context boundaries
		// FIXED: Include the case where the cursor is exactly at the end of a boundary
		const isInKeyBoundary =
			contextBoundaries.keyContext &&
			((cursorIndex >= contextBoundaries.keyContext.start &&
				cursorIndex <= contextBoundaries.keyContext.end) ||
				cursorIndex === contextBoundaries.keyContext.end + 1);

		const isInNegationBoundary =
			contextBoundaries.negationContext &&
			((cursorIndex >= contextBoundaries.negationContext.start &&
				cursorIndex <= contextBoundaries.negationContext.end) ||
				cursorIndex === contextBoundaries.negationContext.end + 1);

		const isInOperatorBoundary =
			contextBoundaries.operatorContext &&
			((cursorIndex >= contextBoundaries.operatorContext.start &&
				cursorIndex <= contextBoundaries.operatorContext.end) ||
				cursorIndex === contextBoundaries.operatorContext.end + 1);

		const isInValueBoundary =
			contextBoundaries.valueContext &&
			((cursorIndex >= contextBoundaries.valueContext.start &&
				cursorIndex <= contextBoundaries.valueContext.end) ||
				cursorIndex === contextBoundaries.valueContext.end + 1);

		const isInConjunctionBoundary =
			contextBoundaries.conjunctionContext &&
			((cursorIndex >= contextBoundaries.conjunctionContext.start &&
				cursorIndex <= contextBoundaries.conjunctionContext.end) ||
				cursorIndex === contextBoundaries.conjunctionContext.end + 1);

		// Check for bracket list context (used for IN operator values)
		const isInBracketListBoundary =
			contextBoundaries.bracketContext &&
			contextBoundaries.bracketContext.isForList &&
			cursorIndex >= contextBoundaries.bracketContext.start &&
			cursorIndex <= contextBoundaries.bracketContext.end + 1;

		// Check for general parenthesis context (not for IN operator lists)
		const isInParenthesisBoundary =
			contextBoundaries.bracketContext &&
			!contextBoundaries.bracketContext.isForList &&
			cursorIndex >= contextBoundaries.bracketContext.start &&
			cursorIndex <= contextBoundaries.bracketContext.end + 1;

		// Check if we're right after a closing bracket for a list (IN operator)
		// This helps transition to conjunction context after a multi-value list
		const isAfterClosingBracketList =
			contextBoundaries.bracketContext &&
			contextBoundaries.bracketContext.isForList &&
			cursorIndex === contextBoundaries.bracketContext.end + 2 &&
			query[contextBoundaries.bracketContext.end + 1] === ' ';

		// If cursor is within a specific context boundary, this takes precedence
		if (
			isInKeyBoundary ||
			isInNegationBoundary ||
			isInOperatorBoundary ||
			isInValueBoundary ||
			isInConjunctionBoundary ||
			isInBracketListBoundary ||
			isAfterClosingBracketList
		) {
			// Extract information from the current pair (if available)
			const keyToken = currentPair?.key || '';
			const operatorToken = currentPair?.operator || '';
			const valueToken = currentPair?.value || '';

			// Determine if we're in a multi-value operator context
			const isForMultiValueOperator = isMultiValueOperator(operatorToken);

			// If we're in a bracket list and it's for a multi-value operator like IN,
			// treat it as part of the value context
			const finalIsInValue =
				isInValueBoundary || (isInBracketListBoundary && isForMultiValueOperator);

			// If we're right after a closing bracket for a list, transition to conjunction context
			const finalIsInConjunction =
				isInConjunctionBoundary || isAfterClosingBracketList;

			return {
				tokenType: -1,
				text: '',
				start: cursorIndex,
				stop: cursorIndex,
				currentToken: '',
				isInKey: isInKeyBoundary || false,
				isInNegation: isInNegationBoundary || false,
				isInOperator: isInOperatorBoundary || false,
				isInValue: finalIsInValue || false,
				isInConjunction: finalIsInConjunction || false,
				isInFunction: false,
				isInParenthesis: isInParenthesisBoundary || false,
				isInBracketList: isInBracketListBoundary || false,
				keyToken: isInKeyBoundary
					? keyToken
					: isInOperatorBoundary || finalIsInValue
					? keyToken
					: undefined,
				operatorToken: isInOperatorBoundary
					? operatorToken
					: finalIsInValue
					? operatorToken
					: undefined,
				valueToken: finalIsInValue ? valueToken : undefined,
				queryPairs: queryPairs,
				currentPair: currentPair,
			};
		}

		// Continue with existing token-based logic for cases not covered by context boundaries
		// Handle cursor at the very end of input
		if (cursorIndex >= input.length && allTokens.length > 0) {
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

				// FIXED: Check if cursor is within token bounds (inclusive) or exactly at the end
				if (token.start <= cursorIndex && cursorIndex <= token.stop + 1) {
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

					if (current.stop + 1 < cursorIndex && cursorIndex < next.start) {
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
				start: cursorIndex,
				stop: cursorIndex,
				currentToken: '',
				isInKey: true, // Default to key context when input is empty
				isInNegation: false,
				isInOperator: false,
				isInValue: false,
				isInFunction: false,
				isInConjunction: false,
				isInParenthesis: false,
				isInBracketList: false,
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
			const lastTokenContext = determineTokenContext(lastTokenBeforeCursor, input);

			// Apply the context progression logic: key → operator → value → conjunction → key
			if (lastTokenContext.isInKey) {
				// If we just typed a key and then a space, we move to operator context
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: true, // After key + space, should be operator context
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					isInBracketList: false,
					keyToken: lastTokenBeforeCursor.text,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (lastTokenContext.isInNegation) {
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: true, // After key + space + NOT, should be operator context
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					isInBracketList: false,
					keyToken: lastTokenBeforeCursor.text,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (lastTokenContext.isInOperator) {
				// If we just typed an operator and then a space, we move to value context
				const keyFromPair = currentPair?.key || '';
				const isNonValueToken = isNonValueOperatorToken(lastTokenBeforeCursor.type);
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: false,
					isInValue: !isNonValueToken, // After operator + space, should be value context
					isInFunction: false,
					isInConjunction: isNonValueToken,
					isInParenthesis: false,
					isInBracketList: false,
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
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: true, // After value + space, should be conjunction context
					isInParenthesis: false,
					isInBracketList: false,
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
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: true, // After conjunction + space, should be key context
					isInNegation: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					isInBracketList: false,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (
				lastTokenContext.isInParenthesis &&
				lastTokenBeforeCursor.type === FilterQueryLexer.RPAREN
			) {
				// If we are after a parenthesis we should enter the conjunction context.
				return {
					tokenType: lastTokenBeforeCursor.type,
					text: lastTokenBeforeCursor.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: lastTokenBeforeCursor.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: true, // After RPARAN + space, should be conjunction context
					isInParenthesis: false,
					isInBracketList: false,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}
		}

		// FIXED: Consider the case where the cursor is at the end of a token
		// with no space yet (user is actively typing)
		if (exactToken && cursorIndex === exactToken.stop + 1) {
			const tokenContext = determineTokenContext(exactToken, input);

			// When the cursor is at the end of a token, return the current token context
			return {
				tokenType: exactToken.type,
				text: exactToken.text,
				start: exactToken.start,
				stop: exactToken.stop,
				currentToken: exactToken.text,
				...tokenContext,
				isInBracketList: false,
				keyToken: tokenContext.isInKey
					? exactToken.text
					: currentPair?.key || undefined,
				operatorToken: tokenContext.isInOperator
					? exactToken.text
					: currentPair?.operator || undefined,
				valueToken: tokenContext.isInValue
					? exactToken.text
					: currentPair?.value || undefined,
				queryPairs: queryPairs,
				currentPair: currentPair,
			};
		}

		// Regular token-based context detection (when cursor is directly on a token)
		if (exactToken?.channel === 0) {
			const tokenContext = determineTokenContext(exactToken, input);

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
				isInBracketList: false,
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
			const prevContext = determineTokenContext(previousToken, input);

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
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: previousToken.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: false,
					isInValue: true, // Always in value context after operator
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					isInBracketList: false,
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
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: previousToken.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: true, // After key, progress to operator context
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					isInBracketList: false,
					keyToken: previousToken.text,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}

			if (prevContext.isInValue) {
				return {
					tokenType: previousToken.type,
					text: previousToken.text,
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: previousToken.text,
					isInKey: false,
					isInNegation: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: true, // After value, progress to conjunction context
					isInParenthesis: false,
					isInBracketList: false,
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
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: previousToken.text,
					isInKey: true, // After conjunction, progress back to key context
					isInNegation: false,
					isInOperator: false,
					isInValue: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					isInBracketList: false,
					queryPairs: queryPairs,
					currentPair: currentPair,
				};
			}
		}

		// Default fallback to key context
		return {
			tokenType: -1,
			text: '',
			start: cursorIndex,
			stop: cursorIndex,
			currentToken: '',
			isInKey: true,
			isInNegation: false,
			isInOperator: false,
			isInValue: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
			isInBracketList: false,
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
			isInNegation: false,
			isInOperator: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
			isInBracketList: false,
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

		// Create input stream and lexer with query query
		const input = query || '';
		const chars = CharStreams.fromString(input);
		const lexer = new FilterQueryLexer(chars);

		// Create token stream and force token generation
		const tokenStream = new CommonTokenStream(lexer);
		tokenStream.fill();

		// Get all tokens including whitespace
		const allTokens = tokenStream.tokens as IToken[];

		const queryPairs: IQueryPair[] = [];
		let currentPair: Partial<IQueryPair> | null = null;

		let iterator = 0;

		// Process tokens to build triplets
		while (iterator < allTokens.length) {
			const token = allTokens[iterator];
			iterator += 1;

			// Skip EOF and whitespace tokens
			if (token.type === FilterQueryLexer.EOF || token.channel !== 0) {
				continue;
			}

			// If token is a KEY, start a new pair
			if (
				token.type === FilterQueryLexer.KEY &&
				!(currentPair && currentPair.key)
			) {
				// If we have an existing incomplete pair, add it to the result
				if (currentPair && currentPair.key) {
					queryPairs.push({
						key: currentPair.key,
						operator: currentPair.operator || '',
						value: currentPair.value,
						valueList: currentPair.valueList || [],
						valuesPosition: currentPair.valuesPosition || [],
						hasNegation: currentPair.hasNegation || false,
						isMultiValue: currentPair.isMultiValue || false,
						position: {
							keyStart: currentPair.position?.keyStart || 0,
							keyEnd: currentPair.position?.keyEnd || 0,
							operatorStart: currentPair.position?.operatorStart || 0,
							operatorEnd: currentPair.position?.operatorEnd || 0,
							valueStart: currentPair.position?.valueStart,
							valueEnd: currentPair.position?.valueEnd,
							negationStart: currentPair.position?.negationStart || 0,
							negationEnd: currentPair.position?.negationEnd || 0,
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
			// If NOT token comes set hasNegation to true
			else if (token.type === FilterQueryLexer.NOT && currentPair) {
				currentPair.hasNegation = true;

				currentPair.position = {
					keyStart: currentPair.position?.keyStart || 0,
					keyEnd: currentPair.position?.keyEnd || 0,
					operatorStart: currentPair.position?.operatorStart || 0,
					operatorEnd: currentPair.position?.operatorEnd || 0,
					valueStart: currentPair.position?.valueStart,
					valueEnd: currentPair.position?.valueEnd,
					negationStart: token.start,
					negationEnd: token.stop,
				};
			}

			// If token is an operator and we have a key, add the operator
			else if (
				isOperatorToken(token.type) &&
				currentPair &&
				currentPair.key &&
				!currentPair.operator
			) {
				let multiValueStart: number | undefined;
				let multiValueEnd: number | undefined;

				if (isMultiValueOperator(token.text)) {
					currentPair.isMultiValue = true;

					// Iterate from '[' || '(' till ']' || ')' to get all the values
					const valueList: string[] = [];
					const valuesPosition: { start: number; end: number }[] = [];

					if (
						[FilterQueryLexer.LPAREN, FilterQueryLexer.LBRACK].includes(
							allTokens[iterator].type,
						)
					) {
						// Capture opening token type before advancing
						const openingTokenType = allTokens[iterator].type;
						multiValueStart = allTokens[iterator].start;
						iterator += 1;
						const closingToken =
							openingTokenType === FilterQueryLexer.LPAREN
								? FilterQueryLexer.RPAREN
								: FilterQueryLexer.RBRACK;

						while (
							allTokens[iterator].type !== closingToken &&
							iterator < allTokens.length
						) {
							if (isValueToken(allTokens[iterator].type)) {
								valueList.push(allTokens[iterator].text);
								valuesPosition.push({
									start: allTokens[iterator].start,
									end: allTokens[iterator].stop,
								});
							}
							iterator += 1;
						}

						if (allTokens[iterator].type === closingToken) {
							multiValueEnd = allTokens[iterator].stop;
						}
					} else if (isValueToken(allTokens[iterator].type)) {
						valueList.push(allTokens[iterator].text);
						valuesPosition.push({
							start: allTokens[iterator].start,
							end: allTokens[iterator].stop,
						});
						multiValueStart = allTokens[iterator].start;
						multiValueEnd = allTokens[iterator].stop;
						iterator += 1;
					}

					currentPair.valuesPosition = valuesPosition;
					currentPair.valueList = valueList;

					if (multiValueStart && multiValueEnd) {
						currentPair.value = query.substring(multiValueStart, multiValueEnd + 1);
					}
				}

				currentPair.operator = token.text;
				// Ensure we create a valid position object with all required fields
				currentPair.position = {
					keyStart: currentPair.position?.keyStart || 0,
					keyEnd: currentPair.position?.keyEnd || 0,
					operatorStart: token.start,
					operatorEnd: token.stop,
					valueStart: multiValueStart || currentPair.position?.valueStart,
					valueEnd: multiValueEnd || currentPair.position?.valueEnd,
					negationStart: currentPair.position?.negationStart || 0,
					negationEnd: currentPair.position?.negationEnd || 0,
				};
			}
			// If token is a value and we have a key and operator, add the value
			else if (
				isValueToken(token.type) &&
				currentPair &&
				currentPair.key &&
				currentPair.operator &&
				!NON_VALUE_OPERATORS.includes(currentPair.operator) &&
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
					negationStart: currentPair.position?.negationStart || 0,
					negationEnd: currentPair.position?.negationEnd || 0,
				};
			}
			// If token is a conjunction (AND/OR) or A key, finalize the current pair
			else if (
				currentPair &&
				currentPair.key &&
				(isConjunctionToken(token.type) ||
					(token.type === FilterQueryLexer.KEY && isQueryPairComplete(currentPair)))
			) {
				queryPairs.push({
					key: currentPair.key,
					operator: currentPair.operator || '',
					value: currentPair.value,
					valueList: currentPair.valueList || [],
					valuesPosition: currentPair.valuesPosition || [],
					hasNegation: currentPair.hasNegation || false,
					isMultiValue: currentPair.isMultiValue || false,
					position: {
						keyStart: currentPair.position?.keyStart || 0,
						keyEnd: currentPair.position?.keyEnd || 0,
						operatorStart: currentPair.position?.operatorStart || 0,
						operatorEnd: currentPair.position?.operatorEnd || 0,
						valueStart: currentPair.position?.valueStart,
						valueEnd: currentPair.position?.valueEnd,
						negationStart: currentPair.position?.negationStart || 0,
						negationEnd: currentPair.position?.negationEnd || 0,
					},
					isComplete: !!(
						currentPair.key &&
						currentPair.operator &&
						currentPair.value
					),
				} as IQueryPair);

				// Reset for the next pair
				currentPair = null;

				if (token.type === FilterQueryLexer.KEY) {
					// If we encounter a new key, start a new pair immediately
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
			}
		}

		// Add the last pair if not already added
		if (currentPair && currentPair.key) {
			queryPairs.push({
				key: currentPair.key,
				operator: currentPair.operator || '',
				value: currentPair.value,
				valueList: currentPair.valueList || [],
				valuesPosition: currentPair.valuesPosition || [],
				hasNegation: currentPair.hasNegation || false,
				isMultiValue: currentPair.isMultiValue || false,
				position: {
					keyStart: currentPair.position?.keyStart || 0,
					keyEnd: currentPair.position?.keyEnd || 0,
					operatorStart: currentPair.position?.operatorStart || 0,
					operatorEnd: currentPair.position?.operatorEnd || 0,
					valueStart: currentPair.position?.valueStart,
					valueEnd: currentPair.position?.valueEnd,
					negationStart: currentPair.position?.negationStart || 0,
					negationEnd: currentPair.position?.negationEnd || 0,
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

function getEndIndexAfterSpaces(pair: IQueryPair, query: string): number {
	const { position } = pair;
	let pairEnd = position.valueEnd || position.operatorEnd || position.keyEnd;

	// Start from the next index after pairEnd
	pairEnd += 1;
	while (pairEnd < query.length && query.charAt(pairEnd) === ' ') {
		pairEnd += 1;
	}

	return pairEnd;
}

/**
 * Gets the current query pair at the cursor position
 * This is useful for getting suggestions based on the current context
 * The function finds the rightmost complete pair that ends before or at the cursor position
 *
 * @param queryPairs An array of IQueryPair objects representing the key-operator-value triplets
 * @param query The full query string
 * @param cursorIndex The position of the cursor in the query
 * @returns The query pair at the cursor position, or null if not found
 */
export function getCurrentQueryPair(
	queryPairs: IQueryPair[],
	query: string,
	cursorIndex: number,
): IQueryPair | null {
	try {
		// If we have pairs, try to find the one at the cursor position
		if (queryPairs.length > 0) {
			// Look for the rightmost pair whose end position is before or at the cursor
			let bestMatch: IQueryPair | null = null;

			for (const pair of queryPairs) {
				const { position } = pair;

				// Find the rightmost position of this pair
				const pairEnd =
					position.valueEnd || position.operatorEnd || position.keyEnd;

				const pairStart =
					position.keyStart ?? (position.operatorStart || position.valueStart || 0);

				// If this pair ends at or before the cursor, and it's further right than our previous best match
				if (
					((pairEnd >= cursorIndex && pairStart <= cursorIndex) ||
						(!pair.isComplete &&
							pairStart <= cursorIndex &&
							getEndIndexAfterSpaces(pair, query) >= cursorIndex)) &&
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
