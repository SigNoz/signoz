import { updateServiceConfig } from 'api/integration/aws';
import { useMutation, UseMutationResult } from 'react-query';

interface UpdateServiceConfigPayload {
	cloud_account_id: string;
	config: {
		logs: {
			enabled: boolean;
		};
		metrics: {
			enabled: boolean;
		};
	};
}

interface UpdateConfigResponse {
	status: string;
	data: {
		id: string;
		config: {
			logs: {
				enabled: boolean;
			};
			metrics: {
				enabled: boolean;
			};
		};
	};
}

interface UpdateConfigVariables {
	serviceId: string;
	payload: UpdateServiceConfigPayload;
}

export function useUpdateServiceConfig(): UseMutationResult<
	UpdateConfigResponse,
	Error,
	UpdateConfigVariables
> {
	return useMutation<UpdateConfigResponse, Error, UpdateConfigVariables>({
		mutationFn: ({ serviceId, payload }) =>
			updateServiceConfig(serviceId, payload),
	});
}
