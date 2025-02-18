import {
	getK8sClustersList,
	K8sClustersListPayload,
	K8sClustersListResponse,
} from 'api/infraMonitoring/getK8sClustersList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sClustersList = (
	requestData: K8sClustersListPayload,

	options?: UseQueryOptions<
		SuccessResponse<K8sClustersListResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sClustersListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sClustersList: UseGetK8sClustersList = (
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

		return [REACT_QUERY_KEY.GET_CLUSTER_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sClustersListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sClustersList(requestData, signal, headers),

		...options,

		queryKey,
	});
};
