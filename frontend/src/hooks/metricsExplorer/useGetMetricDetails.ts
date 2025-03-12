import {
	getMetricDetails,
	MetricDetailsResponse,
} from 'api/metricsExplorer/getMetricDetails';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetMetricDetails = (
	metricName: string,
	options?: UseQueryOptions<
		SuccessResponse<MetricDetailsResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<MetricDetailsResponse> | ErrorResponse,
	Error
>;

export const useGetMetricDetails: UseGetMetricDetails = (
	metricName,
	options,
	headers,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}

		if (options?.queryKey && typeof options.queryKey === 'string') {
			return options.queryKey;
		}

		return [REACT_QUERY_KEY.GET_METRIC_DETAILS, metricName];
	}, [options?.queryKey, metricName]);

	return useQuery<SuccessResponse<MetricDetailsResponse> | ErrorResponse, Error>(
		{
			queryFn: ({ signal }) => getMetricDetails(metricName, signal, headers),
			...options,
			queryKey,
		},
	);
};
