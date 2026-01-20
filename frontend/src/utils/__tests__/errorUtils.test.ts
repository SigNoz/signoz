import { getHttpStatusCode, isRetryableError } from '../errorUtils';

// Mock APIError class
class MockAPIError {
	constructor(public httpStatusCode: number) {}

	getHttpStatusCode(): number {
		return this.httpStatusCode;
	}
}

describe('errorUtils', () => {
	describe('getHttpStatusCode', () => {
		it('should extract status code from APIError instance', () => {
			const error = new MockAPIError(401);
			expect(getHttpStatusCode(error)).toBe(401);
		});

		it('should extract status code from AxiosError response', () => {
			const error = {
				response: { status: 500 },
			};
			expect(getHttpStatusCode(error)).toBe(500);
		});

		it('should return undefined for error without status code', () => {
			const error = { message: 'Some error' };
			expect(getHttpStatusCode(error)).toBeUndefined();
		});
	});

	describe('isRetryableError', () => {
		it('should return false for 4xx client errors', () => {
			expect(isRetryableError(new MockAPIError(401))).toBe(false);
			expect(isRetryableError(new MockAPIError(404))).toBe(false);
			expect(isRetryableError(new MockAPIError(499))).toBe(false);
		});

		it('should return true for 5xx server errors', () => {
			expect(isRetryableError(new MockAPIError(500))).toBe(true);
			expect(isRetryableError(new MockAPIError(502))).toBe(true);
			expect(isRetryableError(new MockAPIError(503))).toBe(true);
		});

		it('should return true for errors without status code (default to retryable)', () => {
			const errorWithoutStatus = { message: 'Network error' };
			expect(isRetryableError(errorWithoutStatus)).toBe(true);
		});
	});
});
