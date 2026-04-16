import { useMutation, UseMutationResult } from 'react-query';
import { testRule } from 'api/generated/services/rules';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export interface TestAlertRuleResponse {
	data: {
		alertCount: number;
		message: string;
	};
	status: string;
}

export function useTestAlertRule(): UseMutationResult<
	SuccessResponse<TestAlertRuleResponse> | ErrorResponse,
	Error,
	PostableAlertRuleV2
> {
	return useMutation({
		mutationFn: async (
			alertData: PostableAlertRuleV2,
		): Promise<SuccessResponse<TestAlertRuleResponse> | ErrorResponse> => {
			const response = await testRule(alertData as any);
			return {
				statusCode: 200,
				error: null,
				message: response.status,
				payload: (response as unknown) as TestAlertRuleResponse,
			};
		},
	});
}
