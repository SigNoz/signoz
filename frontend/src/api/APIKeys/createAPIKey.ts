import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { APIKeyProps, CreateAPIKeyProps } from 'types/api/pat/types';

const createAPIKey = async (
	props: CreateAPIKeyProps,
): Promise<SuccessResponse<APIKeyProps> | ErrorResponse> => {
	try {
		const response = await axios.post('/pats', {
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

export default createAPIKey;
