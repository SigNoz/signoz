/* eslint-disable sonarjs/no-collapsible-if */
/* eslint-disable no-continue */
/* eslint-disable sonarjs/cognitive-complexity */
import FilterQueryLexer from 'antlr-parser/FilterQueryLexer';
import FilterQueryParser from 'antlr-parser/FilterQueryParser';
import { CharStreams, CommonTokenStream } from 'antlr4';
import {
	IDetailedError,
	IQueryContext,
	IToken,
	IValidationResult,
} from 'types/antlrQueryTypes';

// Custom error listener to capture ANTLR errors
class QueryErrorListener {
	private errors: IDetailedError[] = [];

	syntaxError(
		_recognizer: any,
		offendingSymbol: any,
		line: number,
		column: number,
		msg: string,
	): void {
		// For unterminated quotes, we only want to show one error
		if (this.hasUnterminatedQuoteError() && msg.includes('expecting')) {
			return;
		}

		const error: IDetailedError = {
			message: msg,
			line,
			column,
			offendingSymbol: offendingSymbol?.text || String(offendingSymbol),
		};

		// Extract expected tokens if available
		if (msg.includes('expecting')) {
			const expectedTokens = msg
				.split('expecting')[1]
				.trim()
				.split(',')
				.map((token) => token.trim());
			error.expectedTokens = expectedTokens;
		}

		// Check if this is a duplicate error (same location and similar message)
		const isDuplicate = this.errors.some(
			(e) =>
				e.line === line &&
				e.column === column &&
				this.isSimilarError(e.message, msg),
		);

		if (!isDuplicate) {
			this.errors.push(error);
		}
	}

	private hasUnterminatedQuoteError(): boolean {
		return this.errors.some(
			(error) =>
				error.message.includes('unterminated') ||
				(error.message.includes('missing') && error.message.includes("'")),
		);
	}

	private isSimilarError = (msg1: string, msg2: string): boolean => {
		// Consider errors similar if they're for the same core issue
		const normalize = (msg: string): string =>
			msg.toLowerCase().replace(/['"`]/g, 'quote').replace(/\s+/g, ' ').trim();

		return normalize(msg1) === normalize(msg2);
	};

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	reportAmbiguity = (): void => {};

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	reportAttemptingFullContext = (): void => {};

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	reportContextSensitivity = (): void => {};

	getErrors(): IDetailedError[] {
		return this.errors;
	}

	hasErrors(): boolean {
		return this.errors.length > 0;
	}

	getFormattedErrors(): string[] {
		return this.errors.map((error) => {
			const {
				offendingSymbol,
				expectedTokens,
				message: errorMessage,
				line,
				column,
			} = error;

			let message = `Line ${line}:${column} - ${errorMessage}`;

			if (offendingSymbol && offendingSymbol !== 'undefined') {
				message += `\n Symbol: '${offendingSymbol}'`;
			}

			if (expectedTokens && expectedTokens.length > 0) {
				message += `\n Expected: ${expectedTokens.join(', ')}`;
			}

			return message;
		});
	}
}

export const validateQuery = (query: string): IValidationResult => {
	// Empty query is considered invalid
	if (!query.trim()) {
		return {
			isValid: true,
			message: 'Query is empty',
			errors: [],
		};
	}

	try {
		const errorListener = new QueryErrorListener();
		const inputStream = CharStreams.fromString(query);

		// Setup lexer
		const lexer = new FilterQueryLexer(inputStream);
		lexer.removeErrorListeners(); // Remove default error listeners
		lexer.addErrorListener(errorListener);

		// Setup parser
		const tokenStream = new CommonTokenStream(lexer);
		const parser = new FilterQueryParser(tokenStream);
		parser.removeErrorListeners(); // Remove default error listeners
		parser.addErrorListener(errorListener);

		// Try parsing
		parser.query();

		// Check if any errors were captured
		if (errorListener.hasErrors()) {
			return {
				isValid: false,
				message: 'Query syntax error',
				errors: errorListener.getErrors(),
			};
		}

		return {
			isValid: true,
			message: 'Query is valid!',
			errors: [],
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Invalid query syntax';

		const detailedError: IDetailedError = {
			message: errorMessage,
			line: 0,
			column: 0,
			offendingSymbol: '',
			expectedTokens: [],
		};
		return {
			isValid: false,
			message: 'Invalid query syntax',
			errors: [detailedError],
		};
	}
};

// Helper function to find key-operator-value triplets in token stream
export function findKeyOperatorValueTriplet(
	allTokens: IToken[],
	currentToken: IToken,
	isInKey: boolean,
	isInOperator: boolean,
	isInValue: boolean,
): { keyToken?: string; operatorToken?: string; valueToken?: string } {
	// Find current token index in allTokens
	let currentTokenIndex = -1;
	for (let i = 0; i < allTokens.length; i++) {
		if (
			allTokens[i].start === currentToken.start &&
			allTokens[i].stop === currentToken.stop &&
			allTokens[i].type === currentToken.type
		) {
			currentTokenIndex = i;
			break;
		}
	}

	if (currentTokenIndex === -1) return {};

	// Initialize result with empty object
	const result: {
		keyToken?: string;
		operatorToken?: string;
		valueToken?: string;
	} = {};

	if (isInKey) {
		// When in key context, we only know the key
		result.keyToken = currentToken.text;
	} else if (isInOperator) {
		// When in operator context, we know the operator and can find the preceding key
		result.operatorToken = currentToken.text;

		// Look backward for key
		for (let i = currentTokenIndex - 1; i >= 0; i--) {
			const token = allTokens[i];
			// Skip whitespace and other hidden channel tokens
			if (token.channel !== 0) continue;

			if (token.type === FilterQueryLexer.KEY) {
				result.keyToken = token.text;
				break;
			}
		}
	} else if (isInValue) {
		// When in value context, we know the value and can find the preceding operator and key
		result.valueToken = currentToken.text;

		let foundOperator = false;

		// Look backward for operator and key
		for (let i = currentTokenIndex - 1; i >= 0; i--) {
			const token = allTokens[i];
			// Skip whitespace and other hidden channel tokens
			if (token.channel !== 0) continue;

			// If we haven't found an operator yet, check for operator
			if (
				!foundOperator &&
				[
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
				].includes(token.type)
			) {
				result.operatorToken = token.text;
				foundOperator = true;
			}
			// If we already found an operator and this is a key, record it
			else if (foundOperator && token.type === FilterQueryLexer.KEY) {
				result.keyToken = token.text;
				break; // We found our triplet
			}
		}
	}

	return result;
}

export function getQueryContextAtCursor(
	query: string,
	cursorIndex: number,
): IQueryContext {
	try {
		// Create input stream and lexer
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

		// Handle cursor at the very end of input
		if (cursorIndex === input.length && allTokens.length > 0) {
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
					if (current.type === FilterQueryLexer.EOF) {
						continue;
					}
					if (next.type === FilterQueryLexer.EOF) {
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

		// Determine the context based on cursor position and surrounding tokens
		let currentToken: IToken | null = null;

		if (exactToken) {
			// If cursor is in a non-whitespace token, use that
			if (exactToken.channel === 0) {
				currentToken = exactToken;
			} else {
				// If in whitespace, use the previous non-whitespace token
				currentToken = previousToken?.channel === 0 ? previousToken : nextToken;
			}
		} else if (previousToken?.channel === 0) {
			// If between tokens, prefer the previous non-whitespace token
			currentToken = previousToken;
		} else if (nextToken?.channel === 0) {
			// Otherwise use the next non-whitespace token
			currentToken = nextToken;
		}

		// If still no token (empty query or all whitespace), return default context
		if (!currentToken) {
			// Handle transitions based on spaces and current state
			if (query.trim() === '') {
				return {
					tokenType: -1,
					text: '',
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: '',
					isInValue: false,
					isInKey: true, // Default to key context when input is empty
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
				};
			}
			return {
				tokenType: -1,
				text: '',
				start: cursorIndex,
				stop: cursorIndex,
				currentToken: '',
				isInValue: false,
				isInKey: false,
				isInOperator: false,
				isInFunction: false,
				isInConjunction: false,
				isInParenthesis: false,
			};
		}

		// Determine if the current token is a conjunction (AND or OR)
		const isInConjunction = [FilterQueryLexer.AND, FilterQueryLexer.OR].includes(
			currentToken.type,
		);

		// Determine if the current token is a parenthesis or bracket
		const isInParenthesis = [
			FilterQueryLexer.LPAREN,
			FilterQueryLexer.RPAREN,
			FilterQueryLexer.LBRACK,
			FilterQueryLexer.RBRACK,
		].includes(currentToken.type);

		// Determine the context based on the token type
		const isInValue = [
			FilterQueryLexer.QUOTED_TEXT,
			FilterQueryLexer.NUMBER,
			FilterQueryLexer.BOOL,
		].includes(currentToken.type);

		const isInKey = currentToken.type === FilterQueryLexer.KEY;

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
		].includes(currentToken.type);

		const isInFunction = [
			FilterQueryLexer.HAS,
			FilterQueryLexer.HASANY,
			FilterQueryLexer.HASALL,
			FilterQueryLexer.HASNONE,
		].includes(currentToken.type);

		// Get the context-related tokens (key, operator, value)
		const relationTokens = findKeyOperatorValueTriplet(
			allTokens,
			currentToken,
			isInKey,
			isInOperator,
			isInValue,
		);

		// Handle transitions based on spaces
		// When a user adds a space after a token, change the context accordingly
		if (
			currentToken &&
			cursorIndex === currentToken.stop + 2 &&
			query[currentToken.stop + 1] === ' '
		) {
			// User added a space right after this token

			if (isInKey) {
				// After a key + space, we should be in operator context
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: false,
					isInKey: false,
					isInOperator: true,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (isInOperator) {
				// After an operator + space, we should be in value context
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: true,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (isInValue) {
				// After a value + space, we should be in conjunction context
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: false,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: true,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (isInConjunction) {
				// After a conjunction + space, we should be in key context again
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: false,
					isInKey: true,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (isInParenthesis) {
				// After a parenthesis/bracket + space, determine context based on which bracket
				if (currentToken.type === FilterQueryLexer.LPAREN) {
					// After an opening parenthesis + space, we should be in key context
					return {
						tokenType: currentToken.type,
						text: currentToken.text,
						start: currentToken.start,
						stop: currentToken.stop,
						currentToken: currentToken.text,
						isInValue: false,
						isInKey: true,
						isInOperator: false,
						isInFunction: false,
						isInConjunction: false,
						isInParenthesis: false,
						...relationTokens,
					};
				}

				if (
					currentToken.type === FilterQueryLexer.RPAREN ||
					currentToken.type === FilterQueryLexer.RBRACK
				) {
					// After a closing parenthesis/bracket + space, we should be in conjunction context
					return {
						tokenType: currentToken.type,
						text: currentToken.text,
						start: currentToken.start,
						stop: currentToken.stop,
						currentToken: currentToken.text,
						isInValue: false,
						isInKey: false,
						isInOperator: false,
						isInFunction: false,
						isInConjunction: true,
						isInParenthesis: false,
						...relationTokens,
					};
				}

				if (currentToken.type === FilterQueryLexer.LBRACK) {
					// After an opening bracket + space, we should be in value context (for arrays)
					return {
						tokenType: currentToken.type,
						text: currentToken.text,
						start: currentToken.start,
						stop: currentToken.stop,
						currentToken: currentToken.text,
						isInValue: true,
						isInKey: false,
						isInOperator: false,
						isInFunction: false,
						isInConjunction: false,
						isInParenthesis: false,
						...relationTokens,
					};
				}
			}
		}

		// Add logic for context detection that works for both forward and backward navigation
		// This handles both cases: when user is typing forward and when they're moving backward
		if (previousToken && nextToken) {
			// Determine context based on token sequence pattern

			// Key -> Operator -> Value -> Conjunction pattern detection
			if (isInKey && nextToken.type === FilterQueryLexer.EQUALS) {
				// When cursor is on a key and next token is an operator
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: false,
					isInKey: true,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (
				isInOperator &&
				previousToken.type === FilterQueryLexer.KEY &&
				(nextToken.type === FilterQueryLexer.QUOTED_TEXT ||
					nextToken.type === FilterQueryLexer.NUMBER ||
					nextToken.type === FilterQueryLexer.BOOL)
			) {
				// When cursor is on an operator between a key and value
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: false,
					isInKey: false,
					isInOperator: true,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (
				isInValue &&
				previousToken.type !== FilterQueryLexer.AND &&
				previousToken.type !== FilterQueryLexer.OR &&
				(nextToken.type === FilterQueryLexer.AND ||
					nextToken.type === FilterQueryLexer.OR)
			) {
				// When cursor is on a value and next token is a conjunction
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: true,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (
				isInConjunction &&
				(previousToken.type === FilterQueryLexer.QUOTED_TEXT ||
					previousToken.type === FilterQueryLexer.NUMBER ||
					previousToken.type === FilterQueryLexer.BOOL) &&
				nextToken.type === FilterQueryLexer.KEY
			) {
				// When cursor is on a conjunction between a value and a key
				return {
					tokenType: currentToken.type,
					text: currentToken.text,
					start: currentToken.start,
					stop: currentToken.stop,
					currentToken: currentToken.text,
					isInValue: false,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: true,
					isInParenthesis: false,
				};
			}
		}

		// If we're in between tokens (no exact token match), use next token type to determine context
		if (!exactToken && nextToken) {
			if (nextToken.type === FilterQueryLexer.KEY) {
				return {
					tokenType: -1,
					text: '',
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: '',
					isInValue: false,
					isInKey: true,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (
				[
					FilterQueryLexer.EQUALS,
					FilterQueryLexer.NOT_EQUALS,
					FilterQueryLexer.GT,
					FilterQueryLexer.LT,
					FilterQueryLexer.GE,
					FilterQueryLexer.LE,
				].includes(nextToken.type)
			) {
				return {
					tokenType: -1,
					text: '',
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: '',
					isInValue: false,
					isInKey: false,
					isInOperator: true,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if (
				[
					FilterQueryLexer.QUOTED_TEXT,
					FilterQueryLexer.NUMBER,
					FilterQueryLexer.BOOL,
				].includes(nextToken.type)
			) {
				return {
					tokenType: -1,
					text: '',
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: '',
					isInValue: true,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			if ([FilterQueryLexer.AND, FilterQueryLexer.OR].includes(nextToken.type)) {
				return {
					tokenType: -1,
					text: '',
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: '',
					isInValue: false,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: true,
					isInParenthesis: false,
					...relationTokens, // Include related tokens
				};
			}

			// Add case for parentheses and brackets
			if (
				[
					FilterQueryLexer.LPAREN,
					FilterQueryLexer.RPAREN,
					FilterQueryLexer.LBRACK,
					FilterQueryLexer.RBRACK,
				].includes(nextToken.type)
			) {
				return {
					tokenType: -1,
					text: '',
					start: cursorIndex,
					stop: cursorIndex,
					currentToken: '',
					isInValue: false,
					isInKey: false,
					isInOperator: false,
					isInFunction: false,
					isInConjunction: false,
					isInParenthesis: true,
					...relationTokens, // Include related tokens
				};
			}
		}

		// Fall back to default context detection based on current token
		return {
			tokenType: currentToken.type,
			text: currentToken.text,
			start: currentToken.start,
			stop: currentToken.stop,
			currentToken: currentToken.text,
			isInValue,
			isInKey,
			isInOperator,
			isInFunction,
			isInConjunction,
			isInParenthesis,
			...relationTokens, // Include related tokens
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
			isInKey: false,
			isInOperator: false,
			isInFunction: false,
			isInConjunction: false,
			isInParenthesis: false,
		};
	}
}

export const queryOperatorSuggestions = [
	{ label: '=', type: 'operator', info: 'Equal to' },
	{ label: '!=', type: 'operator', info: 'Not equal to' },
	{ label: '>', type: 'operator', info: 'Greater than' },
	{ label: '<', type: 'operator', info: 'Less than' },
	{ label: '>=', type: 'operator', info: 'Greater than or equal to' },
	{ label: '<=', type: 'operator', info: 'Less than or equal to' },
	{ label: 'LIKE', type: 'operator', info: 'Like' },
	{ label: 'ILIKE', type: 'operator', info: 'Case insensitive like' },
	{ label: 'BETWEEN', type: 'operator', info: 'Between' },
	{ label: 'EXISTS', type: 'operator', info: 'Exists' },
	{ label: 'REGEXP', type: 'operator', info: 'Regular expression' },
	{ label: 'CONTAINS', type: 'operator', info: 'Contains' },
	{ label: 'IN', type: 'operator', info: 'In' },
	{ label: 'NOT', type: 'operator', info: 'Not' },
	{ label: 'NOT_LIKE', type: 'operator', info: 'Not like' },
	{ label: 'IS_NULL', type: 'operator', info: 'Is null' },
	{ label: 'IS_NOT_NULL', type: 'operator', info: 'Is not null' },
];
