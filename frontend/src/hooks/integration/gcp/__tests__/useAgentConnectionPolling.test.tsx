import { act, AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';

import {
	CONNECTION_TIMEOUT_MS,
	POLL_INTERVAL_MS,
	useAgentConnectionPolling,
} from '../useAgentConnectionPolling';
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

const renderPolling = (): void => {
	renderHook(
		() =>
			useAgentConnectionPolling({
				accountId: ACCOUNT_ID,
				enabled: true,
				...callbacks,
			}),
		{ wrapper: AllTheProviders },
	);
};

describe('useAgentConnectionPolling outcomes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('keeps polling until the agent checks in, then reports the connection', async () => {
		const { requestCount } = mockAccountResponses(
			pendingAccount,
			pendingAccount,
			connectedAccount,
		);
		renderPolling();

		await waitFor(() => expect(requestCount()).toBe(1));
		await act(async () => {
			jest.advanceTimersByTime(POLL_INTERVAL_MS);
		});
		await waitFor(() => expect(requestCount()).toBe(2));
		await act(async () => {
			jest.advanceTimersByTime(POLL_INTERVAL_MS);
		});

		await waitFor(() =>
			expect(onConnected).toHaveBeenCalledWith(connectedAccount),
		);
		expect(onTimeout).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
	});

	it('does not treat a removed account as connected', async () => {
		const { requestCount } = mockAccountResponses({
			...connectedAccount,
			removedAt: '2026-01-01T00:00:00Z',
		});
		renderPolling();

		await waitFor(() => expect(requestCount()).toBe(1));
		await act(async () => {
			jest.advanceTimersByTime(CONNECTION_TIMEOUT_MS);
		});

		await waitFor(() => expect(onTimeout).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
	});

	it('reports an error when the account request fails', async () => {
		server.use(
			rest.get(ACCOUNT_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);
		renderPolling();

		await waitFor(() => expect(onError).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
	});
});
