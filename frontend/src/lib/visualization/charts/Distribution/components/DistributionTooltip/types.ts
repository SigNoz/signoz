import type {
	IRenderTooltipFooterArgs,
	TooltipContentItem,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';

import type { DistributionBarsLayout, DistributionXAxis } from '../../types';

/** A group summed into Other, listed under it. */
export interface DistributionOtherMember {
	/** Index among the source series. */
	sourceIndex: number;
	label: string;
	color: string;
	/** Per bucket. */
	counts: number[];
}

/** A member of Other as a tooltip row, with the group it drills into. */
export interface DistributionOtherMemberItem {
	sourceIndex: number;
	item: TooltipContentItem;
}

export interface DistributionTooltipProps extends Pick<
	TooltipRenderArgs,
	'uPlotInstance' | 'isPinned' | 'dismiss'
> {
	/** Widget id, for the list's analytics. */
	id: string;
	xAxis: DistributionXAxis;
	layout: DistributionBarsLayout;
	labels: string[];
	colors: string[];
	/** `counts[series][bucket]`. */
	counts: number[][];
	/** The groups summed into Other, the last drawn group; empty when there is none. */
	otherMembers: DistributionOtherMember[];
	/** Drills into a member of Other, picked from the pinned tooltip. */
	onOtherMemberClick?: (
		sourceIndex: number,
		coordinates: { x: number; y: number },
	) => void;
	formatBound: (value: number) => string;
	renderTooltipFooter?: (args: IRenderTooltipFooterArgs) => React.ReactNode;
}
