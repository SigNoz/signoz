/** An `as` alias: quoted, or an unquoted word that may carry dashes. */
export const ALIAS = `(?:'[^']*'|"[^"]*"|[a-zA-Z0-9_-]+)`;

export const unquoteAlias = (alias: string): string =>
	alias.replace(/^['"]|['"]$/g, '');

/**
 * A logs or traces heatmap's aggregation: one field with an optional alias.
 * The field mirrors the querier's HeatmapAggregationField: no call, no whitespace.
 */
export const DISTRIBUTION_FIELD = new RegExp(
	`^\\s*([^\\s()]+)(?:\\s+as\\s+(${ALIAS}))?\\s*$`,
);

// Utility to parse aggregation expressions with optional alias
export function parseAggregations(
	expression: string,
	availableAlias?: string,
	allowDistributionField = false,
): { expression: string; alias?: string }[] {
	const result: { expression: string; alias?: string }[] = [];
	// Matches function calls like "count()" or "sum(field)" with optional alias like "as 'alias'"
	// Handles quoted ('alias'), dash-separated (field-name), and unquoted values after "as" keyword
	const regex = new RegExp(
		`([a-zA-Z0-9_]+\\([^)]*\\))(?:\\s*as\\s+(${ALIAS}))?`,
		'g',
	);
	// With no call at all, the whole expression may be the field a logs/traces
	// heatmap buckets, e.g. "duration_nano"
	let match =
		regex.exec(expression) ??
		(allowDistributionField ? DISTRIBUTION_FIELD.exec(expression) : null);
	while (match !== null) {
		const expr = match[1];
		let alias = match[2] || availableAlias; // Use provided alias or availableAlias if not matched
		if (alias) {
			// Remove quotes if present
			alias = unquoteAlias(alias);
			result.push({ expression: expr, alias });
		} else {
			result.push({ expression: expr });
		}
		match = regex.exec(expression);
	}
	return result;
}
