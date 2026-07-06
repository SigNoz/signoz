import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type { QueryData } from 'types/api/widgets/getQuery';
import type uPlot from 'uplot';

import type { PanelSeries, PanelSeriesPoint } from './types';

// uPlot data prep over the flat `PanelSeries[]`. uPlot's x is epoch seconds but
// `PanelSeriesPoint.timestamp` is epoch ms — this is the single seam between wire and chart time.

function toPlotValue(value: number): number | null {
	return Number.isFinite(value) ? value : null;
}

/**
 * Aligns all series onto one shared x-axis (union of timestamps, sorted), `null`-filling missing
 * samples. A series with no values yields an empty array (legacy `fillMissingXAxisTimestamps` parity).
 */
export function prepareAlignedData(series: PanelSeries[]): uPlot.AlignedData {
	const timestampSet = new Set<number>();
	series.forEach((s) => {
		s.values.forEach((point) => {
			timestampSet.add(Math.floor(point.timestamp / 1000));
		});
	});
	const timestamps = Array.from(timestampSet).sort((a, b) => a - b);

	const yValues = series.map((s) => {
		if (!s.values.length) {
			return [];
		}
		const valueByTimestamp = new Map<number, number | null>();
		s.values.forEach((point) => {
			valueByTimestamp.set(
				Math.floor(point.timestamp / 1000),
				toPlotValue(point.value),
			);
		});
		return timestamps.map((ts) => valueByTimestamp.get(ts) ?? null);
	});

	return [timestamps, ...yValues] as uPlot.AlignedData;
}

/**
 * True when the series has at most one finite point — can't draw a line, so renderers degrade to
 * points (V1 `hasSingleVisiblePoint` parity).
 */
export function hasSingleVisiblePoint(values: PanelSeriesPoint[]): boolean {
	let validPointCount = 0;
	for (const point of values) {
		if (Number.isFinite(point.value)) {
			validPointCount += 1;
			if (validPointCount > 1) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Legacy-shape adapter for the V1-shared `onClickPlugin`, which reads the old tuple-shaped
 * `payload.data.result`. The only place the tuple shape survives in V2; remove when V2 grows its
 * own click plugin.
 */
export function toClickPluginPayload(
	series: PanelSeries[],
): MetricRangePayloadProps {
	const result = series.map(
		(s) =>
			({
				metric: s.labels,
				queryName: s.queryName,
				legend: s.legend,
				values: s.values.map(
					(point) =>
						[Math.floor(point.timestamp / 1000), String(point.value)] as [
							number,
							string,
						],
				),
				metaData: {
					alias: s.aggregation.alias,
					index: s.aggregation.index,
					queryName: s.queryName,
				},
			}) as unknown as QueryData,
	);

	// `newResult` is required on the legacy type but the click plugin never reads it — omit, cast through unknown.
	return {
		data: { result, resultType: '' },
	} as unknown as MetricRangePayloadProps;
}
