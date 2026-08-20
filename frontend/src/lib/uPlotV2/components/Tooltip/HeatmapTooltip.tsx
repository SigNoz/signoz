import { useMemo } from 'react';
import cx from 'classnames';
import {
	resolveColumnIndex,
	resolveRowIndex,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import { useTimezone } from 'providers/Timezone';

import { HeatmapTooltipProps } from '../types';
import HeatmapBucketList from './HeatmapBucketList';
import HeatmapContributionList from './HeatmapContributionList';
import {
	buildBucketRows,
	buildContributionRows,
	formatBucketLabel,
	formatColumnRange,
	formatCount,
	formatGroupFilter,
	HeatmapTooltipBody,
	resolveGroupByLabel,
	resolveTooltipBody,
} from './heatmapTooltipContent';

import Styles from './HeatmapTooltip.module.scss';

/**
 * The cell identity is the same in every state; the second block answers whichever
 * question the panel state leaves open (see `resolveTooltipBody`). Purpose-built
 * rather than composed from the shared `Tooltip`, which renders a flat list of
 * series values — none of these states is that shape.
 *
 * The cell comes from the live cursor, not a prop: uPlot's `cursor.idx` snaps to
 * the nearest timestamp, so half of every column would report its neighbour.
 */
export default function HeatmapTooltip({
	uPlotInstance,
	yAxis,
	step,
	series,
	visibleGroups,
	groupColor,
	yAxisUnit,
	decimalPrecision,
	timezone,
	isPinned,
	dismiss,
	renderTooltipFooter,
}: HeatmapTooltipProps): JSX.Element | null {
	const { timezone: userTimezone } = useTimezone();
	const resolvedTimezone = timezone?.value ?? userTimezone.value;

	// Read outside the memo: uPlot mutates the same instance on every move, so
	// keying off the instance alone would freeze the cell.
	const { left = -10, top = -10 } = uPlotInstance.cursor;

	const cell = useMemo(() => {
		if (left < 0 || top < 0) {
			return null;
		}
		const timestamps = uPlotInstance.data[0] as ArrayLike<number>;
		const column = resolveColumnIndex(
			timestamps,
			uPlotInstance.posToVal(left, 'x'),
			step,
		);
		const row = resolveRowIndex(yAxis.edges, uPlotInstance.posToVal(top, 'y'));
		if (column === null || row === null) {
			return null;
		}
		return {
			row,
			column,
			timestamp: timestamps[column],
			count:
				(uPlotInstance.data[row + 1] as Array<number | null> | undefined)?.[
					column
				] ?? null,
		};
	}, [left, top, uPlotInstance, yAxis, step]);

	// The cell sums the enabled groups, so those are what a breakdown must cover.
	const visible = useMemo(
		() => series.filter((entry) => visibleGroups.includes(entry.label)),
		[series, visibleGroups],
	);
	const body = resolveTooltipBody(visible.length);

	const bucketRows = useMemo(() => {
		if (!cell || body !== HeatmapTooltipBody.Buckets) {
			return [];
		}
		return buildBucketRows({
			counts: uPlotInstance.data.slice(1) as Array<
				ArrayLike<number | null> | undefined
			>,
			yAxis,
			row: cell.row,
			column: cell.column,
			yAxisUnit,
			decimalPrecision,
		});
	}, [cell, body, uPlotInstance, yAxis, yAxisUnit, decimalPrecision]);

	const contributionRows = useMemo(() => {
		if (!cell || body !== HeatmapTooltipBody.Contribution) {
			return [];
		}
		return buildContributionRows({
			series: visible,
			timestamp: cell.timestamp,
			row: cell.row,
			color: groupColor,
		});
	}, [cell, body, visible, groupColor]);

	if (!cell) {
		return null;
	}

	// A single enabled group out of several means the legend has isolated it.
	const isolated =
		series.length > 1 && visible.length === 1 ? visible[0] : undefined;
	const filterLabel = formatGroupFilter(isolated);

	return (
		<div
			className={cx(Styles.container, { [Styles.pinned]: isPinned })}
			data-pinned={isPinned}
			data-testid="heatmap-tooltip"
		>
			<div className={Styles.identity}>
				<div className={Styles.header}>
					<span data-testid="heatmap-tooltip-range">
						{formatColumnRange({
							start: cell.timestamp,
							step,
							timezone: resolvedTimezone,
						})}
					</span>
					{filterLabel && (
						<span
							className={Styles.filter}
							style={{ color: groupColor }}
							data-testid="heatmap-tooltip-filter"
						>
							<span className={Styles.filterMarker} />
							<span className={Styles.filterLabel}>{filterLabel}</span>
						</span>
					)}
				</div>

				<div className={Styles.title}>
					<span className={Styles.titleBucket} data-testid="heatmap-tooltip-bucket">
						{formatBucketLabel({
							yAxis,
							row: cell.row,
							yAxisUnit,
							decimalPrecision,
						})}
					</span>
					<span className={Styles.titleCount} data-testid="heatmap-tooltip-count">
						{formatCount(cell.count)}
					</span>
				</div>
			</div>

			<span className={Styles.divider} data-testid="heatmap-tooltip-divider" />

			{body === HeatmapTooltipBody.Contribution ? (
				<HeatmapContributionList
					rows={contributionRows}
					groupByLabel={resolveGroupByLabel(series)}
				/>
			) : (
				<HeatmapBucketList rows={bucketRows} />
			)}

			{renderTooltipFooter?.({ isPinned, dismiss })}
		</div>
	);
}
