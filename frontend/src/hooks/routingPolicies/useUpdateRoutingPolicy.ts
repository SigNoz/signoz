import updateRoutingPolicy, {
	UpdateRoutingPolicyBody,
	UpdateRoutingPolicyResponse,
} from 'api/routingPolicies/updateRoutingPolicy';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

interface UseUpdateRoutingPolicyProps {
	id: string;
	payload: UpdateRoutingPolicyBody;
}

export function useUpdateRoutingPolicy(): UseMutationResult<
	SuccessResponse<UpdateRoutingPolicyResponse> | ErrorResponse,
	Error,
	UseUpdateRoutingPolicyProps
> {
	return useMutation<
		SuccessResponse<UpdateRoutingPolicyResponse> | ErrorResponse,
		Error,
		UseUpdateRoutingPolicyProps
	>({
		mutationFn: ({ id, payload }) => updateRoutingPolicy(id, payload),
	});
}
