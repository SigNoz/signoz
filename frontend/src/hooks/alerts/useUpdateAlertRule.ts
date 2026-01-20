import updateAlertRule, {
	UpdateAlertRuleResponse,
} from 'api/alerts/updateAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PostableAlertRuleV2 } from 'types/api/alerts/alertTypesV2';

export function useUpdateAlertRule(
	id: string,
): UseMutationResult<
	SuccessResponse<UpdateAlertRuleResponse> | ErrorResponse,
	Error,
	PostableAlertRuleV2
> {
	return useMutation<
		SuccessResponse<UpdateAlertRuleResponse> | ErrorResponse,
		Error,
		PostableAlertRuleV2
	>({
		mutationFn: (alertData) => updateAlertRule(id, alertData),
	});
}
