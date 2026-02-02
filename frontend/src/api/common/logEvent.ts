import { LogEventAxiosInstance as axios } from 'api';
import getLocalStorageApi from 'api/browser/localstorage/get';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { LOCALSTORAGE } from 'constants/localStorage';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { EventSuccessPayloadProps } from 'types/api/events/types';

const logEvent = async (
	eventName: string,
	attributes: Record<string, unknown>,
	eventType?: 'track' | 'group' | 'identify',
	rateLimited?: boolean,
): Promise<SuccessResponse<EventSuccessPayloadProps> | ErrorResponse> => {
	try {
		// add deployment_url and user_email to attributes
		const { hostname } = window.location;
		const userEmail = getLocalStorageApi(LOCALSTORAGE.LOGGED_IN_USER_EMAIL);
		const updatedAttributes = {
			...attributes,
			deployment_url: hostname,
			user_email: userEmail,
		};
		const response = await axios.post('/event', {
			eventName,
			attributes: updatedAttributes,
			eventType: eventType || 'track',
			rateLimited: rateLimited || false, // TODO: Update this once we have a proper way to handle rate limiting
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
