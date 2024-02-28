import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

type UseGetQueryRange = (
	requestData: GetQueryResultsProps,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
) => UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>;

export const useGetQueryRange: UseGetQueryRange = (requestData, options) => {
	const { selectedDashboard } = useDashboard();

	const version = selectedDashboard?.data?.version || 'v3';
	const newRequestData: GetQueryResultsProps = useMemo(
		() => ({
			...requestData,
			graphType:
				requestData.graphType === PANEL_TYPES.BAR
					? PANEL_TYPES.TIME_SERIES
					: requestData.graphType,
		}),
		[requestData],
	);

	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}

		if (options?.queryKey && typeof options.queryKey === 'string') {
			return options.queryKey;
		}

		return [REACT_QUERY_KEY.GET_QUERY_RANGE, newRequestData];
	}, [options?.queryKey, newRequestData]);

	return useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryFn: async ({ signal }) =>
			GetMetricQueryRange(requestData, version, signal),
		...options,
		queryKey,
	});
};
