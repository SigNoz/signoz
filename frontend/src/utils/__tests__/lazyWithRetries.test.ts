import setSessionStorageApi from 'api/browser/sessionstorage/set';
import { SESSIONSTORAGE } from 'constants/sessionStorage';
import { consumeAppReload } from 'utils/appReload';
import { lazyRetry } from 'utils/lazyWithRetries';

const chunkError = new Error(
	'Failed to fetch dynamically imported module: /assets/DashboardPage-DdQ20L2t.js',
);

const settleWithinATick = (promise: Promise<unknown>): Promise<string> =>
	Promise.race([
		promise.then(
			() => 'resolved',
			() => 'rejected',
		),
		new Promise<string>((resolve) => {
			setTimeout(() => resolve('pending'), 0);
		}),
	]);

describe('lazyRetry', () => {
	beforeEach(() => {
		setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'false');
		consumeAppReload();
	});

	it('keeps loading and records why while it reloads after a chunk fails', async () => {
		const outcome = await settleWithinATick(
			lazyRetry(() => Promise.reject(chunkError)),
		);

		expect(outcome).toBe('pending');
		expect(consumeAppReload()).toStrictEqual({
			reason: 'chunk-load-failed',
			detail: chunkError.message,
		});
	});

	it('fails without reloading when the chunk is still missing after the reload', async () => {
		setSessionStorageApi(SESSIONSTORAGE.RETRY_LAZY_REFRESHED, 'true');

		await expect(lazyRetry(() => Promise.reject(chunkError))).rejects.toBe(
			chunkError,
		);
		expect(consumeAppReload()).toBeNull();
	});
});
