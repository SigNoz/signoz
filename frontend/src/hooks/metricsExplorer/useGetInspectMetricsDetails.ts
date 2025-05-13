import {
	getInspectMetricsDetails,
	InspectMetricsRequest,
	InspectMetricsResponse,
} from 'api/metricsExplorer/getInspectMetricsDetails';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetInspectMetricsDetails = (
	requestData: InspectMetricsRequest,
	options?: UseQueryOptions<
		SuccessResponse<InspectMetricsResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<InspectMetricsResponse> | ErrorResponse,
	Error
>;

export const useGetInspectMetricsDetails: UseGetInspectMetricsDetails = (
	requestData,
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

		return [
			REACT_QUERY_KEY.GET_INSPECT_METRICS_DETAILS,
			requestData.metricName,
			requestData.start,
			requestData.end,
			requestData.filters,
		];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<InspectMetricsResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) =>
			getInspectMetricsDetails(requestData, signal, headers),
		...options,
		queryKey,
	});
};
