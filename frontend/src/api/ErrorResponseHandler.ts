import { AxiosError } from 'axios';
import { ErrorResponse } from 'types/api';
import { ErrorStatusCode } from 'types/common';

export const ErrorResponseHandler = (error: AxiosError): ErrorResponse => {
	if (error.response) {
		// client received an error response (5xx, 4xx)
		// making the error status code as standard Error Status Code
		const statusCode = error.response.status as ErrorStatusCode;

		if (statusCode >= 400 && statusCode < 500) {
			const { data } = error.response;

			if (statusCode === 404) {
				return {
					statusCode,
					payload: null,
					error: 'Not Found',
					message: null,
				};
			}

			return {
				statusCode,
				payload: null,
				error: data.error,
				message: null,
			};
		}

		return {
			statusCode,
			payload: null,
			error: 'Something went wrong',
			message: null,
		};
	}
	if (error.request) {
		// client never received a response, or request never left
		console.error('client never received a response, or request never left');

		return {
			statusCode: 500,
			payload: null,
			error: 'Something went wrong',
			message: null,
		};
	}
	// anything else
	console.error('any');
	return {
		statusCode: 500,
		payload: null,
		error: error.toString(),
		message: null,
	};
};
