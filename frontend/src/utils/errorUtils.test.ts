import { AxiosError } from 'axios';

import { retryOn429 } from './errorUtils';

describe('retryOn429', () => {
	const make429 = (): AxiosError =>
		Object.assign(new AxiosError('Too Many Requests'), {
			response: { status: 429 },
		}) as AxiosError;

	it('returns true on first failure (failureCount=0) for 429', () => {
		expect(retryOn429(0, make429())).toBe(true);
	});

	it('returns true on second failure (failureCount=1) for 429', () => {
		expect(retryOn429(1, make429())).toBe(true);
	});

	it('returns false on third failure (failureCount=2) for 429 — max retries reached', () => {
		expect(retryOn429(2, make429())).toBe(false);
	});

	it('returns false for non-429 axios errors', () => {
		const err = Object.assign(new AxiosError('Server Error'), {
			response: { status: 500 },
		}) as AxiosError;
		expect(retryOn429(0, err)).toBe(false);
	});

	it('returns false for 401 axios errors', () => {
		const err = Object.assign(new AxiosError('Unauthorized'), {
			response: { status: 401 },
		}) as AxiosError;
		expect(retryOn429(0, err)).toBe(false);
	});

	it('returns false for non-axios errors', () => {
		expect(retryOn429(0, new Error('network error'))).toBe(false);
	});

	it('returns false for null/undefined errors', () => {
		expect(retryOn429(0, null)).toBe(false);
		expect(retryOn429(0, undefined)).toBe(false);
	});
});
