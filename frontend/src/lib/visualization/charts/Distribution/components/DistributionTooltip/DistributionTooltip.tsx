import { useCallback, useMemo } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import cx from 'classnames';
import TooltipItem from 'lib/uPlotV2/components/Tooltip/components/TooltipItem/TooltipItem';
import TooltipList from 'lib/uPlotV2/components/Tooltip/components/TooltipList/TooltipList';
import TooltipPinnedBadge from 'lib/uPlotV2/components/Tooltip/components/TooltipPinnedBadge/TooltipPinnedBadge';
import GroupedTooltipFooter from 'lib/visualization/panels/components/GroupedTooltipFooter';
import {
	formatRowLabel,
	resolveRowIndex,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';

import { resolveNearestSeries } from '../../layout';
import {
	buildDistributionTooltipItems,
	buildOtherMemberItems,
} from './distributionTooltipContent';
import { DistributionTooltipProps } from './types';

import Styles from './DistributionTooltip.module.scss';

/**
 * Laid out like the time-series tooltip: the hovered group above the divider, every
 * group below it, largest first. Over Other, the list is the groups Other sums, as
 * on Pie. The bucket comes from the live cursor, not uPlot's `cursor.idx`: that
 * snaps to the nearest bucket centre, which on uneven widths is often the neighbour.
 */
export default function DistributionTooltip({
	id,
	uPlotInstance,
	xAxis,
	layout,
	labels,
	colors,
	counts,
	otherMembers,
	onOtherMemberClick,
	formatBound,
	isPinned,
	dismiss,
	renderTooltipFooter,
}: DistributionTooltipProps): JSX.Element | null {
	// Read outside the memo: uPlot mutates the same instance on every move.
	const { left = -10, top = -10 } = uPlotInstance.cursor;

	const hover = useMemo(() => {
		if (left < 0 || top < 0) {
			return null;
		}
		const x = uPlotInstance.posToVal(left, 'x');
		const bucket = resolveRowIndex(xAxis.edges, x);
		if (bucket === null) {
			return null;
		}
		return {
			bucket,
			series: resolveNearestSeries(
				layout,
				bucket,
				x,
				uPlotInstance.posToVal(top, 'y'),
			),
		};
	}, [left, top, uPlotInstance, xAxis, layout]);

	// Other is drawn last.
	const otherIndex = otherMembers.length > 0 ? labels.length - 1 : null;
	const isOtherHovered = otherIndex !== null && hover?.series === otherIndex;

	const content = useMemo(() => {
		if (!hover) {
			return null;
		}
		const { active, items } = buildDistributionTooltipItems({
			labels,
			colors,
			counts,
			bucket: hover.bucket,
			hoveredSeries: hover.series,
			formatLabel: (label, series) =>
				series === otherIndex ? `${label} (${otherMembers.length})` : label,
		});
		const total = items.reduce((sum, item) => sum + item.value, 0);
		if (!isOtherHovered) {
			return { active, items, total, members: [] };
		}
		const members = buildOtherMemberItems({
			members: otherMembers,
			bucket: hover.bucket,
		});
		return {
			active,
			items: members.map(({ item }) => item),
			total,
			members,
		};
	}, [hover, labels, colors, counts, otherIndex, otherMembers, isOtherHovered]);

	// The menu opens where the tooltip was, which closes first.
	const handleMemberClick = useCallback(
		(index: number, event: ReactMouseEvent): void => {
			const rect = (event.currentTarget as Element)
				.closest('[data-distribution-tooltip]')
				?.getBoundingClientRect();
			const member = content?.members[index];
			dismiss();
			if (member) {
				onOtherMemberClick?.(member.sourceIndex, {
					x: rect?.left ?? event.clientX,
					y: rect?.top ?? event.clientY,
				});
			}
		},
		[content, dismiss, onOtherMemberClick],
	);

	if (!hover || !content) {
		return null;
	}

	const canPickMember = isOtherHovered && isPinned && !!onOtherMemberClick;
	// As in the shared tooltip, a lone row that is the active one collapses into it.
	const shouldShowList =
		content.items.length > 1 ||
		(content.items.length === 1 && content.active === null);

	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-distribution-tooltip
			data-testid="distribution-tooltip"
		>
			<div className={Styles.title}>
				<span
					className={Styles.titleBucket}
					data-testid="distribution-tooltip-range"
				>
					{formatRowLabel(xAxis.rows[hover.bucket], formatBound)}
				</span>
				<span className={Styles.titleSeparator} />
				<span
					className={Styles.titleCount}
					data-testid="distribution-tooltip-total"
				>
					{content.total.toLocaleString()}
				</span>
				{isPinned && <TooltipPinnedBadge />}
			</div>

			{content.active && (
				<div className={Styles.activeItem}>
					<TooltipItem
						item={content.active}
						isItemActive
						containerTestId="distribution-tooltip-active"
					/>
				</div>
			)}

			{shouldShowList && content.active && <span className={Styles.divider} />}

			{shouldShowList && (
				<TooltipList
					id={id}
					content={content.items}
					onItemClick={canPickMember ? handleMemberClick : undefined}
				/>
			)}

			{isOtherHovered ? (
				<GroupedTooltipFooter
					isGroup
					isPinned={isPinned}
					canDrilldown={!!onOtherMemberClick}
					onUnpin={dismiss}
				/>
			) : (
				renderTooltipFooter?.({ isPinned, dismiss })
			)}
		</div>
	);
}
