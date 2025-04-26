/* eslint-disable sonarjs/no-collapsible-if */
/* eslint-disable no-continue */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable max-classes-per-file */
import { CharStreams, CommonTokenStream } from 'antlr4';
import FilterQueryLexer from 'parser/FilterQueryLexer';
import FilterQueryParser from 'parser/FilterQueryParser';
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
			let message = `Line ${error.line}:${error.column} - ${error.message}`;

			if (error.offendingSymbol && error.offendingSymbol !== 'undefined') {
				message += `\nOffending symbol: '${error.offendingSymbol}'`;
			}

			if (error.expectedTokens && error.expectedTokens.length > 0) {
				message += `\nExpected: ${error.expectedTokens.join(', ')}`;
			}

			return message;
		});
	}
}

export const validateQuery = (query: string): IValidationResult => {
	// Empty query is considered invalid
	if (!query.trim()) {
		return {
			isValid: false,
			message: 'Query cannot be empty',
			errors: ['Query cannot be empty'],
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
		const parsedTree = parser.query();

		console.log('parsedTree', parsedTree);

		// Check if any errors were captured
		if (errorListener.hasErrors()) {
			return {
				isValid: false,
				message: 'Query syntax error',
				errors: errorListener.getFormattedErrors(),
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
		return {
			isValid: false,
			message: 'Invalid query syntax',
			errors: [errorMessage],
		};
	}
};

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

		console.log('Cursor context:', {
			cursorIndex,
			query,
			exact: exactToken,
			prev: previousToken,
			next: nextToken,
		});

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
			};
		}

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
		};
	}
}
