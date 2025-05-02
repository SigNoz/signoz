import {
	getK8sJobsList,
	K8sJobsListPayload,
	K8sJobsListResponse,
} from 'api/infraMonitoring/getK8sJobsList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sJobsList = (
	requestData: K8sJobsListPayload,

	options?: UseQueryOptions<
		SuccessResponse<K8sJobsListResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sJobsListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sJobsList: UseGetK8sJobsList = (
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

		return [REACT_QUERY_KEY.GET_JOB_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<K8sJobsListResponse> | ErrorResponse, Error>({
		queryFn: ({ signal }) => getK8sJobsList(requestData, signal, headers),

		...options,

		queryKey,
	});
};
