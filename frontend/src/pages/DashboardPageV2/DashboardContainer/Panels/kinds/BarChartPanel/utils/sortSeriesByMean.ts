import type { PanelSeries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

function finiteMean(series: PanelSeries): number | null {
	let sum = 0;
	let count = 0;
	for (const point of series.values) {
		if (Number.isFinite(point.value)) {
			sum += point.value;
			count += 1;
		}
	}
	return count > 0 ? sum / count : null;
}

function seriesKey(series: PanelSeries): string {
	const labels = Object.keys(series.labels)
		.sort()
		.map((name) => `${name}=${series.labels[name]}`)
		.join(',');
	return `${series.queryName}|${series.aggregation.index}|${series.kind}|${labels}`;
}

/**
 * Orders series by descending mean so stacked bars keep the tallest segments at the base instead
 * of burying short series (V1 parity: `utils/getSortedSeriesData`). Series with no finite points
 * sink to the bottom; equal means tiebreak on `seriesKey`, since a stable sort would otherwise
 * fall back to the response order and the backend doesn't guarantee one.
 */
export function sortSeriesByMeanDesc(series: PanelSeries[]): PanelSeries[] {
	return series
		.map((item) => ({ item, mean: finiteMean(item) }))
		.sort((a, b) => {
			if (a.mean === null || b.mean === null) {
				if (a.mean === b.mean) {
					return seriesKey(a.item).localeCompare(seriesKey(b.item));
				}
				return a.mean === null ? 1 : -1;
			}
			if (a.mean === b.mean) {
				return seriesKey(a.item).localeCompare(seriesKey(b.item));
			}
			return b.mean - a.mean;
		})
		.map(({ item }) => item);
}
