import { resolveTimeSeriesLegendSeries } from '../../utils/legendSeries';
import type { DashboardtypesHistogramPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { SectionKind, type SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: SectionKind.Visualization,
		controls: { switchPanelKind: true },
	},
	{
		kind: SectionKind.Legend,
		// seriesOrder is TimeSeries/Bar-only, so Histogram omits it.
		controls: { position: true, colors: resolveTimeSeriesLegendSeries },
		// Merging all queries collapses to one distribution with no legend.
		isHidden: (spec): boolean =>
			Boolean(
				(spec.plugin.spec as DashboardtypesHistogramPanelSpecDTO).histogramBuckets
					?.mergeAllActiveQueries,
			),
	},
	{
		kind: SectionKind.Buckets,
		controls: { count: true, width: true, mergeQueries: true },
	},
	{ kind: SectionKind.ContextLinks },
];
