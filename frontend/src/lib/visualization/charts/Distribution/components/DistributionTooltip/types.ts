import type {
	IRenderTooltipFooterArgs,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import type { DistributionBarsLayout, DistributionXAxis } from '../../types';

export interface DistributionTooltipRow {
	/** Index among the drawn series. */
	seriesIndex: number;
	label: string;
	color: string;
	count: number;
	/** Of the group's own total over the range. */
	share: number;
	isHovered: boolean;
}

export interface DistributionGroupColumn {
	heading: string;
	/** The display label of the drawn group at `index`. */
	format: (label: string, index: number) => string;
}

export interface DistributionTooltipProps extends Pick<
	TooltipRenderArgs,
	'uPlotInstance' | 'isPinned' | 'dismiss'
> {
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	labels: string[];
	/** Each drawn group's group-by values; `undefined` for Other. */
	groupLabels: (Record<string, string> | undefined)[];
	colors: string[];
	/** `counts[series][bucket]`. */
	counts: number[][];
	formatBound: (value: number) => string;
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => React.ReactNode;
}
