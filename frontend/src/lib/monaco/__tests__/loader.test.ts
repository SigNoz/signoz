import { loader } from '@monaco-editor/react';

import '../loader';

const mockMonaco = { editor: {} };

jest.mock('../setup', () => ({ monaco: mockMonaco }));

describe('lazy monaco loader', () => {
	it('rejects a canceled init with the cancelation error', async () => {
		const init = loader.init();
		init.cancel();

		await expect(init).rejects.toMatchObject({ type: 'cancelation' });
	});

	it('resolves with the bundled instance without adding a CDN script', async () => {
		await expect(loader.init()).resolves.toBe(mockMonaco);
		// oxlint-disable-next-line signoz/no-dom-node-access -- script elements have no role to query by
		expect(document.querySelector('script')).toBeNull();
	});
});
