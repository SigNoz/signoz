import {
	getK8sNodesList,
	K8sNodesListPayload,
	K8sNodesListResponse,
} from 'api/infraMonitoring/getK8sNodesList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sNodesList = (
	requestData: K8sNodesListPayload,
	options?: UseQueryOptions<
		SuccessResponse<K8sNodesListResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sNodesListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sNodesList: UseGetK8sNodesList = (
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

		return [REACT_QUERY_KEY.GET_NODE_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<K8sNodesListResponse> | ErrorResponse, Error>({
		queryFn: ({ signal }) => getK8sNodesList(requestData, signal, headers),
		...options,
		queryKey,
	});
};
