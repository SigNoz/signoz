import {
	CloudintegrationtypesCredentialsDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	CloudAccount,
	GCPCloudAccountConfig,
} from 'container/Integrations/types';

export const GCP_CREDENTIALS_URL =
	'http://localhost/api/v1/cloud_integrations/gcp/credentials';
export const GCP_ACCOUNTS_URL =
	'http://localhost/api/v1/cloud_integrations/gcp/accounts';
export const GCP_CHECK_IN_URL =
	'http://localhost/api/v1/cloud_integrations/gcp/accounts/check_in';

export const CLOUD_INTEGRATION_ID = 'ci-gcp-1234';

export const GCP_ACCOUNT_ID = 'acc-gcp-1';
export const GCP_ACCOUNT_URL = `${GCP_ACCOUNTS_URL}/${GCP_ACCOUNT_ID}`;

export const gcpAccountConfig: GCPCloudAccountConfig = {
	connection_method: CloudintegrationtypesGCPConnectionMethodDTO.manual,
	deployment_region: 'asia-south1',
	deployment_project_id: 'my-deployment-project-123',
	project_ids: ['project-a', 'project-b'],
};

export const gcpAccount: CloudAccount = {
	id: GCP_ACCOUNT_ID,
	cloud_account_id: 'gcp-cloud-1',
	providerAccountId: 'billing@company.com',
	config: gcpAccountConfig,
	status: { integration: { last_heartbeat_ts_ms: 1_700_000_000_000 } },
};

export const gcpAgentAccount: CloudAccount = {
	id: 'acc-gcp-agent-1',
	cloud_account_id: 'acc-gcp-agent-1',
	providerAccountId: 'my-agent-project',
	config: {
		connection_method: CloudintegrationtypesGCPConnectionMethodDTO.agent,
		deployment_region: 'us-central1',
		deployment_project_id: 'my-agent-project',
		project_ids: ['my-agent-project'],
	},
	status: { integration: { last_heartbeat_ts_ms: 1_700_000_000_000 } },
};

export const listAccountsResponse = {
	status: 'success',
	data: { accounts: [] },
};

/**
 * Credentials the backend hands out on SigNoz Cloud. When present the drawer
 * renders them read-only and sends them back verbatim on submit.
 */
export const connectionCredentials: CloudintegrationtypesCredentialsDTO = {
	sigNozApiUrl: 'https://tenant.signoz.cloud',
	sigNozApiKey: 'signoz-api-key-abc',
	ingestionUrl: 'https://ingest.us.signoz.cloud',
	ingestionKey: 'ingestion-key-xyz',
};

export const connectionCredentialsResponse = {
	status: 'success',
	data: connectionCredentials,
};

export const createAccountResponse = {
	status: 'success',
	data: {
		id: CLOUD_INTEGRATION_ID,
		connectionArtifact: {},
	},
};

export const checkInResponse = {
	status: 'success',
	data: {},
};

export const gcpConnectionCommand = {
	cliCommand:
		"curl -fsSL 'https://signoz.io/foundry.sh' | bash -s -- cloudintegration gcp terraform --gcp-project 'my-deployment-project-123'",
};

export const createAgentAccountResponse = {
	status: 'success',
	data: {
		id: CLOUD_INTEGRATION_ID,
		connectionArtifact: { gcp: gcpConnectionCommand },
	},
};

export const GCP_AGENT_ACCOUNT_URL = `${GCP_ACCOUNTS_URL}/${CLOUD_INTEGRATION_ID}`;

const pendingAgentAccount = {
	id: CLOUD_INTEGRATION_ID,
	orgId: 'org-1',
	provider: 'gcp',
	providerAccountId: null,
	removedAt: null,
	agentReport: null,
	config: {
		gcp: {
			connectionMethod: 'agent',
			deploymentProjectId: 'my-deployment-project-123',
			deploymentRegion: 'asia-south1',
			projectIds: ['my-deployment-project-123'],
		},
	},
};

export const pendingAgentAccountResponse = {
	status: 'success',
	data: pendingAgentAccount,
};

export const connectedAgentAccountResponse = {
	status: 'success',
	data: {
		...pendingAgentAccount,
		providerAccountId: 'my-deployment-project-123',
		agentReport: {
			timestampMillis: 1_700_000_000_000,
			data: {},
			syncState: null,
		},
	},
};
