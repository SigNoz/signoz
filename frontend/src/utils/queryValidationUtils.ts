/* eslint-disable sonarjs/no-collapsible-if */
/* eslint-disable no-continue */
import { CharStreams, CommonTokenStream } from 'antlr4';
import FilterQueryLexer from 'parser/FilterQueryLexer';
import FilterQueryParser from 'parser/FilterQueryParser';
import TraceOperatorGrammarLexer from 'parser/TraceOperatorParser/TraceOperatorGrammarLexer';
import TraceOperatorGrammarParser from 'parser/TraceOperatorParser/TraceOperatorGrammarParser';
import { IDetailedError, IValidationResult } from 'types/antlrQueryTypes';

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
	// Empty query is considered valid
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

export const validateTraceOperatorQuery = (
	query: string,
): IValidationResult => {
	// Empty query is considered valid
	if (!query.trim()) {
		return {
			isValid: true,
			message: 'Trace operator query is empty',
			errors: [],
		};
	}

	try {
		const errorListener = new QueryErrorListener();
		const inputStream = CharStreams.fromString(query);

		// Setup lexer
		const lexer = new TraceOperatorGrammarLexer(inputStream);
		lexer.removeErrorListeners(); // Remove default error listeners
		lexer.addErrorListener(errorListener);

		// Setup parser
		const tokenStream = new CommonTokenStream(lexer);
		const parser = new TraceOperatorGrammarParser(tokenStream);
		parser.removeErrorListeners(); // Remove default error listeners
		parser.addErrorListener(errorListener);

		// Try parsing
		parser.query();

		// Check if any errors were captured
		if (errorListener.hasErrors()) {
			return {
				isValid: false,
				message: 'Trace operator syntax error',
				errors: errorListener.getErrors(),
			};
		}

		return {
			isValid: true,
			message: 'Trace operator is valid!',
			errors: [],
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Invalid trace operator syntax';

		const detailedError: IDetailedError = {
			message: errorMessage,
			line: 0,
			column: 0,
			offendingSymbol: '',
			expectedTokens: [],
		};
		return {
			isValid: false,
			message: 'Invalid trace operator syntax',
			errors: [detailedError],
		};
	}
};
