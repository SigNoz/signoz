import { AxiosError } from 'axios';
import {
	ErrorCodeDTO,
	RetryActionDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { resolveAssistantError } from '../resolveAssistantError';

const FALLBACK = 'Something went wrong. Please try again.';

function restError(status: number, code: string, message: string): AxiosError {
	const err = new AxiosError('Request failed');
	err.response = {
		status,
		data: { error: { code, message } },
	} as AxiosError['response'];
	return err;
}

describe('resolveAssistantError', () => {
	describe('message resolution', () => {
		it('prefers code-specific FE copy over the backend message', () => {
			const err = restError(409, ErrorCodeDTO.thread_busy, 'raw backend phrasing');

			const { message } = resolveAssistantError(err, FALLBACK);
			expect(message).toBe(
				'This conversation is still finishing a previous response. Give it a moment and try again.',
			);
		});

		it('falls through to the backend message for a known code without FE copy', () => {
			const err = restError(
				400,
				ErrorCodeDTO.message_not_found,
				'No such message exists.',
			);

			expect(resolveAssistantError(err, FALLBACK)).toStrictEqual({
				message: 'No such message exists.',
				code: ErrorCodeDTO.message_not_found,
				retryAction: RetryActionDTO.none,
				isRateLimit: false,
			});
		});

		it('falls back when the error code is not in ErrorCodeDTO', () => {
			const err = restError(400, 'future_unknown_code', 'Backend-only message');

			expect(resolveAssistantError(err, FALLBACK)).toStrictEqual({
				message: FALLBACK,
				code: undefined,
				retryAction: RetryActionDTO.none,
				isRateLimit: false,
			});
		});
	});

	describe('rate limiting', () => {
		it('marks HTTP 429 responses as rate limited and non-retryable', () => {
			const err = restError(
				429,
				ErrorCodeDTO.hourly_message_limit,
				'Hourly limit reached.',
			);

			expect(resolveAssistantError(err, FALLBACK)).toStrictEqual({
				message: "You've reached the hourly message limit. Please try again later.",
				code: ErrorCodeDTO.hourly_message_limit,
				retryAction: RetryActionDTO.none,
				isRateLimit: true,
			});
		});

		it('treats known SSE rate-limit codes as rate limited', () => {
			const err = Object.assign(new Error('Daily token limit exceeded.'), {
				code: ErrorCodeDTO.daily_token_limit,
			});

			const res = resolveAssistantError(err, FALLBACK);
			expect(res.isRateLimit).toBe(true);
			expect(res.retryAction).toBe(RetryActionDTO.none);
		});

		it('marks 429 as rate limited even when the code is unknown', () => {
			const err = restError(429, 'future_unknown_code', 'Too many requests');

			expect(resolveAssistantError(err, FALLBACK)).toStrictEqual({
				message: FALLBACK,
				code: undefined,
				retryAction: RetryActionDTO.none,
				isRateLimit: true,
			});
		});
	});

	describe('retryAction resolution', () => {
		it('honours an explicit retryAction from an SSE error event', () => {
			const err = Object.assign(new Error('Transient hiccup'), {
				code: ErrorCodeDTO.internal_error,
				retryAction: RetryActionDTO.auto,
			});

			expect(resolveAssistantError(err, FALLBACK).retryAction).toBe(
				RetryActionDTO.auto,
			);
		});

		it('forces none for non-retryable permission errors', () => {
			const err = restError(403, ErrorCodeDTO.permission_denied, 'forbidden');

			expect(resolveAssistantError(err, FALLBACK).retryAction).toBe(
				RetryActionDTO.none,
			);
		});

		it('derives manual for 409 conflicts', () => {
			const err = restError(409, ErrorCodeDTO.thread_has_active_execution, 'busy');

			expect(resolveAssistantError(err, FALLBACK).retryAction).toBe(
				RetryActionDTO.manual,
			);
		});

		it('derives manual for 5xx responses', () => {
			const err = restError(503, 'future_unknown_code', 'unavailable');

			expect(resolveAssistantError(err, FALLBACK).retryAction).toBe(
				RetryActionDTO.manual,
			);
		});

		it('derives manual for network failures with no response', () => {
			const err = new AxiosError('Network Error');

			expect(resolveAssistantError(err, FALLBACK).retryAction).toBe(
				RetryActionDTO.manual,
			);
		});

		it('derives none for other 4xx responses', () => {
			const err = restError(400, 'future_unknown_code', 'bad request');

			expect(resolveAssistantError(err, FALLBACK).retryAction).toBe(
				RetryActionDTO.none,
			);
		});

		it('defaults to manual for non-Axios errors with no code', () => {
			expect(resolveAssistantError(new Error('boom'), FALLBACK).retryAction).toBe(
				RetryActionDTO.manual,
			);
		});
	});
});
