import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props, UserLoginResponse } from 'types/api/user/login';

const login = async (
	props: Props,
): Promise<SuccessResponseV2<UserLoginResponse>> => {
	try {
		const response = await axios.post<PayloadProps>(`/login`, {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default login;
