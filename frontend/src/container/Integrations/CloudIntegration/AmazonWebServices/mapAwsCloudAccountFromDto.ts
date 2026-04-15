import { CloudintegrationtypesAccountDTO } from 'api/generated/services/sigNoz.schemas';

import { CloudAccount } from './types';

export function mapAccountDtoToAwsCloudAccount(
	account: CloudintegrationtypesAccountDTO,
): CloudAccount | null {
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
