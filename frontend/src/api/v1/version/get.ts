import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import type { AxiosError } from 'axios';
import type { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import type { Info } from 'types/api/v1/version/get';

const get = async (): Promise<SuccessResponseV2<Info>> => {
	try {
		const response = await axios.get<Info>(`/version`);

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default get;
