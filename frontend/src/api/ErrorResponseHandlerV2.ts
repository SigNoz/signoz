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
		// The AxiosError type claims response.data is a V2 envelope, but that's an
		// unchecked assumption about untrusted network data — e.g. during a
		// deployment the gateway (nginx/LB) returns a 5xx with an HTML or empty
		// body. Launder it back to `unknown` and verify the shape before reading
		// it; otherwise synthesize an error from the status so the handler never
		// throws itself.
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
				code: String(response.status || 500),
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
