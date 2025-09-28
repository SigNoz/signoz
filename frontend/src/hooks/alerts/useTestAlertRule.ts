import {
	CreateAlertRuleProps,
	CreateAlertRuleResponse,
} from 'api/alerts/createAlertRule';
import testAlertRule from 'api/alerts/testAlertRule';
import { useMutation, UseMutationResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

export function useTestAlertRule(): UseMutationResult<
	SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
	Error,
	CreateAlertRuleProps
> {
	return useMutation<
		SuccessResponse<CreateAlertRuleResponse> | ErrorResponse,
		Error,
		CreateAlertRuleProps
	>({
		mutationFn: (alertData) => testAlertRule(alertData),
	});
}
