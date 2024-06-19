import { GatewayApiV1Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreateIngestionKeyProps,
	IngestionKeyProps,
} from 'types/api/ingestionKeys/types';

const createIngestionKey = async (
	props: CreateIngestionKeyProps,
): Promise<SuccessResponse<IngestionKeyProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV1Instance.post('/workspaces/me/keys', {
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

export default createIngestionKey;
