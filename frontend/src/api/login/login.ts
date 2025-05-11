import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/user/login';

const login = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.post<PayloadProps>(`/login`, {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		// this line is never reached but ts isn't detecting the never type properly for the ErrorResponseHandlerV2
		throw error;
	}
};

export default login;
