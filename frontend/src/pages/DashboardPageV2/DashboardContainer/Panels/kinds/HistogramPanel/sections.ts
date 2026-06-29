import type { DashboardtypesHistogramPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import type { SectionConfig } from '../../types/sections';

export const sections: SectionConfig[] = [
	{
		kind: 'legend',
		controls: { position: true },
		// Merging all queries collapses to one distribution with no legend.
		isHidden: (spec): boolean =>
			Boolean(
				(spec.plugin.spec as DashboardtypesHistogramPanelSpecDTO).histogramBuckets
					?.mergeAllActiveQueries,
			),
	},
	{
		kind: 'buckets',
		controls: { count: true, width: true, mergeQueries: true },
	},
	{ kind: 'contextLinks' },
];
