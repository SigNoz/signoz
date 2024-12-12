import {
	getK8sContainersList,
	K8sContainersListPayload,
	K8sContainersListResponse,
} from 'api/infraMonitoring/getK8sContainersList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sContainersList = (
	requestData: K8sContainersListPayload,

	options?: UseQueryOptions<
		SuccessResponse<K8sContainersListResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sContainersListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sContainersList: UseGetK8sContainersList = (
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

		return [REACT_QUERY_KEY.GET_HOST_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sContainersListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sContainersList(requestData, signal, headers),

		...options,

		queryKey,
	});
};
