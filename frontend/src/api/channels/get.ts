import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/get';
import { Channels } from 'types/api/channels/getAll';

const get = async (props: Props): Promise<SuccessResponseV2<Channels>> => {
	try {
		const response = await axios.get<PayloadProps>(`/channels/${props.id}`);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default get;
