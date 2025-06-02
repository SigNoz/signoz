import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/licenses/apply';

const apply = async (
	props: Props,
): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.post<PayloadProps>('/licenses', {
			key: props.key,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default apply;
