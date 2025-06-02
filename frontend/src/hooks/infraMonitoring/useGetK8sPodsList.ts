import {
	getK8sPodsList,
	K8sPodsListPayload,
	K8sPodsListResponse,
} from 'api/infraMonitoring/getK8sPodsList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sPodsList = (
	requestData: K8sPodsListPayload,
	options?: UseQueryOptions<
		SuccessResponse<K8sPodsListResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
	dotMetricsEnabled?: boolean,
) => UseQueryResult<
	SuccessResponse<K8sPodsListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sPodsList: UseGetK8sPodsList = (
	requestData,
	options,
	headers,
	dotMetricsEnabled,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}

		if (options?.queryKey && typeof options.queryKey === 'string') {
			return options.queryKey;
		}

		return [REACT_QUERY_KEY.GET_POD_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<K8sPodsListResponse> | ErrorResponse, Error>({
		queryFn: ({ signal }) =>
			getK8sPodsList(requestData, signal, headers, dotMetricsEnabled),
		...options,
		queryKey,
	});
};
