import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getPendingInvites';

const getPendingInvites = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const response = await axios.get(`/invite`);

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

export default getPendingInvites;
