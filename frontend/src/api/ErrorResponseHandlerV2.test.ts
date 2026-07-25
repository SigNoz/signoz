import { AxiosError } from 'axios';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';

import { ErrorResponseHandlerV2 } from './ErrorResponseHandlerV2';

function makeAxiosError(
	overrides: Partial<AxiosError<ErrorV2Resp>>,
): AxiosError<ErrorV2Resp> {
	return {
		isAxiosError: true,
		name: 'AxiosError',
		message: 'Request failed',
		config: {} as any,
		toJSON: () => ({}),
		...overrides,
	} as AxiosError<ErrorV2Resp>;
}

describe('ErrorResponseHandlerV2', () => {
	describe('when the server responds with a well-formed error body', () => {
		it('throws an APIError with fields from response.data.error', () => {
			const error = makeAxiosError({
				response: {
					status: 403,
					data: {
						error: {
							code: 'FORBIDDEN',
							message: 'only editors/admins can access this resource',
							url: '/api/v1/dashboards/123',
							errors: [],
						},
					},
					headers: {} as any,
					config: {} as any,
					statusText: 'Forbidden',
				},
			});

			expect(() => ErrorResponseHandlerV2(error)).toThrow(APIError);
			try {
				ErrorResponseHandlerV2(error);
			} catch (e) {
				expect(e).toBeInstanceOf(APIError);
				const apiError = e as APIError;
				expect(apiError.getHttpStatusCode()).toBe(403);
				expect(apiError.getErrorMessage()).toBe(
					'only editors/admins can access this resource',
				);
				expect(apiError.getErrorCode()).toBe('FORBIDDEN');
			}
		});
	});

	describe('when the server responds with a null error body', () => {
		it('throws an APIError without crashing, using fallback values', () => {
			const error = makeAxiosError({
				name: 'AxiosError',
				message: 'timeout exceeded',
				response: {
					status: 504,
					data: (null as unknown) as ErrorV2Resp,
					headers: {} as any,
					config: {} as any,
					statusText: 'Gateway Timeout',
				},
			});

			expect(() => ErrorResponseHandlerV2(error)).toThrow(APIError);
			try {
				ErrorResponseHandlerV2(error);
			} catch (e) {
				expect(e).toBeInstanceOf(APIError);
				const apiError = e as APIError;
				expect(apiError.getHttpStatusCode()).toBe(504);
				expect(apiError.getErrorMessage()).toBe('timeout exceeded');
			}
		});

		it('throws an APIError when response.data.error is missing', () => {
			const error = makeAxiosError({
				name: 'AxiosError',
				message: 'Bad Gateway',
				response: {
					status: 502,
					data: {} as ErrorV2Resp,
					headers: {} as any,
					config: {} as any,
					statusText: 'Bad Gateway',
				},
			});

			expect(() => ErrorResponseHandlerV2(error)).toThrow(APIError);
			try {
				ErrorResponseHandlerV2(error);
			} catch (e) {
				expect(e).toBeInstanceOf(APIError);
				const apiError = e as APIError;
				expect(apiError.getHttpStatusCode()).toBe(502);
			}
		});
	});

	describe('when no response is received (network/timeout)', () => {
		it('throws an APIError using error.message', () => {
			const error = makeAxiosError({
				request: {},
				name: 'ECONNABORTED',
				message: 'timeout exceeded',
				status: undefined,
			});

			expect(() => ErrorResponseHandlerV2(error)).toThrow(APIError);
			try {
				ErrorResponseHandlerV2(error);
			} catch (e) {
				expect(e).toBeInstanceOf(APIError);
				const apiError = e as APIError;
				expect(apiError.getErrorMessage()).toBe('timeout exceeded');
			}
		});
	});

	describe('when the error is a setup error (no request or response)', () => {
		it('throws an APIError using error.name and error.message', () => {
			const error = makeAxiosError({
				name: 'Error',
				message: 'Something went wrong setting up the request',
			});

			expect(() => ErrorResponseHandlerV2(error)).toThrow(APIError);
			try {
				ErrorResponseHandlerV2(error);
			} catch (e) {
				expect(e).toBeInstanceOf(APIError);
				const apiError = e as APIError;
				expect(apiError.getErrorMessage()).toBe(
					'Something went wrong setting up the request',
				);
			}
		});
	});
});
