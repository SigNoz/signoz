import updateRoutingPolicy, {
	UpdateRoutingPolicyBody,
	UpdateRoutingPolicyResponse,
} from 'api/routingPolicies/updateRoutingPolicy';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

interface UseUpdateMetricMetadataProps {
	id: string;
	payload: UpdateRoutingPolicyBody;
}

export function useUpdateRoutingPolicy(): UseMutationResult<
	SuccessResponse<UpdateRoutingPolicyResponse> | ErrorResponse,
	Error,
	UseUpdateMetricMetadataProps
> {
	return useMutation<
		SuccessResponse<UpdateRoutingPolicyResponse> | ErrorResponse,
		Error,
		UseUpdateMetricMetadataProps
	>({
		mutationFn: ({ id, payload }) => updateRoutingPolicy(id, payload),
	});
}
