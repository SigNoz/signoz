import APIError from 'types/api/error';

import { errorDetails } from '../utils';

function makeAPIError(
	message: string,
	code = 'SOME_CODE',
	errors: { message: string }[] = [],
): APIError {
	return new APIError({
		httpStatusCode: 500,
		error: { code, message, url: '', errors },
	});
}

describe('errorDetails', () => {
	describe('when passed an APIError', () => {
		it('returns the error message', () => {
			const error = makeAPIError('something went wrong');
			expect(errorDetails(error)).toBe('something went wrong');
		});

		it('appends details when errors array is non-empty', () => {
			const error = makeAPIError('query failed', 'QUERY_ERROR', [
				{ message: 'field X is invalid' },
				{ message: 'field Y is missing' },
			]);
			const result = errorDetails(error);
			expect(result).toContain('query failed');
			expect(result).toContain('field X is invalid');
			expect(result).toContain('field Y is missing');
		});

		it('does not append details when errors array is empty', () => {
			const error = makeAPIError('simple error', 'CODE', []);
			const result = errorDetails(error);
			expect(result).toBe('simple error');
			expect(result).not.toContain('Details');
		});
	});

	describe('when passed a plain Error (not an APIError)', () => {
		it('does not throw', () => {
			const error = new Error('timeout exceeded');
			expect(() => errorDetails(error)).not.toThrow();
		});

		it('returns the plain error message', () => {
			const error = new Error('timeout exceeded');
			expect(errorDetails(error)).toBe('timeout exceeded');
		});

		it('returns fallback when plain Error has no message', () => {
			const error = new Error('');
			expect(errorDetails(error)).toBe('Unknown error occurred');
		});
	});

	describe('fallback behaviour', () => {
		it('returns "Unknown error occurred" when message is undefined', () => {
			const error = makeAPIError('');
			expect(errorDetails(error)).toBe('Unknown error occurred');
		});
	});
});
