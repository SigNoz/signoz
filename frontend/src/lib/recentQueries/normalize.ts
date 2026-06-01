const KEYWORDS_RE =
	/\b(AND|OR|NOT|IN|LIKE|ILIKE|CONTAINS|EXISTS|BETWEEN|IS|NULL|TRUE|FALSE)\b/gi;

const QUOTED_RE = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;

function processOutsideQuotes(s: string): string {
	return s.replace(KEYWORDS_RE, (m) => m.toLowerCase()).replace(/\s+/g, '');
}

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
