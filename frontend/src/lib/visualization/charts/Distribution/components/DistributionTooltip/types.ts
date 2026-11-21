import type {
	IRenderTooltipFooterArgs,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import type { DistributionBarsLayout } from '../../layout';
import type { DistributionXAxis } from '../../types';

export interface DistributionTooltipRow {
	/** Index among the drawn series. */
	seriesIndex: number;
	label: string;
	color: string;
	count: number;
	/** Of the group's own total over the range. */
	share: number;
	/** Of the group's total, at or below this bucket. */
	cumulativeShare: number;
	isHovered: boolean;
}

export interface DistributionGroupColumn {
	heading: string;
	format: (label: string) => string;
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
	formatBound: (value: number) => string;
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => React.ReactNode;
}
