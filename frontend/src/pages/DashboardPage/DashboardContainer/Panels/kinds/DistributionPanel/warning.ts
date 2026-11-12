import { getToolTipValue } from 'components/Graph/yAxisConfig';
import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { getDistributionResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import type { PanelOfKind } from '../../types/rendererProps';
import { prepareDistributionData } from './prepareData';

/** Above this share in overflow, the bucket bounds probably stop short. */
export const OVERFLOW_WARNING_SHARE = 0.1;

/**
 * Bounds that stop short, over every group regardless of the legend: too much
 * landing in overflow.
 */
export function getDistributionDataWarning(
	panel: PanelOfKind<'signoz/DistributionPanel'>,
	data: PanelQueryData,
): PanelStatusDetail | null {
	const { buckets, series } = prepareDistributionData({
		results: getDistributionResults(data.response),
		legendMap: data.legendMap ?? {},
	});
	if (buckets.length === 0) {
		return null;
	}

	const spec = panel.spec.plugin.spec;
	const lastBound = buckets[buckets.length - 1];
	let total = 0;
	let overflow = 0;
	series.forEach(({ counts }) => {
		counts.forEach((count) => {
			total += count;
		});
		overflow += counts[buckets.length] ?? 0;
	});

	const overflowShare = total > 0 ? overflow / total : 0;
	if (overflowShare <= OVERFLOW_WARNING_SHARE) {
		return null;
	}
	const bound = getToolTipValue(String(lastBound), spec.formatting?.unit);
	return {
		message: `${Math.round(overflowShare * 100)}% of observations are above ${bound}. The bucket bounds may be too low.`,
		messages: [],
	};
}
