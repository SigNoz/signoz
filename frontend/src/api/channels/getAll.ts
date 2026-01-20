import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { Channels, PayloadProps } from 'types/api/channels/getAll';

const getAll = async (): Promise<SuccessResponseV2<Channels[]>> => {
	try {
		const response = await axios.get<PayloadProps>('/channels');

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default getAll;
