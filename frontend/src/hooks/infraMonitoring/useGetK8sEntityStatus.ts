import {
	getK8sEntityStatus,
	K8sEntityStatusResponse,
} from 'api/infraMonitoring/getK8sEntityStatus';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sEntityStatus = (
	options?: UseQueryOptions<
		SuccessResponse<K8sEntityStatusResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sEntityStatusResponse> | ErrorResponse,
	Error
>;

export const useGetK8sEntityStatus: UseGetK8sEntityStatus = (
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

		return [REACT_QUERY_KEY.GET_K8S_ENTITY_STATUS];
	}, [options?.queryKey]);

	return useQuery<
		SuccessResponse<K8sEntityStatusResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sEntityStatus(signal, headers),
		...options,
		queryKey,
	});
};
