import { ApiBaseInstance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { EventSuccessPayloadProps } from 'types/api/events/types';

const logEvent = async (
	eventName: string,
	attributes: Record<string, unknown>,
): Promise<SuccessResponse<EventSuccessPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post('/event', {
			eventName,
			attributes,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		console.error(error);
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default logEvent;
