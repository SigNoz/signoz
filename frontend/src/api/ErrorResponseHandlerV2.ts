import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

function isErrorV2Resp(data: unknown): data is ErrorV2Resp {
	return (
		typeof data === 'object' &&
		data !== null &&
		'error' in data &&
		typeof (data as ErrorV2Resp).error?.code === 'string'
	);
}

// reference - https://axios-http.com/docs/handling_errors
export function ErrorResponseHandlerV2(error: AxiosError<ErrorV2Resp>): never {
	const { response, request } = error;
	// The request was made and the server responded with a status code
	// that falls out of the range of 2xx
	if (response) {
		// response.data isn't guaranteed to be a V2 envelope (e.g. a gateway 5xx
		// with an HTML/empty body during a deploy), so verify the shape first.
		const data: unknown = response.data;
		if (isErrorV2Resp(data)) {
			const { code, message, url, errors } = data.error;
			throw new APIError({
				httpStatusCode: response.status || 500,
				error: { code, message, url, errors },
			});
		}
		throw new APIError({
			httpStatusCode: response.status || 500,
			error: {
				code: 'UPSTREAM_UNAVAILABLE',
				message: error.message || 'Something went wrong',
				url: '',
				errors: [],
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
