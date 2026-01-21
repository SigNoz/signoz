import { ApiV2Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	CreatedIngestionKey,
	CreateIngestionKeyProps,
} from 'types/api/ingestionKeys/types';

const createIngestionKey = async (
	props: CreateIngestionKeyProps,
): Promise<SuccessResponse<CreatedIngestionKey> | ErrorResponse> => {
	try {
		const response = await ApiV2Instance.post('/gateway/ingestion_keys', {
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
