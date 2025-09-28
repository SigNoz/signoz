import createAlertRule, {
	CreateAlertRuleProps,
} from 'api/alerts/createAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { ApiAlertRule } from 'types/api/alerts/alertsV2';

export function useCreateAlertRule(): UseMutationResult<
	SuccessResponse<ApiAlertRule> | ErrorResponse,
	Error,
	CreateAlertRuleProps
> {
	return useMutation<
		SuccessResponse<ApiAlertRule> | ErrorResponse,
		Error,
		CreateAlertRuleProps
	>({
		mutationFn: (alertData) => createAlertRule(alertData),
	});
}
