import FilterQueryLexer from './FilterQueryLexer';
import FilterQueryParser from './FilterQueryParser';
import { ParseTreeWalker, CharStreams, CommonTokenStream, Token } from 'antlr4';
import { isOperatorToken } from 'utils/tokenUtils';
import FilterQueryListener from './FilterQueryListener';

import {
	KeyContext,
	ValueContext,
	ComparisonContext,
} from './FilterQueryParser';
import { IToken } from 'types/antlrQueryTypes';

// 👇 Define the token classification
type TokenClassification = 'Key' | 'Value' | 'Operator';

interface TokenInfo {
	text: string;
	startIndex: number;
	stopIndex: number;
	type: TokenClassification;
}

// 👇 Custom listener to walk the parse tree
class TypeTrackingListener implements FilterQueryListener {
	public tokens: TokenInfo[] = [];

	enterKey(ctx: KeyContext) {
		const token = ctx.KEY().symbol;
		this.tokens.push({
			text: token.text!,
			startIndex: token.start,
			stopIndex: token.stop,
			type: 'Key',
		});
	}

	enterValue(ctx: ValueContext) {
		const token = ctx.start;
		this.tokens.push({
			text: token.text!,
			startIndex: token.start,
			stopIndex: token.stop,
			type: 'Value',
		});
	}

	enterComparison(ctx: ComparisonContext) {
		const children = ctx.children || [];
		for (const child of children) {
			const token = (child as any).symbol;
			if (token && isOperatorToken(token.type)) {
				this.tokens.push({
					text: token.text!,
					startIndex: token.start,
					stopIndex: token.stop,
					type: 'Operator',
				});
			}
		}
	}

	// Required no-op stubs
	enterEveryRule() {}
	exitEveryRule() {}
	exitKey() {}
	exitValue() {}
	exitComparison() {}
	visitTerminal() {}
	visitErrorNode() {}
}

// 👇 Analyze function
export function analyzeQuery(input: string, lastToken: IToken) {
	input = input.trim();
	const chars = CharStreams.fromString(input);
	const lexer = new FilterQueryLexer(chars);
	const tokens = new CommonTokenStream(lexer);
	const parser = new FilterQueryParser(tokens);

	const tree = parser.query();

	const listener = new TypeTrackingListener();
	ParseTreeWalker.DEFAULT.walk(listener, tree);

	const currentToken = listener.tokens.find(
		(token) =>
			token.text === lastToken.text &&
			token.startIndex === lastToken.start &&
			token.stopIndex === lastToken.stop,
	);

	return currentToken;
}
