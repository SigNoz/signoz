import {
	getRelatedMetrics,
	RelatedMetricsPayload,
	RelatedMetricsResponse,
} from 'api/metricsExplorer/getRelatedMetrics';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetRelatedMetrics = (
	requestData: RelatedMetricsPayload,
	options?: UseQueryOptions<
		SuccessResponse<RelatedMetricsResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<RelatedMetricsResponse> | ErrorResponse,
	Error
>;

export const useGetRelatedMetrics: UseGetRelatedMetrics = (
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

		return [REACT_QUERY_KEY.GET_RELATED_METRICS, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<RelatedMetricsResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getRelatedMetrics(requestData, signal, headers),
		...options,
		queryKey,
	});
};
