import {
	getMetricsListFilterKeys,
	GetMetricsListFilterKeysParams,
	MetricsListFilterKeysResponse,
} from 'api/metricsExplorer/getMetricsListFilterKeys';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetMetricsListFilterKeys = (
	params: GetMetricsListFilterKeysParams,
	options?: UseQueryOptions<
		SuccessResponse<MetricsListFilterKeysResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<MetricsListFilterKeysResponse> | ErrorResponse,
	Error
>;

export const useGetMetricsListFilterKeys: UseGetMetricsListFilterKeys = (
	params,
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

		return [REACT_QUERY_KEY.GET_METRICS_LIST_FILTER_KEYS];
	}, [options?.queryKey]);

	return useQuery<
		SuccessResponse<MetricsListFilterKeysResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getMetricsListFilterKeys(params, signal, headers),
		...options,
		queryKey,
	});
};
