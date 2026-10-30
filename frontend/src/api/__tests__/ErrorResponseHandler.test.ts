import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, CanceledError } from 'axios';

describe('ErrorResponseHandler', () => {
	// axios aborts a request whose signal fired before it was sent without ever
	// creating one, so the error carries neither `response` nor `request`.
	it('treats a request cancelled before it was sent as a cancellation', () => {
		const consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		expect(ErrorResponseHandler(new CanceledError() as AxiosError)).toStrictEqual(
			{
				statusCode: 500,
				payload: null,
				error: 'Something went wrong',
				message: null,
			},
		);
		expect(consoleError).not.toHaveBeenCalled();

		consoleError.mockRestore();
	});

	it('flattens a v2 error envelope on a 4xx to its message', () => {
		const error = new AxiosError('Request failed', '400', undefined, undefined, {
			status: 400,
			statusText: 'Bad Request',
			headers: {},
			config: {} as never,
			data: {
				status: 'error',
				error: { code: 'invalid_input', message: 'Syntax error: bad query' },
			},
		});

		expect(ErrorResponseHandler(error).error).toBe('Syntax error: bad query');
	});
});
