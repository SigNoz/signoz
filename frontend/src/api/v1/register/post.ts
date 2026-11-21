import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import type { AxiosError } from 'axios';
import type {
	ErrorV2Resp,
	RawSuccessResponse,
	SuccessResponseV2,
} from 'types/api';
import type { Props } from 'types/api/user/signup';
import type { SignupResponse } from 'types/api/v1/register/post';

const post = async (
	props: Props,
): Promise<SuccessResponseV2<SignupResponse>> => {
	try {
		const response = await axios.post<RawSuccessResponse<SignupResponse>>(
			`/register`,
			{
				...props,
			},
		);
		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default post;
