import {
	getMetricsList,
	MetricsListPayload,
	MetricsListResponse,
} from 'api/metricsExplorer/getMetricsList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetMetricsList = (
	requestData: MetricsListPayload,

	options?: UseQueryOptions<
		SuccessResponse<MetricsListResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<MetricsListResponse> | ErrorResponse,
	Error
>;

export const useGetMetricsList: UseGetMetricsList = (
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

		return [REACT_QUERY_KEY.GET_METRICS_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<MetricsListResponse> | ErrorResponse, Error>({
		queryFn: ({ signal }) => getMetricsList(requestData, signal, headers),
		...options,
		queryKey,
	});
};
