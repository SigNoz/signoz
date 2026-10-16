import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';

import { useAgentConnectionPolling } from '../useAgentConnectionPolling';
import {
	ACCOUNT_ID,
	callbacks,
	connectedAccount,
	mockAccountResponses,
	onConnected,
	onTimeout,
	pendingAccount,
	sleep,
} from './pollingTestHelpers';

describe('useAgentConnectionPolling polling window', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('does not poll while disabled', async () => {
		const { requestCount } = mockAccountResponses(connectedAccount);

		renderHook(
			() =>
				useAgentConnectionPolling({
					accountId: ACCOUNT_ID,
					enabled: false,
					...callbacks,
				}),
			{ wrapper: AllTheProviders },
		);

		await sleep(50);
		expect(requestCount()).toBe(0);
		expect(onConnected).not.toHaveBeenCalled();
	});

	it('does not poll without an account id', async () => {
		const { requestCount } = mockAccountResponses(connectedAccount);

		renderHook(
			() =>
				useAgentConnectionPolling({
					accountId: null,
					enabled: true,
					...callbacks,
				}),
			{ wrapper: AllTheProviders },
		);

		await sleep(50);
		expect(requestCount()).toBe(0);
	});

	it('reports a timeout once the deadline passes without a check-in', async () => {
		mockAccountResponses(pendingAccount);

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

		await waitFor(() => expect(onTimeout).toHaveBeenCalledTimes(1));
		expect(onConnected).not.toHaveBeenCalled();
	});

	it('starts the timeout clock when polling is enabled, not on mount', async () => {
		const { requestCount } = mockAccountResponses(pendingAccount);
		const timeoutMs = 200;

		const { rerender } = renderHook(
			({ enabled }: { enabled: boolean }) =>
				useAgentConnectionPolling({
					accountId: ACCOUNT_ID,
					enabled,
					timeoutMs,
					refetchInterval: 60_000,
					...callbacks,
				}),
			{ wrapper: AllTheProviders, initialProps: { enabled: false } },
		);

		await sleep(timeoutMs + 100);
		rerender({ enabled: true });

		await waitFor(() => expect(requestCount()).toBe(1));
		await sleep(20);
		expect(onTimeout).not.toHaveBeenCalled();
	});
});
