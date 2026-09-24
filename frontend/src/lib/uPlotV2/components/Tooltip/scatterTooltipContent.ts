import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import type uPlot from 'uplot';

import type {
	ScatterChannel,
	ScatterChannels,
	ScatterSeriesData,
} from '../../plugins/ScatterPlugin/types';
import { resolveSeriesColor } from './utils';

export interface ScatterHoveredPoint {
	seriesIndex: number;
	dataIndex: number;
	label: string;
	color: string;
	x: number;
	y: number;
	size: number | null;
}

export interface ScatterTooltipRow {
	label: string;
	value: string;
}

/** The point the cursor resolved to: the focused series' own index into its columns. */
export function resolveHoveredPoint(
	u: uPlot,
	seriesIndex: number | null,
	dataIndexes: Array<number | null>,
): ScatterHoveredPoint | null {
	if (seriesIndex == null || seriesIndex < 1) {
		return null;
	}
	const dataIndex = dataIndexes[seriesIndex];
	const series = u.series[seriesIndex];
	const columns = u.data[seriesIndex] as unknown as
		| ScatterSeriesData
		| undefined;
	if (dataIndex == null || !series || !columns) {
		return null;
	}
	const x = columns[0][dataIndex];
	const y = columns[1][dataIndex];
	if (x == null || y == null) {
		return null;
	}
	return {
		seriesIndex,
		dataIndex,
		label: String(series.label ?? ''),
		color: resolveSeriesColor(series.stroke, u, seriesIndex),
		x,
		y,
		size: columns[2]?.[dataIndex] ?? null,
	};
}

function formatChannel(
	value: number,
	channel: ScatterChannel,
	decimalPrecision?: PrecisionOption,
): string {
	return getToolTipValue(value, channel.unit, decimalPrecision);
}

export function buildChannelRows(
	point: ScatterHoveredPoint,
	channels: ScatterChannels,
	decimalPrecision?: PrecisionOption,
): ScatterTooltipRow[] {
	const rows: ScatterTooltipRow[] = [
		{
			label: channels.x.label,
			value: formatChannel(point.x, channels.x, decimalPrecision),
		},
		{
			label: channels.y.label,
			value: formatChannel(point.y, channels.y, decimalPrecision),
		},
	];
	if (channels.size && point.size != null) {
		rows.push({
			label: channels.size.label,
			value: formatChannel(point.size, channels.size, decimalPrecision),
		});
	}
	return rows;
}
