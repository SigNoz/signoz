import { useMemo } from 'react';
import cx from 'classnames';
import { resolveRowIndex } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import {
	formatPercentileName,
	resolveNearestSeries,
} from 'lib/visualization/charts/Distribution/percentiles';

import TooltipPinnedBadge from '../TooltipPinnedBadge/TooltipPinnedBadge';
import {
	buildDistributionTooltipRows,
	formatBucketRange,
	formatPercent,
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
	visible,
	markers,
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

	const rows = useMemo(
		() =>
			hover
				? buildDistributionTooltipRows({
						labels,
						colors,
						counts,
						visible,
						bucket: hover.bucket,
						hoveredSeries: hover.series,
					})
				: [],
		[hover, labels, colors, counts, visible],
	);

	if (!hover) {
		return null;
	}

	const bucketTotal = rows.reduce((sum, row) => sum + row.count, 0);

	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-testid="distribution-tooltip"
		>
			<div className={Styles.header}>
				<span className={Styles.range} data-testid="distribution-tooltip-range">
					{formatBucketRange(xAxis.rows[hover.bucket], formatBound)}
				</span>
				<span className={Styles.total} data-testid="distribution-tooltip-total">
					{bucketTotal.toLocaleString()}
				</span>
				{isPinned && <TooltipPinnedBadge />}
			</div>

			<span className={Styles.divider} />

			<div className={Styles.rows}>
				<div className={Styles.columnHeader}>
					<span className={Styles.columnLabel}>Group</span>
					<span>Count</span>
					<span className={Styles.share}>%</span>
					<span className={Styles.share}>≤ %</span>
				</div>
				{rows.map((row) => (
					<div
						key={row.label}
						className={cx(Styles.row, { [Styles.rowHovered]: row.isHovered })}
						data-testid="distribution-tooltip-row"
						data-hovered={row.isHovered}
					>
						<span
							className={Styles.marker}
							style={{ borderColor: row.color, backgroundColor: row.color }}
						/>
						<span className={Styles.rowLabel}>{row.label}</span>
						<span className={Styles.rowValue}>{row.count.toLocaleString()}</span>
						<span className={Styles.share}>{formatPercent(row.share)}</span>
						<span className={Styles.share}>{formatPercent(row.cumulativeShare)}</span>
					</div>
				))}
			</div>

			{markers.length > 0 && (
				<>
					<span className={Styles.divider} />
					<div
						className={Styles.percentiles}
						data-testid="distribution-tooltip-percentiles"
					>
						{markers.map((marker) => (
							<div key={marker.percentile} className={Styles.percentile}>
								<span>{formatPercentileName(marker.percentile)}</span>
								<span className={Styles.rowValue}>
									{marker.isOverflow
										? `> ${formatBound(marker.value)}`
										: `~${formatBound(marker.value)}`}
								</span>
							</div>
						))}
					</div>
				</>
			)}

			{renderTooltipFooter?.({ isPinned, dismiss })}
		</div>
	);
}
