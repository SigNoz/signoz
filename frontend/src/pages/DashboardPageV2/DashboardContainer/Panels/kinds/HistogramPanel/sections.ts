import type { DashboardtypesHistogramPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: 'legend',
		controls: { position: true },
		// Merging all queries collapses the histogram to a single distribution with no
		// legend — so hide the legend settings when that's on.
		isHidden: (spec): boolean =>
			Boolean(
				(spec.plugin?.spec as DashboardtypesHistogramPanelSpecDTO | undefined)
					?.histogramBuckets?.mergeAllActiveQueries,
			),
	},
	{
		kind: 'buckets',
		controls: { count: true, width: true, mergeQueries: true },
	},
	{ kind: 'contextLinks' },
];
