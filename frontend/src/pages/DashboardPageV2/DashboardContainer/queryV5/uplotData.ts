import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import type { QueryData } from 'types/api/widgets/getQuery';
import type uPlot from 'uplot';

import type { PanelSeries, PanelSeriesPoint } from './types';

/**
 * uPlot data prep over the flat `PanelSeries[]`, V5-native counterpart of the
 * legacy `prepareChartData` chain. uPlot's x values are epoch seconds;
 * `PanelSeriesPoint.timestamp` is epoch ms, so the conversion happens here —
 * the single seam between wire time and chart time.
 */

function toPlotValue(value: number): number | null {
	return Number.isFinite(value) ? value : null;
}

/**
 * Aligns all series onto one shared x-axis: the union of every series'
 * timestamps, sorted ascending, with `null` filling the slots a series has no
 * sample for. A series with no values at all yields an empty array (legacy
 * `fillMissingXAxisTimestamps` parity).
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
 * True when the series has at most one finite point — such a series can't be
 * drawn as a line, so renderers degrade it to points (V1
 * `hasSingleVisiblePoint` parity).
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
 * LEGACY-SHAPE adapter for the shared `onClickPlugin` (lib/uPlotLib), which
 * maps pixel coordinates back to data through the old tuple-shaped
 * `payload.data.result`. The plugin is V1-shared and can't take `PanelSeries`;
 * this thin mapper is the only place the tuple shape survives in V2. Remove
 * when V2 grows its own click plugin.
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

	// `newResult` is declared required on the legacy type but the click plugin
	// never reads it — omit and cast through unknown.
	return {
		data: { result, resultType: '' },
	} as unknown as MetricRangePayloadProps;
}
