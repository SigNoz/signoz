import APIError from 'types/api/error';

import { getAuthZForbiddenMessage } from '../getAuthZForbiddenMessage';

const apiError = (httpStatusCode: number, code: string): APIError =>
	new APIError({
		httpStatusCode,
		error: { code, message: 'denied', url: '', errors: [] },
	});

describe('getAuthZForbiddenMessage', () => {
	it('returns the message of a refused permission check', () => {
		expect(getAuthZForbiddenMessage(apiError(403, 'authz_forbidden'))).toBe(
			'denied',
		);
	});

	it('ignores other 403s and other errors', () => {
		expect(getAuthZForbiddenMessage(apiError(403, 'forbidden'))).toBeUndefined();
		expect(
			getAuthZForbiddenMessage(apiError(500, 'authz_forbidden')),
		).toBeUndefined();
		expect(getAuthZForbiddenMessage(undefined)).toBeUndefined();
	});
});
