import type {
	Querybuildertypesv5TimeSeriesDataDTO,
	Querybuildertypesv5TimeSeriesDTO,
} from 'api/generated/services/sigNoz.schemas';
import getLabelName from 'lib/getLabelName';
import type {
	HeatmapSeries,
	HeatmapSeriesLabel,
	HeatmapSeriesPoint,
} from 'lib/uPlotV2/plugins/HeatmapPlugin/types';

const MS_PER_SECOND = 1000;

/** Used when neither the response nor the data says how wide a column is. */
export const FALLBACK_STEP_SECONDS = 60;

export interface HeatmapPanelData {
	/** Ascending bucket upper bounds shared by every group; empty means no grid. */
	buckets: number[];
	/** One entry per group; an ungrouped query yields a single unlabelled entry. */
	series: HeatmapSeries[];
	/** Query the grid came from — the key its step interval is reported under. */
	queryName: string;
}

const EMPTY_DATA: HeatmapPanelData = {
	buckets: [],
	series: [],
	queryName: '',
};

/**
 * V5 heatmap results → the chart's `buckets` + `series`. The counts are already
 * bucketed server-side: each point carries one per bucket bound plus the trailing
 * open-above overflow, in the order of the aggregation's `meta.buckets`.
 *
 * Only the first aggregation carrying bounds is read. Each aggregation comes back
 * with its own bucket axis and a grid has exactly one y axis — which is why the
 * request admits a single enabled query in the first place.
 */
export function prepareHeatmapData({
	results,
	legendMap,
}: {
	results: Querybuildertypesv5TimeSeriesDataDTO[];
	/** queryName → user legend, applied as the group label's template. */
	legendMap: Record<string, string>;
}): HeatmapPanelData {
	for (const result of results) {
		const queryName = result.queryName ?? '';
		for (const aggregation of result.aggregations ?? []) {
			const buckets = aggregation.meta?.buckets;
			if (!buckets?.length) {
				continue;
			}
			return {
				buckets,
				queryName,
				series: (aggregation.series ?? []).map((series) =>
					toHeatmapSeries(series, queryName, legendMap[queryName] ?? ''),
				),
			};
		}
	}

	return EMPTY_DATA;
}

/**
 * Column width in seconds. The server's effective step is authoritative — the last
 * column has no successor to infer a width from — so the timestamp delta is only a
 * fallback for a response that reports no step.
 */
export function resolveHeatmapStep({
	series,
	stepInterval,
}: {
	series: HeatmapSeries[];
	/** `meta.stepIntervals[queryName]`, in seconds. */
	stepInterval: number | undefined;
}): number {
	if (stepInterval && stepInterval > 0) {
		return stepInterval;
	}

	const points = series[0]?.points ?? [];
	for (let index = 1; index < points.length; index++) {
		const delta = points[index].timestamp - points[index - 1].timestamp;
		if (delta > 0) {
			return delta;
		}
	}

	return FALLBACK_STEP_SECONDS;
}

function toHeatmapSeries(
	series: Querybuildertypesv5TimeSeriesDTO,
	queryName: string,
	legend: string,
): HeatmapSeries {
	const labels = (series.labels ?? []).flatMap<HeatmapSeriesLabel>((label) =>
		label.key?.name ? [{ key: label.key.name, value: String(label.value) }] : [],
	);

	return {
		// An ungrouped query is one group with nothing to name it — the legend hides
		// itself for a single group, and the tooltip breaks down buckets instead.
		label: labels.length > 0 ? resolveGroupLabel(labels, queryName, legend) : '',
		labels,
		points: (series.values ?? []).map<HeatmapSeriesPoint>((point) => ({
			timestamp: (point.timestamp ?? 0) / MS_PER_SECOND,
			// `null` is "no data", which a non-finite count is; `0` is an observed
			// absence and stays a number.
			counts: (point.values ?? []).map((count) =>
				Number.isFinite(count) ? count : null,
			),
		})),
	};
}

function resolveGroupLabel(
	labels: HeatmapSeriesLabel[],
	queryName: string,
	legend: string,
): string {
	const record: Record<string, string> = {};
	labels.forEach((label) => {
		record[label.key] = label.value;
	});
	return getLabelName(record, queryName, legend);
}
