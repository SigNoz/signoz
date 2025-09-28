import createRoutingPolicy, {
	CreateRoutingPolicyBody,
	CreateRoutingPolicyResponse,
} from 'api/routingPolicies/createRoutingPolicy';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponseV2, SuccessResponseV2 } from 'types/api';

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
