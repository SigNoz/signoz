export interface ParsedFormattedValue {
	/** The numeric portion (e.g. "295.43", "1,234,567", "1.2K"). */
	numericValue: string;
	/** A leading unit symbol such as a currency prefix, if any. */
	prefixUnit: string;
	/** A trailing unit label such as "ms" or "MB", if any. */
	suffixUnit: string;
}

/**
 * Splits a formatted value (e.g. "$ 1.2K", "295.43 ms", "1,234,567") into its
 * numeric core and prefix/suffix unit for independent styling. The core accepts
 * thousand separators, so a grouped value keeps its unit split. Non-matching
 * input falls back to the whole string as the numeric value.
 */
export function parseFormattedValue(value: string): ParsedFormattedValue {
	const matches = value.match(
		/^([^\d.]*)?([\d.,]+(?:[eE][+-]?[\d]+)?[KMB]?)([^\d.]*)?$/,
	);

	return {
		numericValue: matches?.[2] || value,
		prefixUnit: matches?.[1]?.trim() || '',
		suffixUnit: matches?.[3]?.trim() || '',
	};
}
