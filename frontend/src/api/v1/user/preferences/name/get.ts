import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/preferences/get';
import { UserPreference } from 'types/api/preferences/preference';

const get = async (
	props: Props,
): Promise<SuccessResponseV2<UserPreference>> => {
	try {
		const response = await axios.get<PayloadProps>(
			`/user/preferences/${props.name}`,
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default get;
