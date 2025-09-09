import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Signup } from 'types/api/user/loginPrecheck';
import { Props } from 'types/api/user/signup';

const signup = async (props: Props): Promise<SuccessResponseV2<Signup>> => {
	try {
		const response = await axios.post<PayloadProps>(`/register`, {
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

export default signup;
