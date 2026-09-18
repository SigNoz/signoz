import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { formatRowLabel } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import {
	HeatmapSeries,
	HeatmapYAxis,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

/** Rows shown either side of the hovered one. */
const NEIGHBOUR_SPAN = 2;
/** Below this share a percentage needs a decimal to stay informative. */
const PERCENT_DECIMAL_THRESHOLD = 10;
/** Below this, the header needs seconds to distinguish columns. */
const SUB_MINUTE_STEP = 60;

export const NO_DATA_LABEL = 'no data';

/**
 * Which question the second block answers. A cell summed across several groups begs
 * "which group?"; a cell that is already one series begs "how does this bucket
 * compare with its neighbours?".
 */
export enum HeatmapTooltipBody {
	Buckets = 'buckets',
	Contribution = 'contribution',
}

export interface HeatmapBucketRow {
	label: string;
	count: number | null;
	isHovered: boolean;
}

export interface HeatmapContributionRow {
	label: string;
	color: string;
	count: number;
	/** Share of the cell's total, 0..100. */
	percent: number;
}

export function resolveTooltipBody(visibleCount: number): HeatmapTooltipBody {
	// One enabled group contributes the whole cell, so there is nothing to break
	// down — whether the query is ungrouped or the legend has isolated a group.
	return visibleCount > 1
		? HeatmapTooltipBody.Contribution
		: HeatmapTooltipBody.Buckets;
}

/** A cell is an interval, so a single instant would misreport which observations
 *  it contains. The date is left to the x axis directly below. */
export function formatColumnRange({
	start,
	step,
	timezone,
}: {
	/** Column start, in seconds. */
	start: number;
	/** Column width, in seconds. */
	step: number;
	timezone: string;
}): string {
	const format =
		step < SUB_MINUTE_STEP
			? DATE_TIME_FORMATS.TIME_SECONDS
			: DATE_TIME_FORMATS.TIME;
	const from = dayjs(start * 1000).tz(timezone);
	const to = dayjs((start + step) * 1000).tz(timezone);
	return `${from.format(format)} → ${to.format(format)}`;
}

/** Formatted with the panel's unit. */
export function formatBucketLabel({
	yAxis,
	row,
	yAxisUnit,
	decimalPrecision,
}: {
	yAxis: HeatmapYAxis;
	row: number;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}): string {
	const bucket = yAxis.rows[row];
	if (!bucket) {
		return '';
	}
	return formatRowLabel(bucket, (value) =>
		getToolTipValue(String(value), yAxisUnit, decimalPrecision),
	);
}

export function formatCount(count: number | null): string {
	return count === null ? NO_DATA_LABEL : count.toLocaleString();
}

export function formatPercent(percent: number): string {
	return percent >= PERCENT_DECIMAL_THRESHOLD
		? `${Math.round(percent)}%`
		: `${percent.toFixed(1)}%`;
}

/** Names the group the grid is currently isolated to. */
export function formatGroupFilter(series: HeatmapSeries | undefined): string {
	if (!series) {
		return '';
	}
	if (!series.labels?.length) {
		return series.label;
	}
	return series.labels
		.map((label) => `${label.key} = ${label.value}`)
		.join(', ');
}

/** The `groupBy` keys the breakdown is by. */
export function resolveGroupByLabel(series: HeatmapSeries[]): string {
	const keys = series[0]?.labels?.map((label) => label.key) ?? [];
	return keys.join(', ');
}

function formatSeriesValue(series: HeatmapSeries): string {
	if (!series.labels?.length) {
		return series.label;
	}
	return series.labels.map((label) => label.value).join(', ');
}

/** Highest first, so the list reads in the same direction as the y axis. */
export function buildBucketRows({
	counts,
	yAxis,
	row,
	column,
	yAxisUnit,
	decimalPrecision,
}: {
	/** Row-major, as the renderer draws them. */
	counts: Array<ArrayLike<number | null> | undefined>;
	yAxis: HeatmapYAxis;
	row: number;
	column: number;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
}): HeatmapBucketRow[] {
	const formatBucketValue = (value: number): string =>
		getToolTipValue(String(value), yAxisUnit, decimalPrecision);

	const rows: HeatmapBucketRow[] = [];
	for (let offset = NEIGHBOUR_SPAN; offset >= -NEIGHBOUR_SPAN; offset -= 1) {
		const index = row + offset;
		const bucket = yAxis.rows[index];
		if (!bucket) {
			continue;
		}
		rows.push({
			label: formatRowLabel(bucket, formatBucketValue),
			count: counts[index]?.[column] ?? null,
			isHovered: offset === 0,
		});
	}
	return rows;
}

/**
 * Largest first. Groups that contributed nothing are still listed — that is an
 * answer, and dropping the row makes the list look truncated.
 */
export function buildContributionRows({
	series,
	timestamp,
	row,
	color,
}: {
	/** Only the groups the legend has enabled — they are what the cell sums. */
	series: HeatmapSeries[];
	/** Column start, in seconds. */
	timestamp: number;
	row: number;
	color: string;
}): HeatmapContributionRow[] {
	const counts = series.map((entry) => {
		const point = entry.points.find((item) => item.timestamp === timestamp);
		// Absent or null contributed nothing to the sum, which is what this breaks down.
		return point?.counts[row] ?? 0;
	});
	const total = counts.reduce((sum, count) => sum + count, 0);

	return series
		.map((entry, index) => ({
			label: formatSeriesValue(entry),
			color,
			count: counts[index],
			percent: total > 0 ? (counts[index] / total) * 100 : 0,
		}))
		.sort((a, b) => b.count - a.count);
}
