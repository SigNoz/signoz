import deleteRoutingPolicy, {
	DeleteRoutingPolicyResponse,
} from 'api/routingPolicies/deleteRoutingPolicy';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

export function useDeleteRoutingPolicy(): UseMutationResult<
	SuccessResponse<DeleteRoutingPolicyResponse> | ErrorResponse,
	Error,
	string
> {
	return useMutation<
		SuccessResponse<DeleteRoutingPolicyResponse> | ErrorResponse,
		Error,
		string
	>({
		mutationFn: (policyId) => deleteRoutingPolicy(policyId),
	});
}
