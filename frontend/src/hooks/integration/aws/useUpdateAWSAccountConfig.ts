import { useMutation, UseMutationResult } from 'react-query';
import { updateAccountConfig } from 'api/integration/aws';
import {
	AccountConfigResponse,
	AWSAccountConfigPayload,
} from 'types/api/integrations/aws';

interface UpdateAWSAccountConfigVariables {
	accountId: string;
	payload: AWSAccountConfigPayload;
}

export function useUpdateAWSAccountConfig(): UseMutationResult<
	AccountConfigResponse,
	Error,
	UpdateAWSAccountConfigVariables
> {
	return useMutation<
		AccountConfigResponse,
		Error,
		UpdateAWSAccountConfigVariables
	>({
		mutationFn: ({ accountId, payload }) =>
			updateAccountConfig(accountId, payload),
	});
}
