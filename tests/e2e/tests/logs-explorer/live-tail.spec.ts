import {
	expect,
	SEEDED_DATA_TIMEOUT,
	serviceFilter,
	sideService,
	test,
	type LogsSeed,
} from '../../drivers/logs';

/** One backend refresh (5 s) plus slack. See docs/flake-notes.md. */
const PAUSED_HOLD_MS = 7_000;
const LIVE_OFFSET_MS = 5_000;
/** Far enough ahead that the row is still newer than a stream reopened later. */
const PAUSED_OFFSET_MS = 60_000;

// Live rows go to a service of their own so the worker's counts stay fixed.
const liveService = (seed: LogsSeed): string => sideService(seed, 'live');

test.describe('Logs Explorer — live tail', () => {
	test('TC-01 going live streams a log seeded after the connection opens', async ({
		logs,
		logsSeed,
	}) => {
		const service = liveService(logsSeed);
		await logs.goto({ expression: serviceFilter(service) });

		await logs.live.start();
		const body = `${service} live-${Date.now()}`;
		await logs.seedRow(service, body, LIVE_OFFSET_MS);

		await expect(logs.live.rowByBody(body)).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(logs.runButton()).toBeDisabled();
	});

	test('TC-02 pause holds new rows back and resume delivers them', async ({
		logs,
		logsSeed,
	}) => {
		const service = liveService(logsSeed);
		await logs.goto({ expression: serviceFilter(service) });
		await logs.live.start();

		await logs.live.pause();
		const body = `${service} paused-${Date.now()}`;
		await logs.seedRow(service, body, PAUSED_OFFSET_MS);
		await logs.live.expectAbsentFor(body, PAUSED_HOLD_MS);

		await logs.live.resume();

		await expect(logs.live.rowByBody(body)).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		await expect(logs.live.pauseResume()).toHaveText('Pause');
	});

	test('TC-03 leaving live mode returns to the list with the query enabled', async ({
		logs,
		logsSeed,
		noise,
	}) => {
		const service = sideService(logsSeed, `exit-${Date.now()}`);
		const fresh = `${service} fresh`;
		await logs.seedRow(service, fresh, -60_000);
		await logs.gotoUntil(fresh, { expression: serviceFilter(service) });

		await logs.live.start();
		await logs.live.exit();

		await expect(logs.runButton()).toBeEnabled();
		await expect(logs.rowByBody(fresh)).toBeVisible();
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});
});
