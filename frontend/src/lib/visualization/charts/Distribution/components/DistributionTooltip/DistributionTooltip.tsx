import { useMemo } from 'react';
import cx from 'classnames';
import {
	formatRowLabel,
	resolveRowIndex,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import TooltipPinnedBadge from 'lib/uPlotV2/components/Tooltip/components/TooltipPinnedBadge/TooltipPinnedBadge';
import ItemStyles from 'lib/uPlotV2/components/Tooltip/components/TooltipItem/TooltipItem.module.scss';

import { resolveNearestSeries } from '../../layout';
import {
	buildDistributionTooltipRows,
	formatPercent,
	resolveGroupColumn,
} from './distributionTooltipContent';
import { DistributionTooltipProps } from './types';

import Styles from './DistributionTooltip.module.scss';

/**
 * The bucket comes from the live cursor, not uPlot's `cursor.idx`: that snaps to the
 * nearest bucket centre, which on uneven widths is often the neighbour.
 */
export default function DistributionTooltip({
	uPlotInstance,
	xAxis,
	layout,
	labels,
	colors,
	counts,
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

	const groupColumn = useMemo(() => resolveGroupColumn(labels), [labels]);

	const rows = useMemo(
		() =>
			hover
				? buildDistributionTooltipRows({
						labels,
						colors,
						counts,
						bucket: hover.bucket,
						hoveredSeries: hover.series,
						formatLabel: groupColumn.format,
					})
				: [],
		[hover, labels, colors, counts, groupColumn],
	);

	if (!hover) {
		return null;
	}

	const bucket = xAxis.rows[hover.bucket];
	const bucketTotal = rows.reduce((sum, row) => sum + row.count, 0);

	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-testid="distribution-tooltip"
		>
			<div className={Styles.title}>
				<span
					className={Styles.titleBucket}
					data-testid="distribution-tooltip-range"
				>
					{formatRowLabel(bucket, formatBound)}
				</span>
				<span className={Styles.titleSeparator} />
				<span
					className={Styles.titleCount}
					data-testid="distribution-tooltip-total"
				>
					{bucketTotal.toLocaleString()}
				</span>
				{isPinned && <TooltipPinnedBadge />}
			</div>

			<span className={Styles.divider} />

			<div className={Styles.rows}>
				<div className={Styles.columnHeader}>
					<span className={Styles.columnLabel} title={groupColumn.heading}>
						{groupColumn.heading}
					</span>
					<span>Count</span>
					<span>% Total</span>
					<span data-testid="distribution-tooltip-cumulative-heading">
						{bucket.isOverflow ? 'All' : `≤ ${formatBound(bucket.upper)}`}
					</span>
				</div>
				{rows.map((row) => (
					<div
						key={row.seriesIndex}
						className={cx(ItemStyles.uplotTooltipItem, Styles.row)}
						data-is-active={row.isHovered}
						data-testid="distribution-tooltip-row"
						data-hovered={row.isHovered}
					>
						<span
							className={ItemStyles.uplotTooltipItemMarker}
							style={{ borderColor: row.color, backgroundColor: row.color }}
						/>
						<span className={ItemStyles.uplotTooltipItemLabel} title={row.label}>
							{row.label}
						</span>
						<span className={ItemStyles.uplotTooltipItemValue}>
							{row.count.toLocaleString()}
						</span>
						<span className={ItemStyles.uplotTooltipItemValue}>
							{formatPercent(row.share)}
						</span>
						<span className={ItemStyles.uplotTooltipItemValue}>
							{formatPercent(row.cumulativeShare)}
						</span>
					</div>
				))}
			</div>

			{renderTooltipFooter?.({ isPinned, dismiss })}
		</div>
	);
}
