import {
	getK8sDaemonSetsList,
	K8sDaemonSetsListPayload,
	K8sDaemonSetsListResponse,
} from 'api/infraMonitoring/getK8sDaemonSetsList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sDaemonSetsList = (
	requestData: K8sDaemonSetsListPayload,

	options?: UseQueryOptions<
		SuccessResponse<K8sDaemonSetsListResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sDaemonSetsListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sDaemonSetsList: UseGetK8sDaemonSetsList = (
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

		return [REACT_QUERY_KEY.GET_DAEMONSET_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sDaemonSetsListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sDaemonSetsList(requestData, signal, headers),

		...options,

		queryKey,
	});
};
