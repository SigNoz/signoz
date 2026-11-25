import type { loader as Loader } from '@monaco-editor/react';

const mockMonaco = { editor: {} };
const mockLazyRetry = jest.fn();

jest.mock('../setup', () => ({ monaco: mockMonaco }));
jest.mock('utils/lazyWithRetries', () => ({
	lazyRetry: (load: () => Promise<unknown>): Promise<unknown> =>
		mockLazyRetry(load),
}));

async function loadPatchedLoader(): Promise<typeof Loader> {
	let patched!: typeof Loader;
	await jest.isolateModulesAsync(async () => {
		({ loader: patched } = await import('@monaco-editor/react'));
		await import('../loader');
	});
	return patched;
}

describe('lazy monaco loader', () => {
	beforeEach(() => {
		mockLazyRetry.mockImplementation((load: () => Promise<unknown>) => load());
	});

	it('rejects a canceled init with the cancelation error', async () => {
		const loader = await loadPatchedLoader();
		const init = loader.init();
		init.cancel();

		await expect(init).rejects.toMatchObject({ type: 'cancelation' });
	});

	it('resolves with the bundled instance without adding a CDN script', async () => {
		const loader = await loadPatchedLoader();

		await expect(loader.init()).resolves.toBe(mockMonaco);
		// oxlint-disable-next-line signoz/no-dom-node-access -- script elements have no role to query by
		expect(document.querySelector('script')).toBeNull();
	});

	it('imports Monaco again on the next init after a failed load', async () => {
		const loader = await loadPatchedLoader();
		const chunkError = new Error('Failed to fetch dynamically imported module');
		mockLazyRetry.mockRejectedValueOnce(chunkError);

		await expect(loader.init()).rejects.toBe(chunkError);
		await expect(loader.init()).resolves.toBe(mockMonaco);
		expect(mockLazyRetry).toHaveBeenCalledTimes(2);
	});
});
