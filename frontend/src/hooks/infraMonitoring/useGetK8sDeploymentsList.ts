import {
	getK8sDeploymentsList,
	K8sDeploymentsListPayload,
	K8sDeploymentsListResponse,
} from 'api/infraMonitoring/getK8sDeploymentsList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sDeploymentsList = (
	requestData: K8sDeploymentsListPayload,
	options?: UseQueryOptions<
		SuccessResponse<K8sDeploymentsListResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sDeploymentsListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sDeploymentsList: UseGetK8sDeploymentsList = (
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

		return [REACT_QUERY_KEY.GET_DEPLOYMENT_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sDeploymentsListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sDeploymentsList(requestData, signal, headers),
		...options,
		queryKey,
	});
};
