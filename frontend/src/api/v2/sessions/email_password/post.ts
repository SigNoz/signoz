import { ApiV2Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, RawSuccessResponse, SuccessResponseV2 } from 'types/api';
import { Props, Token } from 'types/api/v2/sessions/email_password/post';

const post = async (props: Props): Promise<SuccessResponseV2<Token>> => {
	try {
		const response = await axios.post<RawSuccessResponse<Token>>(
			'/sessions/email_password',
			props,
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
