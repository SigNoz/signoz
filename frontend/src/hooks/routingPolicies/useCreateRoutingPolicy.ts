import type { UseMutationResult } from 'react-query';
import { useMutation } from 'react-query';
import type {
	CreateRoutingPolicyBody,
	CreateRoutingPolicyResponse,
} from 'api/routingPolicies/createRoutingPolicy';
import createRoutingPolicy from 'api/routingPolicies/createRoutingPolicy';
import type { ErrorResponseV2, SuccessResponseV2 } from 'types/api';

interface UseCreateRoutingPolicyProps {
	payload: CreateRoutingPolicyBody;
}

export function useCreateRoutingPolicy(): UseMutationResult<
	SuccessResponseV2<CreateRoutingPolicyResponse> | ErrorResponseV2,
	Error,
	UseCreateRoutingPolicyProps
> {
	return useMutation<
		SuccessResponseV2<CreateRoutingPolicyResponse> | ErrorResponseV2,
		Error,
		UseCreateRoutingPolicyProps
	>({
		mutationFn: ({ payload }) => createRoutingPolicy(payload),
	});
}
