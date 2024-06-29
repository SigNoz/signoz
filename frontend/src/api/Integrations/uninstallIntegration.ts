import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	UninstallIntegrationProps,
	UninstallIntegrationSuccessResponse,
} from 'types/api/integrations/types';

const unInstallIntegration = async (
	props: UninstallIntegrationProps,
): Promise<
	SuccessResponse<UninstallIntegrationSuccessResponse> | ErrorResponse
> => {
	try {
		const response = await axios.post('/integrations/uninstall', {
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

export default unInstallIntegration;
