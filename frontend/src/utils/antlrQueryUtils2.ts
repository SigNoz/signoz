/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable no-restricted-syntax */
import antlr4, { CharStreams } from 'antlr4';
import cloneDeep from 'lodash-es/cloneDeep';
import FilterQueryLexer from 'parser/FilterQueryLexer';

export enum CursorContext {
	Key,
	Operator,
	Value,
	NoFilter,
	FullText,
}

const contextNames = ['Key', 'Operator', 'Value', 'NoFilter', 'FullText'];

export function contextToString(context: CursorContext): string {
	return contextNames[context];
}

export interface ContextInfo {
	context: CursorContext;
	key?: string;
	token?: antlr4.Token;
	operator?: string;
}

export function detectContext(
	query: string,
	cursorOffset: number,
): ContextInfo {
	console.log('query', query);
	console.log('cursorOffset', cursorOffset);

	const chars = CharStreams.fromString(query);
	const lexer = new FilterQueryLexer(chars);
	const tokens = new antlr4.CommonTokenStream(lexer);
	tokens.fill();

	enum State {
		ExpectKey,
		ExpectOperator,
		ExpectValue,
	}

	let state = State.ExpectKey;
	let parens = 0;
	let array = 0;
	let lastKey: antlr4.Token | undefined;
	let lastOperator: antlr4.Token | undefined;
	let cursorTok: antlr4.Token | undefined;
	let pos = 0;

	for (const tok of tokens.tokens) {
		const text = tok.text || '';

		if (
			tok.channel === antlr4.Token.DEFAULT_CHANNEL &&
			pos <= cursorOffset &&
			cursorOffset <= pos + text.length
		) {
			cursorTok = tok;
			break;
		}

		switch (tok.type) {
			case FilterQueryLexer.LPAREN:
				parens++;
				state = State.ExpectKey;
				break;
			case FilterQueryLexer.RPAREN:
				if (parens > 0) parens--;
				state = State.ExpectOperator;
				break;
			case FilterQueryLexer.LBRACK:
				array++;
				state = State.ExpectValue;
				break;
			case FilterQueryLexer.RBRACK:
				if (array > 0) array--;
				state = State.ExpectOperator;
				break;
			case FilterQueryLexer.COMMA:
				if (array > 0) state = State.ExpectValue;
				break;
			case FilterQueryLexer.KEY:
				if (state === State.ExpectKey) {
					lastKey = tok;
					state = State.ExpectOperator;
				}
				break;
			case FilterQueryLexer.QUOTED_TEXT:
			case FilterQueryLexer.NUMBER:
			case FilterQueryLexer.BOOL:
				if (state === State.ExpectValue) {
					state = State.ExpectOperator;
				}
				break;
			default:
				if (
					tok.type >= FilterQueryLexer.EQUALS &&
					tok.type <= FilterQueryLexer.CONTAINS
				) {
					state = State.ExpectValue;
				}
				break;
		}

		pos += text.length;
	}

	console.log('cursorTok', cursorTok);

	const out: ContextInfo = { context: CursorContext.NoFilter };

	if (cursorTok) {
		out.token = cursorTok;
	}

	console.log('out', cloneDeep(out));
	console.log('state', cloneDeep(state));

	switch (state) {
		case State.ExpectKey:
			out.context = CursorContext.Key;
			break;
		case State.ExpectOperator:
			out.context = CursorContext.Operator;
			if (lastKey) out.key = lastKey.text;
			break;
		case State.ExpectValue:
			out.context = CursorContext.Value;
			if (lastKey) out.key = lastKey.text;

			if (lastOperator) {
				out.operator = lastOperator.text;
			}
			break;
		default:
			out.context = CursorContext.NoFilter;
			break;
	}

	console.log('out', cloneDeep(out));

	if (
		cursorTok &&
		cursorTok.type === FilterQueryLexer.QUOTED_TEXT &&
		(out.context === CursorContext.Key || out.context === CursorContext.NoFilter)
	) {
		out.context = CursorContext.FullText;
	}

	// if (!cursorTok || cursorTok.type === antlr4.Token.EOF) {
	// 	out.context = CursorContext.NoFilter;
	// }

	return out;
}
