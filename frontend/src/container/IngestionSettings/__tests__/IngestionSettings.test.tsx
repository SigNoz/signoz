import { IngestionInfo } from 'types/api/settings/ingestion';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';

import IngestionSettings from '../IngestionSettings';

const mockCopy = jest.fn();

// Stub only react-use's copy so the click does not reach copy-to-clipboard's jsdom fallback (window.prompt).
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopy],
}));

const INGESTION_INFO: IngestionInfo = {
	keyId: 'key-1',
	name: 'default',
	createdAt: '2024-01-01T00:00:00Z',
	ingestionKey: 'sk_test_key',
	ingestionURL: 'https://ingest.example.com:443',
	dataRegion: 'us-east-1',
};

describe('IngestionSettings', () => {
	beforeEach(() => {
		mockCopy.mockClear();
		server.use(
			rest.get('*/settings/ingestion_key', (_req, res, ctx) =>
				res(ctx.status(200), ctx.json([INGESTION_INFO])),
			),
		);
	});

	it('copies the ingestion URL and key', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<IngestionSettings />);

		await user.click(await screen.findByTestId('ingestion-settings-copy-1'));
		expect(mockCopy).toHaveBeenLastCalledWith(INGESTION_INFO.ingestionURL);

		await user.click(screen.getByTestId('ingestion-settings-copy-2'));
		expect(mockCopy).toHaveBeenLastCalledWith(INGESTION_INFO.ingestionKey);
	});
});
