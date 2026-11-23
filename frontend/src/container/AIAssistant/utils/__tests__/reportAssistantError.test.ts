import * as Sentry from '@sentry/react';
import { AxiosError } from 'axios';
import { ErrorCodeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { reportAssistantError } from '../reportAssistantError';

jest.mock('@sentry/react', () => ({
	captureException: jest.fn(),
}));

const mockCaptureException = jest.mocked(Sentry.captureException);

function restError(status: number, code: string): AxiosError {
	const err = new AxiosError('Request failed');
	err.response = {
		status,
		data: { error: { code, message: 'backend message' } },
	} as AxiosError['response'];
	return err;
}

describe('reportAssistantError', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		mockCaptureException.mockClear();
	});

	it('reports an unexpected error tagged with the feature and operation', () => {
		const err = restError(500, ErrorCodeDTO.internal_error);

		reportAssistantError('sendMessage', err);

		expect(mockCaptureException).toHaveBeenCalledWith(err, {
			tags: { feature: 'noz', operation: 'sendMessage' },
		});
	});

	it.each([
		['a quota limit', restError(429, ErrorCodeDTO.daily_message_limit)],
		['a permission error', restError(403, ErrorCodeDTO.permission_denied)],
		['a busy thread', restError(409, ErrorCodeDTO.thread_busy)],
	])('does not report %s', (_, err) => {
		reportAssistantError('sendMessage', err);

		expect(mockCaptureException).not.toHaveBeenCalled();
	});
});
