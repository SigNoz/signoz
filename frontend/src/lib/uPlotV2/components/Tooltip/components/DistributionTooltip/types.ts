import type { StackMode } from 'lib/uPlotV2/config/types';
import type { HeatmapRow } from 'lib/uPlotV2/plugins/HeatmapPlugin/types';
import type { DistributionBarsLayout } from 'lib/visualization/charts/Distribution/layout';
import type { DistributionPercentile } from 'lib/visualization/charts/Distribution/percentiles';
import type { DistributionXAxis } from 'lib/visualization/charts/Distribution/types';

import type {
	IRenderTooltipFooterArgs,
	TooltipRenderArgs,
} from '../../../types';

export type DistributionBucket = HeatmapRow;

export interface DistributionTooltipRow {
	label: string;
	color: string;
	count: number;
	/** Of the group's own total over the range. */
	share: number;
	/** Of the group's total, at or below this bucket. */
	cumulativeShare: number;
	isHovered: boolean;
}

export interface DistributionTooltipProps extends Pick<
	TooltipRenderArgs,
	'uPlotInstance' | 'isPinned' | 'dismiss'
> {
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	labels: string[];
	colors: string[];
	/** `counts[series][bucket]`. */
	counts: number[][];
	visible: boolean[];
	stack: StackMode;
	markers: DistributionPercentile[];
	formatBound: (value: number) => string;
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => React.ReactNode;
}
