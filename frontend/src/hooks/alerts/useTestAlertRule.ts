import { CreateAlertRuleProps } from 'api/alerts/createAlertRule';
import testAlertRule from 'api/alerts/testAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { ApiAlertRule } from 'types/api/alerts/alertsV2';

export function useTestAlertRule(): UseMutationResult<
	SuccessResponse<ApiAlertRule> | ErrorResponse,
	Error,
	CreateAlertRuleProps
> {
	return useMutation<
		SuccessResponse<ApiAlertRule> | ErrorResponse,
		Error,
		CreateAlertRuleProps
	>({
		mutationFn: (alertData) => testAlertRule(alertData),
	});
}
