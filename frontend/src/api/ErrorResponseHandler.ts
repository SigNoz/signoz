import { AxiosError, AxiosResponse } from 'axios';
import { ErrorResponse } from 'types/api';
import { ErrorStatusCode } from 'types/common';

export function ErrorResponseHandler(error: AxiosError): ErrorResponse {
	const { response, request } = error;
	if (response) {
		// client received an error response (5xx, 4xx)
		// making the error status code as standard Error Status Code
		const statusCode = response.status as ErrorStatusCode;

		if (statusCode >= 400 && statusCode < 500) {
			const { data } = response as AxiosResponse;

			if (statusCode === 404) {
				return {
					statusCode,
					payload: null,
					error: data.errorType,
					message: null,
				};
			}

			const { errors, error } = data;

			const errorMessage =
				Array.isArray(errors) && errors.length >= 1 ? errors[0].msg : error;

			return {
				statusCode,
				payload: null,
				error: errorMessage,
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
	if (request) {
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
		error: String(error),
		message: null,
	};
}
