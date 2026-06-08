import { UsageResponsePayloadProps } from 'api/billing/getUsage';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';
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

	const payload = breakdown
		.map((info: any) => {
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
		})
		.filter((series: any) => series.values.length > 0);

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

export function prepareCsvData(data: Partial<UsageResponsePayloadProps>): {
	csvData: string;
	fileName: string;
} {
	const graphCompatibleData = convertDataToMetricRangePayload(data);
	const chartData = prepareChartData(graphCompatibleData);
	const quantityMapArr = quantityDataArr(
		graphCompatibleData,
		chartData[0] as number[],
	);

	return {
		csvData: unparse(generateCsvData(quantityMapArr)),
		fileName: csvFileName(quantityMapArr),
	};
}

export function calculateStartEndTime(
	data: Partial<UsageResponsePayloadProps>,
): { startTime: number | undefined; endTime: number | undefined } {
	const timestamps: number[] = [];
	data?.details?.breakdown?.forEach((breakdown) => {
		breakdown?.dayWiseBreakdown?.breakdown?.forEach((entry) => {
			timestamps.push(entry.timestamp);
		});
	});

	const billingTime: number[] = [
		data?.billingPeriodStart,
		data?.billingPeriodEnd,
	].filter((t): t is number => typeof t === 'number' && Number.isFinite(t));

	const allTimes = [...timestamps, ...billingTime];
	if (allTimes.length === 0) {
		return { startTime: undefined, endTime: undefined };
	}

	return {
		startTime: Math.min(...allTimes),
		endTime: Math.max(...allTimes),
	};
}
