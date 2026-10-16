import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { rest } from 'msw';

import { useAgentConnectionPolling } from '../useAgentConnectionPolling';

const ACCOUNT_ID = 'acc-gcp-1';
const ACCOUNT_URL = `http://localhost/api/v1/cloud_integrations/gcp/accounts/${ACCOUNT_ID}`;

const agentReport = {
	timestampMillis: 1_700_000_000_000,
	data: {},
	syncState: null,
};

const pendingAccount: CloudintegrationtypesAccountDTO = {
	id: ACCOUNT_ID,
	orgId: 'org-1',
	provider: 'gcp',
	providerAccountId: null,
	removedAt: null,
	agentReport: null,
	config: {
		gcp: {
			connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO.agent,
			deploymentProjectId: 'my-deployment-project-123',
			deploymentRegion: 'us-central1',
			projectIds: ['my-deployment-project-123'],
		},
	},
};

const connectedAccount: CloudintegrationtypesAccountDTO = {
	...pendingAccount,
	providerAccountId: 'my-deployment-project-123',
	agentReport,
};

type WrapperProps = { children: ReactNode };

const createWrapper = (): ((props: WrapperProps) => JSX.Element) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: WrapperProps): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
};

const mockAccountResponses = (
	...accounts: CloudintegrationtypesAccountDTO[]
): { requestCount: () => number } => {
	let count = 0;
	server.use(
		rest.get(ACCOUNT_URL, (_req, res, ctx) => {
			const account = accounts[Math.min(count, accounts.length - 1)];
			count += 1;
			return res(ctx.status(200), ctx.json({ status: 'success', data: account }));
		}),
	);
	return { requestCount: (): number => count };
};

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

describe('useAgentConnectionPolling', () => {
	const onConnected = jest.fn();
	const onTimeout = jest.fn();
	const onError = jest.fn();

	const callbacks = { onConnected, onTimeout, onError };

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
			{ wrapper: createWrapper() },
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
			{ wrapper: createWrapper() },
		);

		await sleep(50);
		expect(requestCount()).toBe(0);
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
			{ wrapper: createWrapper() },
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
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(onTimeout).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
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
			{ wrapper: createWrapper() },
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
			{ wrapper: createWrapper(), initialProps: { enabled: false } },
		);

		await sleep(timeoutMs + 100);
		rerender({ enabled: true });

		await waitFor(() => expect(requestCount()).toBe(1));
		await sleep(20);
		expect(onTimeout).not.toHaveBeenCalled();
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
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(onError).toHaveBeenCalled());
		expect(onConnected).not.toHaveBeenCalled();
	});
});
