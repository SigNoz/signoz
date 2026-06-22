export interface ParsedFormattedValue {
	/** The numeric portion (e.g. "295.43", "1.2K"). */
	numericValue: string;
	/** A leading unit symbol such as a currency prefix, if any. */
	prefixUnit: string;
	/** A trailing unit label such as "ms" or "MB", if any. */
	suffixUnit: string;
}

/**
 * Splits a formatted value string (e.g. "$ 1.2K", "295.43 ms") into its
 * numeric core and any prefix/suffix unit so each part can be styled
 * independently. Falls back to treating the whole string as the numeric value
 * when it doesn't match the expected shape.
 */
export function parseFormattedValue(value: string): ParsedFormattedValue {
	const matches = value.match(
		/^([^\d.]*)?([\d.]+(?:[eE][+-]?[\d]+)?[KMB]?)([^\d.]*)?$/,
	);

	return {
		numericValue: matches?.[2] || value,
		prefixUnit: matches?.[1]?.trim() || '',
		suffixUnit: matches?.[3]?.trim() || '',
	};
}
