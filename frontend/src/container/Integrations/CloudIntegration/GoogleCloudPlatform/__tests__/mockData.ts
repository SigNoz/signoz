import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';
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
