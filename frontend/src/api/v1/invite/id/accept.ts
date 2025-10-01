import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/user/accept';
import { UserResponse } from 'types/api/user/getUser';

const accept = async (
	props: Props,
): Promise<SuccessResponseV2<UserResponse>> => {
	try {
		const response = await axios.post<PayloadProps>(`/invite/accept`, props);
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default accept;
