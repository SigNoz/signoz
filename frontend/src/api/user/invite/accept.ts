import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	LoginPrecheckResponse,
	PayloadProps,
} from 'types/api/login/loginPrecheck';
import { Props } from 'types/api/user/invite/acceptInvite';

const acceptInvite = async (
	props: Props,
): Promise<SuccessResponseV2<LoginPrecheckResponse>> => {
	try {
		const response = await axios.post<PayloadProps>(`/invite/accept`, props);
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default acceptInvite;
