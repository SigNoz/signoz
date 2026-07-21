import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

function asAxiosError(partial: Partial<AxiosError>): AxiosError<ErrorV2Resp> {
	return partial as AxiosError<ErrorV2Resp>;
}

// ErrorResponseHandlerV2 always throws — capture the APIError so assertions stay
// unconditional.
function runHandler(error: AxiosError<ErrorV2Resp>): APIError {
	try {
		ErrorResponseHandlerV2(error);
	} catch (thrown) {
		return thrown as APIError;
	}
	throw new Error('expected ErrorResponseHandlerV2 to throw');
}

describe('ErrorResponseHandlerV2', () => {
	it('surfaces the V2 error envelope when the body is well-formed', () => {
		const apiError = runHandler(
			asAxiosError({
				message: 'Request failed with status code 400',
				response: {
					status: 400,
					data: {
						error: {
							code: 'bad_request',
							message: 'Invalid dashboard payload',
							url: 'https://signoz.io/docs',
							errors: [{ message: 'name is required' }],
						},
					},
				} as AxiosError['response'],
			}),
		);

		expect(apiError).toBeInstanceOf(APIError);
		expect(apiError.getHttpStatusCode()).toBe(400);
		expect(apiError.getErrorCode()).toBe('bad_request');
		expect(apiError.getErrorMessage()).toBe('Invalid dashboard payload');
	});

	// Regression: during a deployment the gateway returns a 5xx with a non-envelope
	// (HTML/empty) body. Reading response.data.error.code used to throw a TypeError
	// from inside the handler itself. See engineering-pod#5760.
	it('does not throw a TypeError when the 5xx body is not a V2 envelope', () => {
		const apiError = runHandler(
			asAxiosError({
				message: 'Request failed with status code 503',
				response: {
					status: 503,
					data: '<html><body>503 Service Temporarily Unavailable</body></html>',
				} as AxiosError['response'],
			}),
		);

		expect(apiError).toBeInstanceOf(APIError);
		expect(apiError.getHttpStatusCode()).toBe(503);
		expect(apiError.getErrorCode()).toBe('UPSTREAM_UNAVAILABLE');
		expect(apiError.getErrorMessage()).toBe(
			'Request failed with status code 503',
		);
	});

	it('handles a 5xx with an empty body', () => {
		const apiError = runHandler(
			asAxiosError({
				message: 'Request failed with status code 502',
				response: {
					status: 502,
					data: undefined,
				} as AxiosError['response'],
			}),
		);

		expect(apiError).toBeInstanceOf(APIError);
		expect(apiError.getHttpStatusCode()).toBe(502);
		expect(apiError.getErrorCode()).toBe('UPSTREAM_UNAVAILABLE');
	});

	it('falls back to error metadata when no response was received', () => {
		const apiError = runHandler(
			asAxiosError({
				message: 'Network Error',
				code: 'ERR_NETWORK',
				name: 'AxiosError',
				request: {},
			}),
		);

		expect(apiError).toBeInstanceOf(APIError);
		expect(apiError.getErrorCode()).toBe('ERR_NETWORK');
		expect(apiError.getErrorMessage()).toBe('Network Error');
	});
});
