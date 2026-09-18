import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import timezonePlugin from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { formatRowLabel } from 'lib/uPlotV2/plugins/HeatmapPlugin/geometry';
import {
	HeatmapSeries,
	HeatmapYAxis,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/** Rows shown either side of the hovered one. */
const NEIGHBOUR_SPAN = 2;
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
	/** The bucket's row on the y axis. Labels are not unique — two boundaries can
	 *  round to the same text — so this is what identifies a row. */
	row: number;
	label: string;
	count: number | null;
	isHovered: boolean;
}

export interface HeatmapContributionRow {
	label: string;
	color: string;
	count: number;
}

export function resolveTooltipBody(visibleCount: number): HeatmapTooltipBody {
	// One enabled group contributes the whole cell, so there is nothing to break
	// down — whether the query is ungrouped or the legend has isolated a group.
	return visibleCount > 1
		? HeatmapTooltipBody.Contribution
		: HeatmapTooltipBody.Buckets;
}

/** A cell is an interval, so a single instant would misreport what it contains.
 *  The start carries the date — the x axis prints one only where the day turns
 *  over — and the end repeats it only across midnight. */
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
	const time =
		step < SUB_MINUTE_STEP
			? DATE_TIME_FORMATS.TIME_SECONDS
			: DATE_TIME_FORMATS.TIME;
	const dated = `${DATE_TIME_FORMATS.DATE_SHORT} ${time}`;
	const from = dayjs(start * 1000).tz(timezone);
	const to = dayjs((start + step) * 1000).tz(timezone);
	const toFormat = to.isSame(from, 'day') ? time : dated;
	return `${from.format(dated)} → ${to.format(toFormat)}`;
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
			row: index,
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
	/** The grid's one colour; there is no per-series hue. */
	color: string;
}): HeatmapContributionRow[] {
	return series
		.map((entry) => {
			const point = entry.points.find((item) => item.timestamp === timestamp);
			return {
				label: entry.label,
				color,
				// Absent or null contributed nothing to the sum this breaks down.
				count: point?.counts[row] ?? 0,
			};
		})
		.sort((a, b) => b.count - a.count);
}
