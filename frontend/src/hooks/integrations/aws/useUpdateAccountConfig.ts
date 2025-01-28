import { updateAccountConfig } from 'api/integrations/aws';
import { useMutation, UseMutationResult } from 'react-query';
import {
	AccountConfigPayload,
	AccountConfigResponse,
} from 'types/api/integrations/aws';

interface UpdateConfigVariables {
	accountId: string;
	payload: AccountConfigPayload;
}

export function useUpdateAccountConfig(): UseMutationResult<
	AccountConfigResponse,
	Error,
	UpdateConfigVariables
> {
	return useMutation<AccountConfigResponse, Error, UpdateConfigVariables>({
		mutationFn: ({ accountId, payload }) =>
			updateAccountConfig(accountId, payload),
	});
}
