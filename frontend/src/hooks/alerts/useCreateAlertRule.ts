import { useMutation, UseMutationResult } from 'react-query';
import { createRule } from 'api/generated/services/rules';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export interface CreateAlertRuleResponse {
	data: Record<string, unknown>;
	status: string;
}

export function useCreateAlertRule(): UseMutationResult<
	SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
	Error,
	PostableAlertRuleV2
> {
	return useMutation({
		mutationFn: async (
			alertData: PostableAlertRuleV2,
		): Promise<SuccessResponse<CreateAlertRuleResponse> | ErrorResponse> => {
			const response = await createRule(alertData as any);
			return {
				statusCode: 200,
				error: null,
				message: response.status,
				payload: (response as unknown) as CreateAlertRuleResponse,
			};
		},
	});
}
