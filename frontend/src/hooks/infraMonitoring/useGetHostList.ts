import {
	getHostLists,
	HostListPayload,
	HostListResponse,
} from 'api/infraMonitoring/getHostLists';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetHostList = (
	requestData: HostListPayload,
	options?: UseQueryOptions<
		SuccessResponse<HostListResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<SuccessResponse<HostListResponse> | ErrorResponse, Error>;

export const useGetHostList: UseGetHostList = (
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

	return useQuery<SuccessResponse<HostListResponse> | ErrorResponse, Error>({
		queryFn: ({ signal }) => getHostLists(requestData, signal, headers),
		...options,
		queryKey,
	});
};
