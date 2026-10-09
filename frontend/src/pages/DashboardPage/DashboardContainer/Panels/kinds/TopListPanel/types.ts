export interface TopListRow {
	/** Unique per row; labels can repeat (e.g. a legend with no `{{…}}`). */
	key: string;
	label: string;
	/** True when every group value behind the label was missing. */
	isEmptyLabel: boolean;
	/** The ranked value, or null when the cell isn't a finite number ("NaN", "Inf", "n/a", null). */
	value: number | null;
	/** The cell as the server sent it, shown when `value` is null. */
	rawValue: unknown;
	/** Bar length: `value` over the largest positive value, 0–1. Zero for values ≤ 0 and null. */
	ratio: number;
	/** `value` over the sum of every row's value; null for null values and when any value is negative. */
	share: number | null;
	/** Source query, the drilldown target. */
	queryName: string;
	/** Group-by key → value, the drilldown filters. */
	labels: Record<string, string>;
}

export interface TopListData {
	rows: TopListRow[];
	/** Group-by columns behind each label; empty when the query has no group-by. */
	labelColumnNames: string[];
	/** The ranked value column. */
	valueColumnName: string;
	/** What the ranked value measures. Unlike `valueColumnName`, never the legend template. */
	valueName: string;
	/** Value columns after the first, which the ranking ignores. */
	ignoredValueColumns: string[];
	/** Other enabled queries and formulas, which the ranking ignores. */
	ignoredResults: string[];
	/** The group-by key the ranked query orders by, when it orders by one instead of its value. */
	orderedByGroupKey: string | null;
}
