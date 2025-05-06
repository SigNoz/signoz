import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorResponseV2, ErrorV2, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/user/login';

const login = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps> | ErrorResponseV2> => {
	try {
		const response = await axios.post<PayloadProps>(`/login`, {
			...props,
		});

		console.log(response, 'response');
		return {
			statusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		console.log(error, 'error');
		return ErrorResponseHandlerV2(error as AxiosError<ErrorV2>);
	}
};

export default login;
