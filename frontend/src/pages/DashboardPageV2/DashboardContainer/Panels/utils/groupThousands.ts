const THOUSANDS_BOUNDARY = /(\d)(?=(?:\d{3})+$)/g;

/** Leading number of a formatted value; unit decoration falls outside the match. */
const NUMERIC_TOKEN = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;

/**
 * Inserts thousand separators into the integer part of an already-formatted value,
 * so large scalars read as `1,234,567`. Fractions, unit labels and formatter-scaled
 * values (`1.18 MiB`) are left as-is, as is exponent notation.
 */
export function groupThousands(formatted: string): string {
	return formatted.replace(NUMERIC_TOKEN, (token) => {
		if (token.includes('e') || token.includes('E')) {
			return token;
		}

		const [integerPart, fraction] = token.split('.');
		const grouped = integerPart.replace(THOUSANDS_BOUNDARY, '$1,');

		return fraction === undefined ? grouped : `${grouped}.${fraction}`;
	});
}
