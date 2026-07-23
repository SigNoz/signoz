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

type ExpectedError = {
	httpStatusCode: number;
	code: string;
	message: string;
	errors: { message: string }[];
};

// One row per response shape the handler must normalize. New shapes (with
// different bodies) can be added here without a new test block.
const cases: {
	name: string;
	error: AxiosError<ErrorV2Resp>;
	expected: ExpectedError;
}[] = [
	{
		name: 'well-formed V2 error envelope',
		error: asAxiosError({
			message: 'Request failed with status code 400',
			response: {
				status: 400,
				data: {
					error: {
						code: 'bad_request',
						message: 'Invalid dashboard payload',
						url: 'https://signoz.io/docs',
						errors: [{ message: 'name is required' }, { message: 'name too long' }],
					},
				},
			} as AxiosError['response'],
		}),
		expected: {
			httpStatusCode: 400,
			code: 'bad_request',
			message: 'Invalid dashboard payload',
			errors: [{ message: 'name is required' }, { message: 'name too long' }],
		},
	},
	{
		// Regression: during a deployment the gateway returns a 5xx with a
		// non-envelope body. Reading response.data.error.code used to throw a
		// TypeError from inside the handler itself. See engineering-pod#5760.
		name: '5xx with a non-envelope HTML body',
		error: asAxiosError({
			message: 'Request failed with status code 503',
			response: {
				status: 503,
				data: '<html><body>503 Service Temporarily Unavailable</body></html>',
			} as AxiosError['response'],
		}),
		expected: {
			httpStatusCode: 503,
			code: 'UPSTREAM_UNAVAILABLE',
			message: 'Request failed with status code 503',
			errors: [],
		},
	},
	{
		name: '5xx with an empty body',
		error: asAxiosError({
			message: 'Request failed with status code 502',
			response: {
				status: 502,
				data: undefined,
			} as AxiosError['response'],
		}),
		expected: {
			httpStatusCode: 502,
			code: 'UPSTREAM_UNAVAILABLE',
			message: 'Request failed with status code 502',
			errors: [],
		},
	},
	{
		name: 'no response received (network error)',
		error: asAxiosError({
			message: 'Network Error',
			code: 'ERR_NETWORK',
			name: 'AxiosError',
			request: {},
		}),
		expected: {
			httpStatusCode: 500,
			code: 'ERR_NETWORK',
			message: 'Network Error',
			errors: [],
		},
	},
];

describe('ErrorResponseHandlerV2', () => {
	it.each(cases)(
		'normalizes $name into a consistent APIError',
		({ error, expected }) => {
			const apiError = runHandler(error);

			expect(apiError).toBeInstanceOf(APIError);
			expect(apiError.getHttpStatusCode()).toBe(expected.httpStatusCode);
			expect(apiError.getErrorCode()).toBe(expected.code);
			expect(apiError.getErrorMessage()).toBe(expected.message);
			// The sub-error messages feed several parts of the UI, so assert them.
			expect(apiError.getErrorDetails().error.errors).toStrictEqual(
				expected.errors,
			);
		},
	);
});
