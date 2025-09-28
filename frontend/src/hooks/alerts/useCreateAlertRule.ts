import createAlertRule, {
	CreateAlertRuleProps,
	CreateAlertRuleResponse,
} from 'api/alerts/createAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

export function useCreateAlertRule(): UseMutationResult<
	SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
	Error,
	CreateAlertRuleProps
> {
	return useMutation<
		SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
		Error,
		CreateAlertRuleProps
	>({
		mutationFn: (alertData) => createAlertRule(alertData),
	});
}
