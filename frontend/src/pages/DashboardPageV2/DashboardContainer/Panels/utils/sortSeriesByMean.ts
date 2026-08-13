import { sortByMeanDesc } from 'container/Visualization/charts/utils/sortByMeanDesc';
import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

function seriesKey(series: PanelSeries): string {
	const labels = Object.keys(series.labels)
		.sort()
		.map((name) => `${name}=${series.labels[name]}`)
		.join(',');
	return `${series.queryName}|${series.aggregation.index}|${series.kind}|${labels}`;
}

/** `sortByMeanDesc` over flattened V5 series; call it before building the config and chart data. */
export function sortSeriesByMeanDesc(series: PanelSeries[]): PanelSeries[] {
	return sortByMeanDesc(series, {
		getValues: (item) => item.values.map((point) => point.value),
		getKey: seriesKey,
	});
}
