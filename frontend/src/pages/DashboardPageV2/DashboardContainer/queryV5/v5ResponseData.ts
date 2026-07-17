import type {
	Querybuildertypesv5AggregationBucketDTO,
	Querybuildertypesv5ExecStatsDTO,
	Querybuildertypesv5RawDataDTO,
	Querybuildertypesv5RequestTypeDTO,
	Querybuildertypesv5ScalarDataDTO,
	Querybuildertypesv5TimeSeriesDataDTO,
	Querybuildertypesv5TimeSeriesDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { isEmpty } from 'lodash-es';

import type { PanelSeries, PanelSeriesKind } from './types';

// Orval erases the response `results` element type to `unknown[]`, so each accessor here narrows
// it once — guarded by the response `type` discriminator. The single place that cast lives.

export function getTimeSeriesResults(
	response: QueryRangeV5200 | undefined,
): Querybuildertypesv5TimeSeriesDataDTO[] {
	if (response?.data?.type !== 'time_series') {
		return [];
	}
	return (response.data.data?.results ??
		[]) as Querybuildertypesv5TimeSeriesDataDTO[];
}

export function getScalarResults(
	response: QueryRangeV5200 | undefined,
): Querybuildertypesv5ScalarDataDTO[] {
	if (response?.data?.type !== 'scalar') {
		return [];
	}
	return (response.data.data?.results ??
		[]) as Querybuildertypesv5ScalarDataDTO[];
}

export function getRawResults(
	response: QueryRangeV5200 | undefined,
): Querybuildertypesv5RawDataDTO[] {
	const data = response?.data;
	if (data?.type !== 'raw' && data?.type !== 'trace') {
		return [];
	}
	return (data.data?.results ?? []) as Querybuildertypesv5RawDataDTO[];
}

/** Response request-type discriminator (raw/trace/scalar/time_series); detects a stale cross-type response. */
export function getResponseType(
	response: QueryRangeV5200 | undefined,
): Querybuildertypesv5RequestTypeDTO | undefined {
	return response?.data?.type;
}

/** Exec stats (incl. per-query `stepIntervals`) from the response top level. */
export function getExecStats(
	response: QueryRangeV5200 | undefined,
): Querybuildertypesv5ExecStatsDTO | undefined {
	return response?.data?.meta;
}

/**
 * V5 labels are `{key: {name}, value}` pairs → flat name → value record with string values
 * (uPlot/getLabelName contract).
 */
function labelsToRecord(
	series: Querybuildertypesv5TimeSeriesDTO,
): Record<string, string> {
	const record: Record<string, string> = {};
	(series.labels ?? []).forEach((label) => {
		if (label.key?.name) {
			record[label.key.name] = String(label.value);
		}
	});
	return record;
}

/**
 * Legend/labels backfill (V1 parity): a series with no labels falls back to the query name as its
 * legend and mirrors the name into `labels` so downstream label-driven naming has something to show.
 */
function resolveLegendAndLabels(
	queryName: string,
	labels: Record<string, string>,
	legendMap: Record<string, string>,
): { legend: string; labels: Record<string, string> } {
	let legend = legendMap[queryName] ?? '';
	if (isEmpty(labels)) {
		if (!legend) {
			legend = queryName;
		}
		if (legend === queryName) {
			return { legend, labels: { [queryName]: queryName } };
		}
	}
	return { legend, labels };
}

const BUCKET_FIELD_TO_KIND: Record<
	PanelSeriesKind,
	keyof Querybuildertypesv5AggregationBucketDTO
> = {
	series: 'series',
	predicted: 'predictedSeries',
	upperBound: 'upperBoundSeries',
	lowerBound: 'lowerBoundSeries',
	anomalyScores: 'anomalyScores',
};

/**
 * Flattens the V5 time-series result tree (`results[].aggregations[].series[]` + anomaly
 * companions) into the flat `PanelSeries[]` renderers iterate. Values stay numeric, timestamps
 * stay epoch-ms — no legacy stringification.
 */
export function flattenTimeSeries(
	results: Querybuildertypesv5TimeSeriesDataDTO[],
	legendMap: Record<string, string>,
): PanelSeries[] {
	const flattened: PanelSeries[] = [];

	// Kind-outer iteration so flat order matches the legacy chain (per query: plain series, then
	// anomaly companions) — series order drives uPlot color assignment.
	results.forEach((result) => {
		const queryName = result.queryName ?? '';
		(Object.keys(BUCKET_FIELD_TO_KIND) as PanelSeriesKind[]).forEach((kind) => {
			(result.aggregations ?? []).forEach((bucket) => {
				const seriesList = bucket[BUCKET_FIELD_TO_KIND[kind]] as
					| Querybuildertypesv5TimeSeriesDTO[]
					| null
					| undefined;

				(seriesList ?? []).forEach((series) => {
					const { legend, labels } = resolveLegendAndLabels(
						queryName,
						labelsToRecord(series),
						legendMap,
					);
					flattened.push({
						queryName,
						legend,
						labels,
						kind,
						values: (series.values ?? []).map((value) => ({
							timestamp: value.timestamp ?? 0,
							value: value.value ?? 0,
							...(value.partial ? { partial: true } : {}),
						})),
						aggregation: {
							index: bucket.index ?? 0,
							alias: bucket.alias ?? '',
							unit: bucket.meta?.unit,
						},
					});
				});
			});
		});
	});

	return flattened;
}
