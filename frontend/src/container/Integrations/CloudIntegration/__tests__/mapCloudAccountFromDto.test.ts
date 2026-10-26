import {
	CloudintegrationtypesAccountDTO,
	CloudintegrationtypesGCPConnectionMethodDTO,
} from 'api/generated/services/sigNoz.schemas';

import { mapAccountDtoToGcpCloudAccount } from '../mapCloudAccountFromDto';

const gcpAccountDto: CloudintegrationtypesAccountDTO = {
	id: 'acc-gcp-1',
	orgId: 'org-1',
	provider: 'gcp',
	providerAccountId: 'my-project',
	removedAt: null,
	agentReport: { timestampMillis: 1_700_000_000_000, data: {}, syncState: null },
	config: {
		gcp: {
			connectionMethod: CloudintegrationtypesGCPConnectionMethodDTO.agent,
			deploymentProjectId: 'my-project',
			deploymentRegion: 'us-central1',
			projectIds: ['my-project'],
		},
	},
};

describe('mapAccountDtoToGcpCloudAccount', () => {
	it('maps the GCP config, including its connection method', () => {
		const account = mapAccountDtoToGcpCloudAccount(gcpAccountDto);

		expect(account?.config).toStrictEqual({
			connection_method: CloudintegrationtypesGCPConnectionMethodDTO.agent,
			deployment_region: 'us-central1',
			deployment_project_id: 'my-project',
			project_ids: ['my-project'],
		});
	});

	it('skips an account that has no GCP config', () => {
		expect(
			mapAccountDtoToGcpCloudAccount({ ...gcpAccountDto, config: {} }),
		).toBeNull();
	});

	it('skips an account the agent has not checked in for yet', () => {
		expect(
			mapAccountDtoToGcpCloudAccount({
				...gcpAccountDto,
				providerAccountId: null,
			}),
		).toBeNull();
	});
});
