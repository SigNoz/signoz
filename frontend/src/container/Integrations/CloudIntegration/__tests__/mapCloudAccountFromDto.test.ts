import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';

import { mapAccountDtoToGcpCloudAccount } from '../mapCloudAccountFromDto';

const gcpAccountDto = (
	connectionMethod?: CloudintegrationtypesGCPConnectionMethodDTO,
): CloudintegrationtypesAccountDTO => ({
	id: 'acc-gcp-1',
	orgId: 'org-1',
	provider: 'gcp',
	providerAccountId: 'my-project',
	removedAt: null,
	agentReport: { timestampMillis: 1_700_000_000_000, data: {}, syncState: null },
	config: {
		gcp: {
			connectionMethod:
				connectionMethod as CloudintegrationtypesGCPConnectionMethodDTO,
			deploymentProjectId: 'my-project',
			deploymentRegion: 'us-central1',
			projectIds: ['my-project'],
		},
	},
});

describe('mapAccountDtoToGcpCloudAccount', () => {
	it('keeps the connection method of the account', () => {
		const account = mapAccountDtoToGcpCloudAccount(
			gcpAccountDto(CloudintegrationtypesGCPConnectionMethodDTO.agent),
		);

		expect(account?.config).toStrictEqual({
			connection_method: CloudintegrationtypesGCPConnectionMethodDTO.agent,
			deployment_region: 'us-central1',
			deployment_project_id: 'my-project',
			project_ids: ['my-project'],
		});
	});

	it('treats an account without a connection method as manual', () => {
		const account = mapAccountDtoToGcpCloudAccount(gcpAccountDto());

		expect(account?.config).toHaveProperty(
			'connection_method',
			CloudintegrationtypesGCPConnectionMethodDTO.manual,
		);
	});
});
