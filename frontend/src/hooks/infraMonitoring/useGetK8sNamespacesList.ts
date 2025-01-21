import {
	getK8sNamespacesList,
	K8sNamespacesListPayload,
	K8sNamespacesListResponse,
} from 'api/infraMonitoring/getK8sNamespacesList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sNamespacesList = (
	requestData: K8sNamespacesListPayload,
	options?: UseQueryOptions<
		SuccessResponse<K8sNamespacesListResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sNamespacesListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sNamespacesList: UseGetK8sNamespacesList = (
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

		return [REACT_QUERY_KEY.GET_NAMESPACE_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sNamespacesListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sNamespacesList(requestData, signal, headers),
		...options,
		queryKey,
	});
};
