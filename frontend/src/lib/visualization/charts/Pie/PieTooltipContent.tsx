import type { MouseEvent as ReactMouseEvent } from 'react';
import cx from 'classnames';
import TooltipItem from 'lib/uPlotV2/components/Tooltip/components/TooltipItem/TooltipItem';
import TooltipList from 'lib/uPlotV2/components/Tooltip/components/TooltipList/TooltipList';
import TooltipPinnedBadge from 'lib/uPlotV2/components/Tooltip/components/TooltipPinnedBadge/TooltipPinnedBadge';

import { PieTooltipData } from 'lib/visualization/charts/Pie/types';
import PieTooltipFooter from 'lib/visualization/charts/Pie/PieTooltipFooter';

import styles from 'lib/visualization/charts/Pie/Pie.module.scss';

interface PieTooltipContentProps {
	/** Widget id, for the list's analytics. */
	id: string;
	data: PieTooltipData;
	/** Pinned by a click on a grouped slice: its members become drill-down targets. */
	isPinned: boolean;
	canDrilldown: boolean;
	onMemberClick: (index: number, event: ReactMouseEvent) => void;
	onUnpin: () => void;
}

/** Hovered slice's label and value, in the timeseries tooltip's look; a grouped slice also lists its members. */
export default function PieTooltipContent({
	id,
	data,
	isPinned,
	canDrilldown,
	onMemberClick,
	onUnpin,
}: PieTooltipContentProps): JSX.Element {
	const { slice, members } = data;
	const canDrillMember = isPinned && canDrilldown;
	const showFooter = !!members || canDrilldown;

	return (
		<div
			className={cx(styles.pieChartTooltipBody, {
				[styles.pieChartTooltipPinned]: isPinned,
			})}
		>
			{isPinned && (
				<div className={styles.pieChartTooltipHeaderRow}>
					<span>{members?.length} series</span>
					<TooltipPinnedBadge />
				</div>
			)}
			<div className={styles.pieChartTooltipActiveItem}>
				<TooltipItem item={slice} isItemActive />
			</div>
			{members && (
				<>
					<span className={styles.pieChartTooltipDivider} />
					<TooltipList
						id={id}
						content={members}
						onItemClick={canDrillMember ? onMemberClick : undefined}
					/>
				</>
			)}
			{showFooter && (
				<PieTooltipFooter
					isGroup={!!members}
					isPinned={isPinned}
					canDrilldown={canDrilldown}
					onUnpin={onUnpin}
				/>
			)}
		</div>
	);
}
