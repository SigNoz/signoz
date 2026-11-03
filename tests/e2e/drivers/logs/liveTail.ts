import { expect, type Locator, type Page } from '@playwright/test';

import { timePickerDriver } from '../timepicker';

import { ROW_SELECTOR } from './rows';

/**
 * Live tail on the logs explorer List view. The stream is an SSE request to
 * `/api/v3/logs/livetail`, and the backend only returns rows stamped after the
 * moment it connected, so rows a test expects must be seeded after `start`.
 */

const LIVE_TAIL_PATH = '/logs/livetail';
const PAUSE_RESUME = 'live-logs-pause-resume';

export interface LiveTail {
	/** Go live and wait for the stream to connect. */
	start(): Promise<void>;
	list(): Locator;
	rows(): Locator;
	rowByBody(text: string): Locator;
	pauseResume(): Locator;
	pause(): Promise<void>;
	/** Resume and wait for the new stream to connect. */
	resume(): Promise<void>;
	/** Assert `body` stays off the list for `ms`. */
	expectAbsentFor(body: string, ms: number): Promise<void>;
	/** Pick the 15 minute preset, which leaves live mode. */
	exit(): Promise<void>;
}

export function liveTailDriver(page: Page): LiveTail {
	const pauseResume = (): Locator => page.getByTestId(PAUSE_RESUME);
	const connected = (): Promise<unknown> =>
		page.waitForResponse((response) => response.url().includes(LIVE_TAIL_PATH));

	const live: LiveTail = {
		list: () => page.getByTestId('live-logs-list'),
		rows: () => live.list().locator(ROW_SELECTOR),
		rowByBody: (text) => live.rows().filter({ hasText: text }),
		pauseResume,

		start: async () => {
			const stream = connected();
			await timePickerDriver(page).goLive();
			await stream;
			await expect(pauseResume()).toHaveText('Pause');
		},

		pause: async () => {
			await pauseResume().click();
			await expect(pauseResume()).toHaveText('Resume');
		},

		resume: async () => {
			const stream = connected();
			await pauseResume().click();
			await stream;
			await expect(pauseResume()).toHaveText('Pause');
		},

		expectAbsentFor: async (body, ms) => {
			// Absence has no DOM signal: the only proof that a paused stream
			// delivered nothing is that the row is still missing after a backend
			// tick. See docs/flake-notes.md.
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await page.waitForTimeout(ms);
			await expect(live.rowByBody(body)).toHaveCount(0);
		},

		exit: async () => {
			// The picker input stays read-only while live, so `pickPreset`, which
			// waits for it to turn editable, cannot open it here.
			await timePickerDriver(page).input().click();
			await page.getByTestId('time-option-15m').click();
			await expect(page).toHaveURL(/relativeTime=15m(&|$)/);
			await expect(pauseResume()).toHaveCount(0);
		},
	};

	return live;
}
