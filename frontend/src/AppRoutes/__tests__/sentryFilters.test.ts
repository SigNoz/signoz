import type { ErrorEvent, StackFrame } from '@sentry/react';
import { AxiosError, AxiosHeaders } from 'axios';

import {
	isInjectedScriptError,
	isExpectedRequestFailure,
	isThirdPartyScriptError,
	SENTRY_IGNORE_ERRORS,
} from '../sentryFilters';

const APP_BUNDLE = 'https://example.us.signoz.cloud/assets/index-B3QqK3ie.js';

function eventWithFrames(...filenames: string[]): ErrorEvent {
	return {
		type: undefined,
		exception: {
			values: [
				{
					type: 'TypeError',
					value: 'Failed to fetch',
					stacktrace: {
						frames: filenames.map((filename) => ({ filename, lineno: 1, colno: 1 })),
					},
				},
			],
		},
	};
}

describe('isThirdPartyScriptError', () => {
	it.each([
		[
			'PostHog recorder',
			'https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.298.0',
		],
		[
			'Pylon widget',
			'https://widget.usepylon.com/widget/00000000-0000-0000-0000-000000000000',
		],
		['Appcues', 'https://fast.appcues.com/123456.js'],
	])('drops an error with a %s frame', (_, url) => {
		expect(isThirdPartyScriptError(eventWithFrames(APP_BUNDLE, url))).toBe(true);
	});

	it('drops it when the top frame is our bundle', () => {
		expect(
			isThirdPartyScriptError(
				eventWithFrames(
					'https://us-assets.i.posthog.com/static/posthog-recorder.js?v=1.298.0',
					'<anonymous>',
					APP_BUNDLE,
				),
			),
		).toBe(true);
	});

	it('keeps an error from our bundle only', () => {
		expect(
			isThirdPartyScriptError(eventWithFrames(APP_BUNDLE, '<anonymous>')),
		).toBe(false);
	});

	it('keeps an error from a host that only contains an integration name', () => {
		expect(
			isThirdPartyScriptError(
				eventWithFrames(
					'https://posthog.example.com/app.js',
					'https://notusepylon.com/widget.js',
				),
			),
		).toBe(false);
	});

	it('keeps an error without a stack trace', () => {
		expect(isThirdPartyScriptError({ type: undefined })).toBe(false);
	});
});

describe('isInjectedScriptError', () => {
	const PAGE_URL = 'https://example.us.signoz.cloud/dashboard/01a081e1';

	function eventWithStackFrames(frames: StackFrame[]): ErrorEvent {
		return {
			type: undefined,
			exception: {
				values: [{ type: 'SyntaxError', stacktrace: { frames } }],
			},
		};
	}

	it('drops a script appended to the page', () => {
		expect(
			isInjectedScriptError(
				eventWithStackFrames([
					{ filename: PAGE_URL, lineno: 1, colno: 30, function: 'global code' },
					{ filename: '[native code]', function: 'eval' },
					{ filename: '[native code]', function: 'append' },
				]),
			),
		).toBe(true);
	});

	it('drops a browser extension error', () => {
		expect(
			isInjectedScriptError(
				eventWithStackFrames([
					{ filename: 'chrome-extension://abc/content.js', lineno: 4, colno: 12 },
				]),
			),
		).toBe(true);
	});

	it('drops an error thrown from injected code behind the Sentry wrapper', () => {
		expect(
			isInjectedScriptError(eventWithFrames(APP_BUNDLE, '<anonymous>')),
		).toBe(true);
	});

	it('keeps an error thrown from our bundle after an anonymous frame', () => {
		expect(
			isInjectedScriptError(eventWithFrames('<anonymous>', APP_BUNDLE)),
		).toBe(false);
	});

	it('keeps an error with a frame from our bundle', () => {
		expect(isInjectedScriptError(eventWithFrames(PAGE_URL, APP_BUNDLE))).toBe(
			false,
		);
	});

	it('keeps an error without a stack trace', () => {
		expect(isInjectedScriptError({ type: undefined })).toBe(false);
	});

	it('keeps an error whose frames have no position', () => {
		expect(
			isInjectedScriptError(
				eventWithStackFrames([{ filename: '[native code]', function: 'eval' }]),
			),
		).toBe(false);
	});

	it('keeps an error a builtin threw for our bundle', () => {
		expect(
			isInjectedScriptError(
				eventWithStackFrames([
					{ filename: APP_BUNDLE, lineno: 1, colno: 1 },
					{ filename: '<anonymous>', function: 'JSON.parse' },
				]),
			),
		).toBe(false);
	});
});

describe('SENTRY_IGNORE_ERRORS', () => {
	it('ignores the bundled PostHog recorder load failure', () => {
		expect(
			SENTRY_IGNORE_ERRORS.some((pattern) =>
				pattern.test(
					'Error: Called on script loaded before session recording is available',
				),
			),
		).toBe(true);
	});
});

describe('isExpectedRequestFailure', () => {
	function axiosErrorWithStatus(status: number): AxiosError {
		const config = { headers: new AxiosHeaders() };
		return new AxiosError(
			`Request failed with status code ${status}`,
			AxiosError.ERR_BAD_REQUEST,
			config,
			undefined,
			{ status, statusText: '', headers: {}, config, data: {} },
		);
	}

	it.each([401, 403])('drops a %i response', (status) => {
		expect(isExpectedRequestFailure(axiosErrorWithStatus(status))).toBe(true);
	});

	it('drops a network error', () => {
		expect(
			isExpectedRequestFailure(
				new AxiosError('Network Error', AxiosError.ERR_NETWORK),
			),
		).toBe(true);
	});

	it.each([400, 404, 500, 503])('keeps a %i response', (status) => {
		expect(isExpectedRequestFailure(axiosErrorWithStatus(status))).toBe(false);
	});

	it('keeps an error that is not from axios', () => {
		expect(isExpectedRequestFailure(new Error('Network Error'))).toBe(false);
	});
});
