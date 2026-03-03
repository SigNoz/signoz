import { useMutation, UseMutationResult } from 'react-query';
import { updateAccountConfig } from 'api/integration';
import {
	AccountConfigResponse,
	AWSAccountConfigPayload,
} from 'types/api/integrations/aws';
import { AzureAccountConfig } from 'types/api/integrations/types';

interface UpdateConfigVariables {
	cloudServiceId: string;
	accountId: string;
	payload: AWSAccountConfigPayload | AzureAccountConfig;
}

export function useUpdateAccountConfig(): UseMutationResult<
	AccountConfigResponse,
	Error,
	UpdateConfigVariables
> {
	return useMutation<AccountConfigResponse, Error, UpdateConfigVariables>({
		mutationFn: ({ cloudServiceId, accountId, payload }) =>
			updateAccountConfig(cloudServiceId, accountId, payload),
	});
}
