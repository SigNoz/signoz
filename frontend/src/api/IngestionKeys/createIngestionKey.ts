import { GatewayApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreatedIngestionKeyProps,
	CreateIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

const createIngestionKey = async (
	props: CreateIngestionKeyProps,
): Promise<SuccessResponse<CreatedIngestionKeyProps> | ErrorResponse> => {
	try {
		const response = await GatewayApiV2Instance.post('/ingestion_keys', {
			...props,
		});

		return {
			statusCode: 200,
			error: null,
			message: 'success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default createIngestionKey;
