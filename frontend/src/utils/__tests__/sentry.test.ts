import type { Event, StackFrame } from '@sentry/react';

import { hasNoAppFrames } from '../sentry';

const PAGE_URL = 'https://acme.signoz.cloud/dashboard/01a081e1';
const APP_CHUNK_URL = 'https://acme.signoz.cloud/assets/index-CcNiYOcv.js';

const errorEvent = (frames: StackFrame[]): Event => ({
	exception: {
		values: [{ type: 'SyntaxError', stacktrace: { frames } }],
	},
});

describe('hasNoAppFrames', () => {
	it('is true for a script injected into the page', () => {
		expect(
			hasNoAppFrames(
				errorEvent([
					{ filename: PAGE_URL, lineno: 1, colno: 30, function: 'global code' },
					{ filename: '[native code]', function: 'eval' },
					{ filename: '[native code]', function: 'append' },
				]),
			),
		).toBe(true);
	});

	it('is true for a browser extension', () => {
		expect(
			hasNoAppFrames(
				errorEvent([
					{ filename: 'chrome-extension://abc/content.js', lineno: 4, colno: 12 },
				]),
			),
		).toBe(true);
	});

	it('is false when any frame comes from an app chunk', () => {
		expect(
			hasNoAppFrames(
				errorEvent([
					{ filename: PAGE_URL, lineno: 1, colno: 30 },
					{ filename: APP_CHUNK_URL, lineno: 2, colno: 4410 },
				]),
			),
		).toBe(false);
	});

	it('is false for an event without an exception', () => {
		expect(
			hasNoAppFrames({ message: 'Received unknown severity on Alert Details' }),
		).toBe(false);
	});

	it('is false when no frame has a position', () => {
		expect(
			hasNoAppFrames(
				errorEvent([{ filename: '[native code]', function: 'eval' }]),
			),
		).toBe(false);
	});
});
