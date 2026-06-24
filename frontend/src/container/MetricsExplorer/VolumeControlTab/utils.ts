import {
	Querybuildertypesv5QueryRangeResponseDTO,
	Querybuildertypesv5TimeSeriesDataDTO,
	Querybuildertypesv5TimeSeriesDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

function findSeries(
	series: Querybuildertypesv5TimeSeriesDTO[] | null | undefined,
	label: string,
): Querybuildertypesv5TimeSeriesDTO | undefined {
	return series?.find((entry) =>
		(entry.labels ?? []).some((value) => value.value === label),
	);
}

// query-range chart values are [unixSeconds, valueString]; our points carry unix millis.
function toSeconds(timestampMs: number): number {
	return Math.floor(timestampMs / 1000);
}

// buildVolumeChartPayload adapts the v5 query-range timeseries into the chart payload as a kept + saved
// part-to-whole stack (kept + saved = original ingested volume).
export function buildVolumeChartPayload(
	response?: Querybuildertypesv5QueryRangeResponseDTO,
): SuccessResponse<MetricRangePayloadProps> {
	const result = response?.data?.results?.[0] as
		| Querybuildertypesv5TimeSeriesDataDTO
		| undefined;
	const series = result?.aggregations?.[0]?.series;

	const ingested = findSeries(series, 'ingested')?.values ?? [];
	const reduced = findSeries(series, 'reduced')?.values ?? [];
	const reducedByTs = new Map<number, number>();
	reduced.forEach((point) =>
		reducedByTs.set(point.timestamp ?? 0, point.value ?? 0),
	);

	const keptValues: [number, string][] = reduced.map((point) => [
		toSeconds(point.timestamp ?? 0),
		String(point.value ?? 0),
	]);
	const savedValues: [number, string][] = ingested.map((point) => {
		const saved = Math.max(
			0,
			(point.value ?? 0) - (reducedByTs.get(point.timestamp ?? 0) ?? 0),
		);
		return [toSeconds(point.timestamp ?? 0), String(saved)];
	});

	return {
		statusCode: 200,
		message: 'Success',
		error: null,
		payload: {
			data: {
				resultType: 'matrix',
				result: [
					{
						queryName: 'reduced',
						legend: 'Reduced (kept)',
						metric: {},
						values: keptValues,
					},
					{
						queryName: 'saved',
						legend: 'Saved',
						metric: {},
						values: savedValues,
					},
				],
				newResult: { data: { result: [], resultType: 'matrix' } },
			},
		},
	};
}
