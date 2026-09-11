import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/**
 * Stable identity of a flattened series, used to break ties between series a sort
 * cannot otherwise separate — a single grouped query fans out to one series per
 * label set, all carrying the same query name.
 */
export function seriesKey(series: PanelSeries): string {
	const labels = Object.keys(series.labels)
		.sort()
		.map((name) => [name, series.labels[name]]);
	// The index is zero-padded so a string compare orders it numerically (index 10 after
	// index 2), and the whole tuple is JSON-encoded so a delimiter inside a label name or
	// value cannot make two different label sets share a key.
	const index = String(series.aggregation.index).padStart(6, '0');
	return JSON.stringify([series.queryName, index, series.kind, labels]);
}
