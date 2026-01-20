import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	APIKeyProps,
	CreateAPIKeyProps,
	CreatePayloadProps,
} from 'types/api/pat/types';

const create = async (
	props: CreateAPIKeyProps,
): Promise<SuccessResponseV2<APIKeyProps>> => {
	try {
		const response = await axios.post<CreatePayloadProps>('/pats', {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default create;
