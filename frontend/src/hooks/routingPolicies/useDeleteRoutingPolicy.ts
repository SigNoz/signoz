import type { UseMutationResult } from 'react-query';
import { useMutation } from 'react-query';
import type { DeleteRoutingPolicyResponse } from 'api/routingPolicies/deleteRoutingPolicy';
import deleteRoutingPolicy from 'api/routingPolicies/deleteRoutingPolicy';
import type { ErrorResponseV2, SuccessResponseV2 } from 'types/api';

export function useDeleteRoutingPolicy(): UseMutationResult<
	SuccessResponseV2<DeleteRoutingPolicyResponse> | ErrorResponseV2,
	Error,
	string
> {
	return useMutation<
		SuccessResponseV2<DeleteRoutingPolicyResponse> | ErrorResponseV2,
		Error,
		string
	>({
		mutationFn: (policyId) => deleteRoutingPolicy(policyId),
	});
}
