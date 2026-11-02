import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';

import { useAgentConnectionPolling } from '../useAgentConnectionPolling';

type PollingProps = Parameters<typeof useAgentConnectionPolling>[0];

export const onConnected = jest.fn() as jest.MockedFunction<
	PollingProps['onConnected']
>;
export const onTimeout = jest.fn() as jest.MockedFunction<
	PollingProps['onTimeout']
>;
export const onError = jest.fn() as jest.MockedFunction<
	PollingProps['onError']
>;

export const callbacks = { onConnected, onTimeout, onError };

export const ACCOUNT_ID = 'acc-gcp-1';
export const ACCOUNT_URL = `http://localhost/api/v1/cloud_integrations/gcp/accounts/${ACCOUNT_ID}`;

const agentReport = {
	timestampMillis: 1_700_000_000_000,
	data: {},
	syncState: null,
};

export const pendingAccount: CloudintegrationtypesAccountDTO = {
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

export const connectedAccount: CloudintegrationtypesAccountDTO = {
	...pendingAccount,
	providerAccountId: 'my-deployment-project-123',
	agentReport,
};

export const mockAccountResponses = (
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
