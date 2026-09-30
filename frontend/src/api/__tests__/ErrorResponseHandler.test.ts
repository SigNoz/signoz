import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, CanceledError } from 'axios';

describe('ErrorResponseHandler', () => {
	// axios aborts a request whose signal fired before it was sent without ever
	// creating one, so the error carries neither `response` nor `request`.
	it('treats a request cancelled before it was sent as a cancellation', () => {
		const consoleError = jest
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);

		expect(ErrorResponseHandler(new CanceledError() as AxiosError)).toEqual({
			statusCode: 500,
			payload: null,
			error: 'Something went wrong',
			message: null,
		});
		expect(consoleError).not.toHaveBeenCalled();

		consoleError.mockRestore();
	});
});
