import {
	getK8sStatefulSetsList,
	K8sStatefulSetsListPayload,
	K8sStatefulSetsListResponse,
} from 'api/infraMonitoring/getsK8sStatefulSetsList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sStatefulSetsList = (
	requestData: K8sStatefulSetsListPayload,

	options?: UseQueryOptions<
		SuccessResponse<K8sStatefulSetsListResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sStatefulSetsListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sStatefulSetsList: UseGetK8sStatefulSetsList = (
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

		return [REACT_QUERY_KEY.GET_STATEFULSET_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sStatefulSetsListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sStatefulSetsList(requestData, signal, headers),

		...options,

		queryKey,
	});
};
