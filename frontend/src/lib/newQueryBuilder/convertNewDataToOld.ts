import {
	MetricRangePayloadProps,
	MetricRangePayloadV3,
} from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

export const convertNewDataToOld = (
	newData: MetricRangePayloadV3,
): MetricRangePayloadProps => {
	const { result, resultType } = newData.data;
	const oldResult: MetricRangePayloadProps['data']['result'] = [];

	result.forEach((item) => {
		if (item.series) {
			item.series.forEach((serie) => {
				const values: QueryData['values'] = serie.values.reduce<
					QueryData['values']
				>((acc, currentInfo) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);
				const result: QueryData = {
					metric: serie.labels,
					values,
					queryName: item.queryName,
				};

				oldResult.push(result);
			});
		}
	});
	const oldResultType = resultType;

	// TODO: fix it later for using only v3 version of api

	return {
		data: { result: oldResult, resultType: oldResultType, newResult: newData },
	};
};
