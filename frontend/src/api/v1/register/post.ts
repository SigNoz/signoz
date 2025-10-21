import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import { Props } from 'types/api/user/signup';
import { SignupResponse } from 'types/api/v1/register/post';

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
