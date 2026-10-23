import { act, AllTheProviders, renderHook, waitFor } from 'tests/test-utils';

import {
	CONNECTION_TIMEOUT_MS,
	POLL_INTERVAL_MS,
	useAgentConnectionPolling,
} from '../useAgentConnectionPolling';
import {
	ACCOUNT_ID,
	callbacks,
	connectedAccount,
	mockAccountResponses,
	onConnected,
	onTimeout,
	pendingAccount,
} from './pollingTestHelpers';

const renderPolling = (
	initialEnabled: boolean,
): ((enabled: boolean) => void) => {
	const { rerender } = renderHook(
		({ enabled }: { enabled: boolean }) =>
			useAgentConnectionPolling({
				accountId: ACCOUNT_ID,
				enabled,
				...callbacks,
			}),
		{ wrapper: AllTheProviders, initialProps: { enabled: initialEnabled } },
	);
	return (enabled: boolean): void => rerender({ enabled });
};

describe('useAgentConnectionPolling polling window', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('does not poll while disabled', async () => {
		const { requestCount } = mockAccountResponses(connectedAccount);
		renderPolling(false);

		await act(async () => {
			jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
		});

		expect(requestCount()).toBe(0);
		expect(onConnected).not.toHaveBeenCalled();
	});

	it('reports a timeout once the deadline passes without a check-in', async () => {
		const { requestCount } = mockAccountResponses(pendingAccount);
		renderPolling(true);

		await waitFor(() => expect(requestCount()).toBe(1));
		expect(onTimeout).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(CONNECTION_TIMEOUT_MS);
		});

		await waitFor(() => expect(onTimeout).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
	});

	it('starts the timeout clock when polling is enabled, not on mount', async () => {
		const { requestCount } = mockAccountResponses(pendingAccount);
		const setEnabled = renderPolling(false);

		// Longer than the whole window passes before polling is turned on.
		await act(async () => {
			jest.advanceTimersByTime(CONNECTION_TIMEOUT_MS + POLL_INTERVAL_MS);
		});
		setEnabled(true);

		await waitFor(() => expect(requestCount()).toBe(1));
		expect(onTimeout).not.toHaveBeenCalled();
	});
});
