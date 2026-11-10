const TOKEN_BEFORE_CURSOR = /\$([\w.]*)$/;
const IDENTIFIER_PREFIX = /^[\w.]*/;

export interface VariableToken {
	start: number;
	query: string;
}

export function findVariableToken(
	text: string,
	cursor: number,
): VariableToken | null {
	const match = TOKEN_BEFORE_CURSOR.exec(text.slice(0, cursor));
	if (!match) {
		return null;
	}
	return { start: match.index, query: match[1] };
}

/** Also replaces identifier chars after the cursor: `$ser|vice` leaves no `vice`. */
export function insertVariable(
	text: string,
	token: VariableToken,
	name: string,
): { text: string; cursor: number } {
	const before = text.slice(0, token.start);
	const after = text.slice(token.start + 1).replace(IDENTIFIER_PREFIX, '');
	const inserted = `${before}$${name}`;
	return { text: `${inserted}${after}`, cursor: inserted.length };
}
