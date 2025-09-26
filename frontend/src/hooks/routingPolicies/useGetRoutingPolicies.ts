import {
	getRoutingPolicies,
	GetRoutingPoliciesResponse,
} from 'api/routingPolicies/getRoutingPolicies';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetRoutingPolicies = (
	options?: UseQueryOptions<
		SuccessResponse<GetRoutingPoliciesResponse> | ErrorResponse,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<GetRoutingPoliciesResponse> | ErrorResponse,
	Error
>;

export const useGetRoutingPolicies: UseGetRoutingPolicies = (
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
		return [REACT_QUERY_KEY.GET_ROUTING_POLICIES];
	}, [options?.queryKey]);

	return useQuery<
		SuccessResponse<GetRoutingPoliciesResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getRoutingPolicies(signal, headers),
		...options,
		queryKey,
	});
};
