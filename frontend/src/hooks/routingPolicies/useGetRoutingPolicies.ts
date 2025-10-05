import {
	getRoutingPolicies,
	GetRoutingPoliciesResponse,
} from 'api/routingPolicies/getRoutingPolicies';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponseV2, SuccessResponseV2 } from 'types/api';

type UseGetRoutingPolicies = (
	options?: UseQueryOptions<
		SuccessResponseV2<GetRoutingPoliciesResponse> | ErrorResponseV2,
		Error
	>,

	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponseV2<GetRoutingPoliciesResponse> | ErrorResponseV2,
	Error
>;

export const useGetRoutingPolicies: UseGetRoutingPolicies = (
	options,
	headers,
) => {
	const queryKey = useMemo(
		() => options?.queryKey || [REACT_QUERY_KEY.GET_ROUTING_POLICIES],
		[options?.queryKey],
	);

	return useQuery<
		SuccessResponseV2<GetRoutingPoliciesResponse> | ErrorResponseV2,
		Error
	>({
		queryFn: ({ signal }) => getRoutingPolicies(signal, headers),
		...options,
		queryKey,
	});
};
