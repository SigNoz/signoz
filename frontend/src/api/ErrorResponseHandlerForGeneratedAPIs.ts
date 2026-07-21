import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import APIError from 'types/api/error';

// The wire shape these handlers can actually rely on. The generated
// RenderErrorResponseDTO marks message/url/errors as required, but the server
// omits them even on valid errors (e.g. a 400 with just code + message), so a
// string `code` is the only field the guard can truly guarantee.
type ErrorEnvelope = {
	error: {
		code: string;
		message?: string;
		url?: string;
		errors?: { message?: string }[];
	};
};

function isErrorEnvelope(data: unknown): data is ErrorEnvelope {
	return (
		typeof data === 'object' &&
		data !== null &&
		'error' in data &&
		typeof (data as ErrorEnvelope).error?.code === 'string'
	);
}

// @deprecated Use convertToApiError instead
export function ErrorResponseHandlerForGeneratedAPIs(
	error: AxiosError<RenderErrorResponseDTO>,
): never {
	const { response, request } = error;
	// The request was made and the server responded with a status code
	// that falls out of the range of 2xx
	if (response) {
		// The body isn't guaranteed to be an error envelope — e.g. a gateway 5xx
		// with an HTML/empty body during a deploy. Verify the shape before reading
		// it; otherwise synthesize a consistent error from the status.
		const data: unknown = response.data;
		if (isErrorEnvelope(data)) {
			const { code, message, url, errors } = data.error;
			throw new APIError({
				httpStatusCode: response.status || 500,
				error: {
					code,
					message: message ?? '',
					url: url ?? '',
					errors: (errors ?? []).map((e) => ({ message: e.message ?? '' })),
				},
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

// convertToApiError converts an AxiosError from generated API
// hooks into an APIError.
export function convertToApiError(
	error: AxiosError<RenderErrorResponseDTO> | null,
): APIError | undefined {
	if (!error) {
		return undefined;
	}

	const response = error.response;
	const errorData = response?.data?.error;

	return new APIError({
		httpStatusCode: response?.status || error.status || 500,
		error: {
			code: errorData?.code || 'UPSTREAM_UNAVAILABLE',
			message:
				errorData?.message ||
				response?.statusText ||
				error.message ||
				'Something went wrong',
			url: errorData?.url ?? '',
			errors: (errorData?.errors ?? []).map((e) => ({
				message: e.message ?? '',
			})),
		},
	});
}
