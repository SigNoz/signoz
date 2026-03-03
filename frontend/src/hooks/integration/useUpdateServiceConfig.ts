import { useMutation, UseMutationResult } from 'react-query';
import { updateServiceConfig } from 'api/integration';
import { AzureServiceConfigPayload } from 'container/Integrations/types';

// }

interface UpdateConfigVariables {
	cloudServiceId: string;
	serviceId: string;
	payload: AzureServiceConfigPayload;
}

export function useUpdateServiceConfig(): UseMutationResult<
	AzureServiceConfigPayload,
	Error,
	UpdateConfigVariables
> {
	return useMutation<AzureServiceConfigPayload, Error, UpdateConfigVariables>({
		mutationFn: ({ cloudServiceId, serviceId, payload }) =>
			updateServiceConfig(cloudServiceId, serviceId, payload),
	});
}
