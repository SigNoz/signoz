import type { Querybuildertypesv5QueryRangeResponseDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5QueryRangeResponseDTO';
import type { Querybuildertypesv5TimeSeriesDataDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5TimeSeriesDataDTO';
import type { Querybuildertypesv5TimeSeriesDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5TimeSeriesDTO';
import type { Querybuildertypesv5TimeSeriesValueDTO } from 'api/generated/services/sigNoz.schemas/querybuildertypesv5TimeSeriesValueDTO';
import type { SuccessResponse } from 'types/api';
import type { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

function findSeries(
	series: Querybuildertypesv5TimeSeriesDTO[] | null | undefined,
	label: string,
): Querybuildertypesv5TimeSeriesDTO | undefined {
	return series?.find((entry) =>
		(entry.labels ?? []).some((value) => value.value === label),
	);
}

function toChartValues(
	points: Querybuildertypesv5TimeSeriesValueDTO[],
): [number, string][] {
	return points.map((point) => [
		Math.floor((point.timestamp ?? 0) / 1000),
		String(point.value ?? 0),
	]);
}

export function buildVolumeChartPayload(
	response?: Querybuildertypesv5QueryRangeResponseDTO,
): SuccessResponse<MetricRangePayloadProps> {
	const result = response?.data?.results?.[0] as
		| Querybuildertypesv5TimeSeriesDataDTO
		| undefined;
	const series = result?.aggregations?.[0]?.series;

	const ingested = findSeries(series, 'ingested')?.values ?? [];
	const retained = findSeries(series, 'retained')?.values ?? [];

	return {
		statusCode: 200,
		message: 'Success',
		error: null,
		payload: {
			data: {
				resultType: 'matrix',
				result: [
					{
						queryName: 'ingested',
						legend: 'Ingested',
						metric: {},
						values: toChartValues(ingested),
					},
					{
						queryName: 'retained',
						legend: 'Retained',
						metric: {},
						values: toChartValues(retained),
					},
				],
				newResult: { data: { result: [], resultType: 'matrix' } },
			},
		},
	};
}
