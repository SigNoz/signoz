import {
	MetricRangePayloadProps,
	MetricRangePayloadV3,
} from 'types/api/metrics/getQueryRange';
import { QueryData, SeriesItem } from 'types/api/widgets/getQuery';

export const convertNewDataToOld = (
	newData: MetricRangePayloadV3,
): MetricRangePayloadProps => {
	const { result, resultType } = newData.data;
	const oldResult: MetricRangePayloadProps['data']['result'] = result.map(
		(item) => {
			console.log({ item });
			let metric: SeriesItem['labels'] = {};
			let values: QueryData['values'] = [];
			if (item.series) {
				metric = item.series.reduce<SeriesItem['labels']>(
					(acc, item) => ({
						...acc,
						...item.labels,
					}),
					{},
				);
				values = item.series.reduce<QueryData['values']>((acc, item) => {
					const renderValues: [number, string][] = item.values.map((currentStep) => [
						currentStep.timestamp,
						currentStep.value,
					]);

					return [...acc, ...renderValues];
				}, []);
			}

			return { queryName: item.queryName, legend: item.legend, metric, values };
		},
	);
	const oldResultType = resultType;

	return { data: { result: oldResult, resultType: oldResultType } };
};
