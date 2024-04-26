import { isEmpty, isNull } from 'lodash-es';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

export const convertDataToMetricRangePayload = (
	data: any,
): MetricRangePayloadProps => {
	const emptyStateData = {
		data: {
			newResult: { data: { result: [], resultType: '' } },
			result: [],
			resultType: '',
		},
	};
	if (isEmpty(data)) {
		return emptyStateData;
	}
	const {
		details: { breakdown = [] },
	} = data || {};

	if (isNull(breakdown) || breakdown.length === 0) {
		return emptyStateData;
	}

	const payload = breakdown.map((info: any) => {
		const metric = info.type;
		const sortedBreakdownData = (info?.dayWiseBreakdown?.breakdown || []).sort(
			(a: any, b: any) => a.timestamp - b.timestamp,
		);
		const values = (sortedBreakdownData || []).map((categoryInfo: any) => [
			categoryInfo.timestamp,
			categoryInfo.total,
		]);
		const queryName = info.type;
		const legend = info.type;
		const { unit } = info;
		const quantity = sortedBreakdownData.map(
			(categoryInfo: any) => categoryInfo.quantity,
		);
		return { metric, values, queryName, legend, quantity, unit };
	});

	const sortedData = payload.sort((a: any, b: any) => {
		const sumA = a.values.reduce((acc: any, val: any) => acc + val[1], 0);
		const avgA = a.values.length ? sumA / a.values.length : 0;
		const sumB = b.values.reduce((acc: any, val: any) => acc + val[1], 0);
		const avgB = b.values.length ? sumB / b.values.length : 0;

		return sumA === sumB ? avgB - avgA : sumB - sumA;
	});

	return {
		data: {
			newResult: { data: { result: sortedData, resultType: '' } },
			result: sortedData,
			resultType: '',
		},
	};
};

export function fillMissingValuesForQuantities(
	data: any,
	timestampArray: number[],
): MetricRangePayloadProps {
	const { result } = data.data;

	const transformedResultArr: any[] = [];
	result.forEach((item: any) => {
		const timestampToQuantityMap: { [timestamp: number]: number } = {};
		item.values.forEach((val: number[], index: number) => {
			timestampToQuantityMap[val[0]] = item.quantity[index];
		});

		const quantityArray = timestampArray.map(
			(timestamp: number) => timestampToQuantityMap[timestamp] ?? null,
		);
		transformedResultArr.push({ ...item, quantity: quantityArray });
	});

	return {
		data: {
			newResult: { data: { result: transformedResultArr, resultType: '' } },
			result: transformedResultArr,
			resultType: '',
		},
	};
}
