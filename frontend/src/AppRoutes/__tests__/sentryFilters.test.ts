import type { ErrorEvent, StackFrame } from '@sentry/react';

import {
	hasNoAppFrames,
	isExternalIntegrationError,
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

describe('isExternalIntegrationError', () => {
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
		expect(isExternalIntegrationError(eventWithFrames(APP_BUNDLE, url))).toBe(
			true,
		);
	});

	it('drops it when the top frame is our bundle', () => {
		expect(
			isExternalIntegrationError(
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
			isExternalIntegrationError(eventWithFrames(APP_BUNDLE, '<anonymous>')),
		).toBe(false);
	});

	it('keeps an error from a host that only contains an integration name', () => {
		expect(
			isExternalIntegrationError(
				eventWithFrames(
					'https://posthog.example.com/app.js',
					'https://notusepylon.com/widget.js',
				),
			),
		).toBe(false);
	});

	it('keeps an error without a stack trace', () => {
		expect(isExternalIntegrationError({ type: undefined })).toBe(false);
	});
});

describe('hasNoAppFrames', () => {
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
			hasNoAppFrames(
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
			hasNoAppFrames(
				eventWithStackFrames([
					{ filename: 'chrome-extension://abc/content.js', lineno: 4, colno: 12 },
				]),
			),
		).toBe(true);
	});

	it('keeps an error with a frame from our bundle', () => {
		expect(hasNoAppFrames(eventWithFrames(PAGE_URL, APP_BUNDLE))).toBe(false);
	});

	it('keeps an error without a stack trace', () => {
		expect(hasNoAppFrames({ type: undefined })).toBe(false);
	});

	it('keeps an error whose frames have no position', () => {
		expect(
			hasNoAppFrames(
				eventWithStackFrames([{ filename: '[native code]', function: 'eval' }]),
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
