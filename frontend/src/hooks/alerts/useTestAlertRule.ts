import testAlertRule, { TestAlertRuleResponse } from 'api/alerts/testAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export function useTestAlertRule(): UseMutationResult<
	SuccessResponse<TestAlertRuleResponse> | ErrorResponse,
	Error,
	PostableAlertRuleV2
> {
	return useMutation<
		SuccessResponse<TestAlertRuleResponse> | ErrorResponse,
		Error,
		PostableAlertRuleV2
	>({
		mutationFn: (alertData) => testAlertRule(alertData),
	});
}
