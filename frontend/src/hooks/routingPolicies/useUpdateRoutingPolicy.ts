import type { UseMutationResult } from 'react-query';
import { useMutation } from 'react-query';
import type {
	UpdateRoutingPolicyBody,
	UpdateRoutingPolicyResponse,
} from 'api/routingPolicies/updateRoutingPolicy';
import updateRoutingPolicy from 'api/routingPolicies/updateRoutingPolicy';
import type { ErrorResponseV2, SuccessResponseV2 } from 'types/api';

interface UseUpdateRoutingPolicyProps {
	id: string;
	payload: UpdateRoutingPolicyBody;
}

export function useUpdateRoutingPolicy(): UseMutationResult<
	SuccessResponseV2<UpdateRoutingPolicyResponse> | ErrorResponseV2,
	Error,
	UseUpdateRoutingPolicyProps
> {
	return useMutation<
		SuccessResponseV2<UpdateRoutingPolicyResponse> | ErrorResponseV2,
		Error,
		UseUpdateRoutingPolicyProps
	>({
		mutationFn: ({ id, payload }) => updateRoutingPolicy(id, payload),
	});
}
