// Lowercase only the standalone keywords/operators that have case-insensitive
// semantics in the query grammar. Identifiers and unquoted values are left
// alone — case may be meaningful there.
const KEYWORDS_RE = /\b(AND|OR|NOT|IN|LIKE|ILIKE|CONTAINS|EXISTS|BETWEEN|IS|NULL|TRUE|FALSE)\b/gi;

// Match a quoted string literal (single- or double-quoted) with simple
// backslash escapes. Used to skip over value regions so we don't touch their
// casing or whitespace.
const QUOTED_RE = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;

function processOutsideQuotes(s: string): string {
	// 1. Lowercase keywords while spaces are still in place so word-boundary
	//    matching works (`\bAND\b`).
	// 2. Strip all remaining whitespace. Glued identifiers are acceptable —
	//    this string is only used as an internal dedup key, never displayed.
	return s.replace(KEYWORDS_RE, (m) => m.toLowerCase()).replace(/\s+/g, '');
}

/**
 * Normalize a filter expression for dedup purposes only.
 *
 * Pipeline: lowercase known keywords/operators (AND, OR, IN, NOT, LIKE, …)
 * outside quoted strings, then strip all whitespace outside quoted strings.
 * Casing and whitespace inside quoted string values are preserved.
 *
 * The result is intentionally not human-readable — it's an internal dedup key.
 * The original raw expression text stays on the entry for display and prefix
 * matching.
 *
 * This is not a parser — it catches the common formatting drift
 * (`a = "x"` vs `a="x"` vs `a = 'x'` vs `A AND B` vs `a and b`) without
 * trying to canonicalize the AST.
 */
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
