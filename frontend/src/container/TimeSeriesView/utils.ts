import { SuccessResponse } from 'types/api/index';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryRangeResponseV5, TimeSeriesData } from 'types/api/v5/queryRange';
import { QueryData } from 'types/api/widgets/getQuery';

type ConvertibleData = SuccessResponse<MetricRangePayloadProps> & {
	rawV5Response?: QueryRangeResponseV5;
};

// Applies the same ns→ms conversion to the raw V5 tree, so client-side export
// serializes the values the chart displays (not the original nanoseconds).
function convertRawV5ValuesToMs(
	response: QueryRangeResponseV5,
): QueryRangeResponseV5 {
	if (response.type !== 'time_series') {
		return response;
	}

	const results = (response.data.results as TimeSeriesData[]).map((result) => ({
		...result,
		aggregations: (result.aggregations ?? []).map((bucket) => ({
			...bucket,
			series: (bucket.series ?? []).map((series) => ({
				...series,
				values: (series.values ?? []).map((value) => ({
					...value,
					value: value.value / 1000000,
				})),
			})),
		})),
	}));

	return { ...response, data: { ...response.data, results } };
}

export const convertDataValueToMs = (
	data?: ConvertibleData,
): ConvertibleData | undefined => {
	const convertedData = data;

	const convertedResult: QueryData[] = data?.payload?.data?.result
		? data.payload.data.result.map((item) => {
				const values: [number, string][] = item.values.map((value) => {
					const [first = 0, second = ''] = value || [];
					return [first, String(Number(second) / 1000000)];
				});

				return { ...item, values };
			})
		: [];

	if (convertedData?.payload?.data?.result && convertedResult) {
		convertedData.payload.data.result = convertedResult;
	}

	if (convertedData?.rawV5Response) {
		convertedData.rawV5Response = convertRawV5ValuesToMs(
			convertedData.rawV5Response,
		);
	}

	return convertedData;
};
