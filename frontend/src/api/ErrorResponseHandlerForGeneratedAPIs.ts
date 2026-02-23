import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import APIError from 'types/api/error';

// Handles errors from generated API hooks (which use RenderErrorResponseDTO)
export function ErrorResponseHandlerForGeneratedAPIs(
	error: AxiosError<RenderErrorResponseDTO>,
): never {
	const { response, request } = error;
	// The request was made and the server responded with a status code
	// that falls out of the range of 2xx
	if (response) {
		throw new APIError({
			httpStatusCode: response.status || 500,
			error: {
				code: response.data.error.code,
				message: response.data.error.message,
				url: response.data.error.url ?? '',
				errors: (response.data.error.errors ?? []).map((e) => ({
					message: e.message ?? '',
				})),
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
