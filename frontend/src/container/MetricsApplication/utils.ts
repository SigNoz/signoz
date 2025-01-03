import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

import { TopOperationList } from './TopOperationsTable';
import { NavigateToTraceProps } from './types';

export const getErrorRate = (list: TopOperationList): number => {
	if (list.errorCount === 0 && list.numCalls === 0) {
		return 0;
	}
	return (list.errorCount / list.numCalls) * 100;
};

export const navigateToTrace = ({
	servicename,
	operation,
	minTime,
	maxTime,
	selectedTraceTags,
	apmToTraceQuery,
	safeNavigate,
}: NavigateToTraceProps): void => {
	const urlParams = new URLSearchParams();
	urlParams.set(
		QueryParams.startTime,
		Math.floor(minTime / 1_000_000).toString(),
	);
	urlParams.set(QueryParams.endTime, Math.floor(maxTime / 1_000_000).toString());

	const JSONCompositeQuery = encodeURIComponent(JSON.stringify(apmToTraceQuery));

	const newTraceExplorerPath = `${
		ROUTES.TRACES_EXPLORER
	}?${urlParams.toString()}&selected={"serviceName":["${servicename}"],"operation":["${operation}"]}&filterToFetchData=["duration","status","serviceName","operation"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&${
		QueryParams.compositeQuery
	}=${JSONCompositeQuery}`;

	safeNavigate(newTraceExplorerPath);
};

export const getNearestHighestBucketValue = (
	value: number,
	buckets: number[],
): string => {
	// sort the buckets
	buckets.sort((a, b) => a - b);
	const nearestBucket = buckets.find((bucket) => bucket >= value);
	return nearestBucket?.toString() || '+Inf';
};

export const convertMilSecToNanoSec = (value: number): number =>
	value * 1000000000;

export const convertedTracesToDownloadData = (
	originalData: TopOperationList[],
): Record<string, string>[] =>
	originalData.map((item) => {
		const newObj: Record<string, string> = {
			Name: item.name,
			'P50 (in ms)': (item.p50 / 1000000).toFixed(2),
			'P95 (in ms)': (item.p95 / 1000000).toFixed(2),
			'P99 (in ms)': (item.p99 / 1000000).toFixed(2),
			'Number of calls': item.numCalls.toString(),
			'Error Rate (%)': getErrorRate(item).toFixed(2),
		};

		return newObj;
	});
