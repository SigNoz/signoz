/* eslint-disable sonarjs/no-identical-functions */
import {
	MetricRangePayloadProps,
	MetricRangePayloadV3,
} from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

type RegularValue = { timestamp: number; value: string };

export const convertNewDataToOld = (
	newData: MetricRangePayloadV3,
): MetricRangePayloadProps => {
	const { result, resultType } = newData.data;
	const oldResult: MetricRangePayloadProps['data']['result'] = [];

	result.forEach((item) => {
		if (item.series) {
			item.series.forEach((series) => {
				// Cast to regular values array (this function only handles non-heatmap data)
				const regularValues = series.values as RegularValue[];
				const values: QueryData['values'] = regularValues.reduce<
					QueryData['values']
				>((acc, currentInfo: RegularValue) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName}`,
					metaData: series.metaData,
				};

				oldResult.push(result);
			});
		}

		if (item.predictedSeries) {
			item.predictedSeries.forEach((series) => {
				const regularValues = series.values as RegularValue[];
				const values: QueryData['values'] = regularValues.reduce<
					QueryData['values']
				>((acc, currentInfo: RegularValue) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName}`,
					metaData: series?.metaData,
				};

				oldResult.push(result);
			});
		}

		if (item.upperBoundSeries) {
			item.upperBoundSeries.forEach((series) => {
				const regularValues = series.values as RegularValue[];
				const values: QueryData['values'] = regularValues.reduce<
					QueryData['values']
				>((acc, currentInfo: RegularValue) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName}`,
					metaData: series?.metaData,
				};

				oldResult.push(result);
			});
		}

		if (item.lowerBoundSeries) {
			item.lowerBoundSeries.forEach((series) => {
				const regularValues = series.values as RegularValue[];
				const values: QueryData['values'] = regularValues.reduce<
					QueryData['values']
				>((acc, currentInfo: RegularValue) => {
					const renderValues: [number, string] = [
						currentInfo.timestamp / 1000,
						currentInfo.value,
					];

					return [...acc, renderValues];
				}, []);

				const result: QueryData = {
					metric: series.labels,
					values,
					queryName: `${item.queryName}`,
					metaData: series?.metaData,
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
