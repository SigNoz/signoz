import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	LoginPrecheckResponse,
	PayloadProps,
	Props,
} from 'types/api/login/loginPrecheck';

const precheck = async (
	props: Props,
): Promise<SuccessResponseV2<LoginPrecheckResponse>> => {
	try {
		const response = await axios.get<PayloadProps>(
			`/loginPrecheck?email=${encodeURIComponent(
				props.email,
			)}&ref=${encodeURIComponent(window.location.href)}`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default precheck;
