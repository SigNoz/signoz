import { AxiosError } from 'axios';
import { ErrorV2 } from 'types/api';
import APIError from 'types/api/error';

// reference - https://axios-http.com/docs/handling_errors
export function ErrorResponseHandlerV2(error: AxiosError<ErrorV2>): never {
	const { response, request } = error;
	// The request was made and the server responded with a status code
	// that falls out of the range of 2xx
	if (response) {
		throw new APIError({
			httpStatusCode: response.status || 500,
			error: {
				code: response.data.code,
				message: response.data.message,
				url: response.data.url,
				errors: response.data.errors,
			},
		});
	}
	// The request was made but no response was received
	// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
	// http.ClientRequest in node.js
	if (request) {
		throw new APIError({
			httpStatusCode: error.status || 500,
			error: {
				code: error.code || error.name,
				message: error.message,
				url: '',
				errors: [],
			},
		});
	}

	// Something happened in setting up the request that triggered an Error
	throw new APIError({
		httpStatusCode: error.status || 500,
		error: {
			code: error.name,
			message: error.message,
			url: '',
			errors: [],
		},
	});
}
