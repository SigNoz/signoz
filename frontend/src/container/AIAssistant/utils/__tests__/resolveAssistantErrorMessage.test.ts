import { AxiosError } from 'axios';
import { ErrorCodeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { resolveAssistantErrorMessage } from '../resolveAssistantErrorMessage';

const FALLBACK = 'Something went wrong. Please try again.';

describe('resolveAssistantErrorMessage', () => {
	it('returns backend message for a known error code', () => {
		const err = new AxiosError('Request failed');
		err.response = {
			status: 400,
			data: {
				error: {
					code: ErrorCodeDTO.thread_busy,
					message: 'This thread is busy. Try again shortly.',
				},
			},
		} as AxiosError['response'];

		expect(resolveAssistantErrorMessage(err, FALLBACK)).toStrictEqual({
			message: 'This thread is busy. Try again shortly.',
			isRateLimit: false,
		});
	});

	it('falls back when error code is not in ErrorCodeDTO', () => {
		const err = new AxiosError('Request failed');
		err.response = {
			status: 400,
			data: {
				error: {
					code: 'future_unknown_code',
					message: 'Backend-only message',
				},
			},
		} as AxiosError['response'];

		expect(resolveAssistantErrorMessage(err, FALLBACK)).toStrictEqual({
			message: FALLBACK,
			isRateLimit: false,
		});
	});

	it('marks HTTP 429 responses as rate limited', () => {
		const err = new AxiosError('Too many requests');
		err.response = {
			status: 429,
			data: {
				error: {
					code: ErrorCodeDTO.hourly_message_limit,
					message: 'Hourly limit reached.',
				},
			},
		} as AxiosError['response'];

		expect(resolveAssistantErrorMessage(err, FALLBACK)).toStrictEqual({
			message: 'Hourly limit reached.',
			isRateLimit: true,
		});
	});

	it('uses backend message for known SSE rate-limit error codes', () => {
		const err = Object.assign(new Error('Daily token limit exceeded.'), {
			code: ErrorCodeDTO.daily_token_limit,
		});

		expect(resolveAssistantErrorMessage(err, FALLBACK)).toStrictEqual({
			message: 'Daily token limit exceeded.',
			isRateLimit: true,
		});
	});

	it('marks 429 as rate limited even when error code is unknown', () => {
		const err = new AxiosError('Too many requests');
		err.response = {
			status: 429,
			data: {
				error: {
					code: 'future_unknown_code',
					message: 'Too many requests',
				},
			},
		} as AxiosError['response'];

		expect(resolveAssistantErrorMessage(err, FALLBACK)).toStrictEqual({
			message: FALLBACK,
			isRateLimit: true,
		});
	});
});
