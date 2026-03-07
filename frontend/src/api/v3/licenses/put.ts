import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps } from 'types/api/licenses/apply';

const apply = async (): Promise<SuccessResponseV2<PayloadProps>> => {
	try {
		const response = await axios.put<PayloadProps>('/licenses');

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default apply;
