import {
	getMetricsListFilterKeys,
	MetricsListFilterKeysResponse,
} from 'api/metricsExplorer/getMetricsListFilterKeys';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetMetricsListFilterKeys = (
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
		queryFn: ({ signal }) => getMetricsListFilterKeys(signal, headers),
		...options,
		queryKey,
	});
};
