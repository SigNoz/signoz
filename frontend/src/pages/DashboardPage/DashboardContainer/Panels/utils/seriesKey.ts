import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/**
 * Stable identity of a flattened series, used to break ties between series a sort
 * cannot otherwise separate — a single grouped query fans out to one series per
 * label set, all carrying the same query name.
 */
export function seriesKey(series: PanelSeries): string {
	const labels = Object.keys(series.labels)
		.sort()
		.map((name) => `${name}=${series.labels[name]}`)
		.join(',');
	return `${series.queryName}|${series.aggregation.index}|${series.kind}|${labels}`;
}
