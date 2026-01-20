import deleteRoutingPolicy, {
	DeleteRoutingPolicyResponse,
} from 'api/routingPolicies/deleteRoutingPolicy';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponseV2, SuccessResponseV2 } from 'types/api';

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
