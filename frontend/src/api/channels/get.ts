import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/channels/get';

const get = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(`/channels/${props.id}`);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default get;
