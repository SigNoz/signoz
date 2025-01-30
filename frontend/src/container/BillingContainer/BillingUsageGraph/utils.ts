import { UsageResponsePayloadProps } from 'api/billing/getUsage';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { isEmpty, isNull } from 'lodash-es';
import { unparse } from 'papaparse';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import generateCsvData, { QuantityData } from './generateCsvData';

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

export function quantityDataArr(data: any, timestampArray: number[]): any[] {
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
	return transformedResultArr;
}

export function fillMissingValuesForQuantities(
	data: any,
	timestampArray: number[],
): MetricRangePayloadProps {
	const transformedResultArr = quantityDataArr(data, timestampArray);

	return {
		data: {
			newResult: { data: { result: transformedResultArr, resultType: '' } },
			result: transformedResultArr,
			resultType: '',
		},
	};
}

const formatDate = (timestamp: number): string =>
	dayjs.unix(timestamp).format(DATE_TIME_FORMATS.US_DATE);

export function csvFileName(csvData: QuantityData[]): string {
	if (!csvData.length) {
		return `billing-usage.csv`;
	}

	const { values } = csvData[0];

	const timestamps = values.map((item) => item[0]);
	const startDate = formatDate(Math.min(...timestamps));
	const endDate = formatDate(Math.max(...timestamps));

	return `billing_usage_(${startDate}-${endDate}).csv`;
}

export function prepareCsvData(
	data: Partial<UsageResponsePayloadProps>,
): {
	csvData: string;
	fileName: string;
} {
	const graphCompatibleData = convertDataToMetricRangePayload(data);
	const chartData = getUPlotChartData(graphCompatibleData);
	const quantityMapArr = quantityDataArr(graphCompatibleData, chartData[0]);

	return {
		csvData: unparse(generateCsvData(quantityMapArr)),
		fileName: csvFileName(quantityMapArr),
	};
}
