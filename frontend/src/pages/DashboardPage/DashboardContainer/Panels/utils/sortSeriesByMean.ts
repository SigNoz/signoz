import { sortByMeanDesc } from 'lib/visualization/charts/utils/sortByMeanDesc';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { seriesKey } from './seriesKey';

/** `sortByMeanDesc` over flattened V5 series; call it before building the config and chart data. */
export function sortSeriesByMeanDesc(series: PanelSeries[]): PanelSeries[] {
	return sortByMeanDesc(series, {
		getValues: (item) => item.values.map((point) => point.value),
		getKey: seriesKey,
	});
}
