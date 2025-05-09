import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { LoginPrecheckResponse } from 'types/api/login/loginPrecheck';
import { Props } from 'types/api/login/signup';

const signup = async (
	props: Props,
): Promise<SuccessResponse<null | LoginPrecheckResponse> | ErrorResponse> => {
	try {
		const response = await axios.post(`/register`, {
			...props,
		});
		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data?.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default signup;
