import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';

import { getAuthZForbiddenMessage } from '../getAuthZForbiddenMessage';

const axiosError = (
	status: number,
	code: string,
): AxiosError<RenderErrorResponseDTO> =>
	({
		isAxiosError: true,
		response: {
			status,
			data: { status: 'error', error: { code, message: 'denied' } },
		},
	}) as AxiosError<RenderErrorResponseDTO>;

describe('getAuthZForbiddenMessage', () => {
	it('returns the message of a refused permission check', () => {
		expect(getAuthZForbiddenMessage(axiosError(403, 'authz_forbidden'))).toBe(
			'denied',
		);
	});

	it('ignores other 403s, other errors and no error', () => {
		expect(
			getAuthZForbiddenMessage(axiosError(403, 'forbidden')),
		).toBeUndefined();
		expect(
			getAuthZForbiddenMessage(axiosError(500, 'authz_forbidden')),
		).toBeUndefined();
		expect(getAuthZForbiddenMessage(null)).toBeUndefined();
	});
});
