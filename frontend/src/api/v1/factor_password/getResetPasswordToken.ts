import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	GetResetPasswordToken,
	PayloadProps,
	Props,
} from 'types/api/user/getResetPasswordToken';

const getResetPasswordToken = async (
	props: Props,
): Promise<SuccessResponseV2<GetResetPasswordToken>> => {
	try {
		const response = await axios.get<PayloadProps>(
			`/getResetPasswordToken/${props.userId}`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getResetPasswordToken;
