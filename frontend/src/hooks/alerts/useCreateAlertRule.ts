import createAlertRule, {
	CreateAlertRuleResponse,
} from 'api/alerts/createAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export function useCreateAlertRule(): UseMutationResult<
	SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
	Error,
	PostableAlertRuleV2
> {
	return useMutation<
		SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
		Error,
		PostableAlertRuleV2
	>({
		mutationFn: (alertData) => createAlertRule(alertData),
	});
}
