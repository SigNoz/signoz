import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import type { AxiosError } from 'axios';
import type { ErrorResponse, SuccessResponse } from 'types/api';
import type {
	InstalledIntegrationsSuccessResponse,
	InstallIntegrationKeyProps,
} from 'types/api/integrations/types';

const installIntegration = async (
	props: InstallIntegrationKeyProps,
): Promise<
	SuccessResponse<InstalledIntegrationsSuccessResponse> | ErrorResponse
> => {
	try {
		const response = await axios.post('/integrations/install', {
			...props,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default installIntegration;
