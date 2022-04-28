import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/dashboard/getAll';

const getAll = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const api = axios();

		const response = await api.get('/dashboards');

		return {
			statusCode: 200,
			error: null,
			message: response.data.message,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getAll;
