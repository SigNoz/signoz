/* eslint-disable sonarjs/no-identical-functions */
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
			item.series.forEach((series) => {
				const values: QueryData['values'] = series.values.reduce<
					QueryData['values']
				>((acc, currentInfo) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName} - Actual`,
				};

				oldResult.push(result);
			});
		}

		if (item.predictedSeries) {
			item.predictedSeries.forEach((series) => {
				const values: QueryData['values'] = series.values.reduce<
					QueryData['values']
				>((acc, currentInfo) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName} - Predicted`,
				};

				oldResult.push(result);
			});

			item.series?.push(item.predictedSeries[0]);
		}

		if (item.lowerBoundSeries) {
			item.lowerBoundSeries.forEach((series) => {
				const values: QueryData['values'] = series.values.reduce<
					QueryData['values']
				>((acc, currentInfo) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName} - Lower Bound`,
				};

				oldResult.push(result);
			});

			item.series?.push(item.lowerBoundSeries[0]);
		}

		if (item.upperBoundSeries) {
			item.upperBoundSeries.forEach((series) => {
				const values: QueryData['values'] = series.values.reduce<
					QueryData['values']
				>((acc, currentInfo) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName} - Upper Bound`,
				};

				oldResult.push(result);
			});

			item.series?.push(item.upperBoundSeries[0]);
		}
	});

	const oldResultType = resultType;

	// TODO: fix it later for using only v3 version of api

	return {
		data: { result: oldResult, resultType: oldResultType, newResult: newData },
	};
};
