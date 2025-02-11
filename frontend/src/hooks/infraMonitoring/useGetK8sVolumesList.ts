import {
	getK8sVolumesList,
	K8sVolumesListPayload,
	K8sVolumesListResponse,
} from 'api/infraMonitoring/getK8sVolumesList';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetK8sVolumesList = (
	requestData: K8sVolumesListPayload,
	options?: UseQueryOptions<
		SuccessResponse<K8sVolumesListResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<K8sVolumesListResponse> | ErrorResponse,
	Error
>;

export const useGetK8sVolumesList: UseGetK8sVolumesList = (
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

		return [REACT_QUERY_KEY.GET_VOLUME_LIST, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<K8sVolumesListResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getK8sVolumesList(requestData, signal, headers),
		...options,
		queryKey,
	});
};
