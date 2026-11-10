import {
	OPERATORS,
	QUERY_BUILDER_FUNCTIONS,
	TRACE_OPERATOR_OPERATORS,
} from 'constants/antlrQueryConstants';

// Reserved keywords sourced from the ANTLR grammar constants so this list stays
// in sync with the parser. `\b` prevents partial matches inside identifiers
// (e.g. `OR` inside `originator`). `TRUE`/`FALSE` are BOOL literals, included
// so case variants of boolean values also dedup.
const WORD_KEYWORDS = [
	...Object.keys(OPERATORS).filter((k) => /^[A-Z]+$/.test(k)),
	...Object.keys(TRACE_OPERATOR_OPERATORS).filter((k) => /^[A-Z]+$/.test(k)),
	...Object.values(QUERY_BUILDER_FUNCTIONS),
	'TRUE',
	'FALSE',
];

const KEYWORDS_RE = new RegExp(`\\b(${WORD_KEYWORDS.join('|')})\\b`, 'gi');

// Matches single- or double-quoted string literals, supporting escaped quotes
// (e.g. `'it\'s'` or `"a \" b"`). We preserve quoted spans verbatim during
// normalisation so user-meaningful whitespace and casing inside string values
// stays intact: `name = "Foo Bar"` must not collapse to `name="foobar"`.
const QUOTED_RE = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;

// Lowercases reserved keywords and strips ALL whitespace from the unquoted regions
// of the input. Keywords are normalised so casing variants dedup; whitespace is
// dropped so formatting variants (`a=1` vs `a = 1`) dedup too.
function processOutsideQuotes(s: string): string {
	return s.replace(KEYWORDS_RE, (m) => m.toLowerCase()).replace(/\s+/g, '');
}

// Produces a canonical form of a filter expression suitable for dedup-key derivation.
// Walks the input alternating between unquoted regions (where we normalise keywords
// and whitespace) and quoted regions (which we copy verbatim).
export function normalizeFilterExpression(input: string): string {
	if (!input) {
		return '';
	}

	let result = '';
	let lastIndex = 0;
	QUOTED_RE.lastIndex = 0;

	let match = QUOTED_RE.exec(input);
	while (match !== null) {
		result += processOutsideQuotes(input.slice(lastIndex, match.index));
		result += match[0];
		lastIndex = QUOTED_RE.lastIndex;
		match = QUOTED_RE.exec(input);
	}
	result += processOutsideQuotes(input.slice(lastIndex));

	return result.trim();
}
