import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getOrganization';

const getOrganization = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const api = axios();

		const response = await api.get(`/org`);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getOrganization;
