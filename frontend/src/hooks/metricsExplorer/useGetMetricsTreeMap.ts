import {
	getMetricsTreeMap,
	MetricsTreeMapPayload,
	MetricsTreeMapResponse,
} from 'api/metricsExplorer/getMetricsTreeMap';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetMetricsTreeMap = (
	requestData: MetricsTreeMapPayload,

	options?: UseQueryOptions<
		SuccessResponse<MetricsTreeMapResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<MetricsTreeMapResponse> | ErrorResponse,
	Error
>;

export const useGetMetricsTreeMap: UseGetMetricsTreeMap = (
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

		return [REACT_QUERY_KEY.GET_METRICS_TREE_MAP, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<MetricsTreeMapResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getMetricsTreeMap(requestData, signal, headers),
		...options,
		queryKey,
	});
};
