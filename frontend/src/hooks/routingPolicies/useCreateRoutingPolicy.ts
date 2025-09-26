import createRoutingPolicy, {
	CreateRoutingPolicyBody,
	CreateRoutingPolicyResponse,
} from 'api/routingPolicies/createRoutingPolicy';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

interface UseCreateRoutingPolicyProps {
	payload: CreateRoutingPolicyBody;
}

export function useCreateRoutingPolicy(): UseMutationResult<
	SuccessResponse<CreateRoutingPolicyResponse> | ErrorResponse,
	Error,
	UseCreateRoutingPolicyProps
> {
	return useMutation<
		SuccessResponse<CreateRoutingPolicyResponse> | ErrorResponse,
		Error,
		UseCreateRoutingPolicyProps
	>({
		mutationFn: ({ payload }) => createRoutingPolicy(payload),
	});
}
