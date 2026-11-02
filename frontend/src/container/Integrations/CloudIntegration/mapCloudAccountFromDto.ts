import { CloudintegrationtypesAccountDTO } from 'api/generated/services/sigNoz.schemas';
import { CloudAccount as IntegrationCloudAccount } from 'container/Integrations/types';

import { CloudAccount as AwsCloudAccount } from './AmazonWebServices/types';

export function mapAccountDtoToAwsCloudAccount(
	account: CloudintegrationtypesAccountDTO,
): AwsCloudAccount | null {
	if (!account.providerAccountId) {
		return null;
	}

	return {
		id: account.id,
		cloud_account_id: account.id,
		config: {
			regions: account.config?.aws?.regions ?? [],
		},
		status: {
			integration: {
				last_heartbeat_ts_ms: account.agentReport?.timestampMillis ?? 0,
			},
		},
		providerAccountId: account.providerAccountId,
	};
}

export function mapAccountDtoToAzureCloudAccount(
	account: CloudintegrationtypesAccountDTO,
): IntegrationCloudAccount | null {
	if (!account.providerAccountId) {
		return null;
	}

	return {
		id: account.id,
		cloud_account_id: account.id,
		config: {
			deployment_region: account.config?.azure?.deploymentRegion ?? '',
			resource_groups: account.config?.azure?.resourceGroups ?? [],
		},
		status: {
			integration: {
				last_heartbeat_ts_ms: account.agentReport?.timestampMillis ?? 0,
			},
		},
		providerAccountId: account.providerAccountId,
	};
}

export function mapAccountDtoToGcpCloudAccount(
	account: CloudintegrationtypesAccountDTO,
): IntegrationCloudAccount | null {
	const gcpConfig = account.config.gcp;
	if (!account.providerAccountId || !gcpConfig) {
		return null;
	}

	return {
		id: account.id,
		cloud_account_id: account.id,
		config: {
			connection_method: gcpConfig.connectionMethod,
			deployment_region: gcpConfig.deploymentRegion,
			deployment_project_id: gcpConfig.deploymentProjectId,
			project_ids: gcpConfig.projectIds,
		},
		status: {
			integration: {
				last_heartbeat_ts_ms: account.agentReport?.timestampMillis ?? 0,
			},
		},
		providerAccountId: account.providerAccountId,
	};
}
