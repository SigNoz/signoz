// Reserved query-builder keywords. Matched case-insensitively so we can canonicalise
// them to lowercase — `a = 1 AND b = 2` and `a = 1 and b = 2` should dedup to the
// same entry. \b boundaries prevent partial matches inside identifiers
// (e.g. `OR` inside `originator`).
const KEYWORDS_RE =
	/\b(AND|OR|NOT|IN|LIKE|ILIKE|CONTAINS|EXISTS|BETWEEN|IS|NULL|TRUE|FALSE)\b/gi;

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
