import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import { useAgentConnectionPolling } from '../useAgentConnectionPolling';
import {
	ACCOUNT_ID,
	ACCOUNT_URL,
	callbacks,
	connectedAccount,
	mockAccountResponses,
	onConnected,
	onError,
	onTimeout,
	pendingAccount,
} from './pollingTestHelpers';

describe('useAgentConnectionPolling outcomes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('keeps polling until the agent checks in, then reports the connection', async () => {
		const { requestCount } = mockAccountResponses(
			pendingAccount,
			pendingAccount,
			connectedAccount,
		);

		renderHook(
			() =>
				useAgentConnectionPolling({
					accountId: ACCOUNT_ID,
					enabled: true,
					refetchInterval: 20,
					...callbacks,
				}),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(onConnected).toHaveBeenCalled());
		expect(requestCount()).toBeGreaterThanOrEqual(3);
		expect(onConnected).toHaveBeenCalledWith(connectedAccount);
		expect(onTimeout).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});

	it('does not treat a removed account as connected', async () => {
		mockAccountResponses({
			...connectedAccount,
			removedAt: '2026-01-01T00:00:00Z',
		});

		renderHook(
			() =>
				useAgentConnectionPolling({
					accountId: ACCOUNT_ID,
					enabled: true,
					timeoutMs: 0,
					...callbacks,
				}),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(onTimeout).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
	});

	it('reports an error when the account request fails', async () => {
		server.use(
			rest.get(ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);

		renderHook(
			() =>
				useAgentConnectionPolling({
					accountId: ACCOUNT_ID,
					enabled: true,
					...callbacks,
				}),
			{ wrapper: AllTheProviders },
		);

		await waitFor(() => expect(onError).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
	});
});
