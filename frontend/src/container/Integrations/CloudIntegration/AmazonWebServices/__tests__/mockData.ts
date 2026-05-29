import {
	GetService200,
	ListAccounts200,
} from 'api/generated/services/sigNoz.schemas';

const CLOUD_ACCOUNT_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const PROVIDER_ACCOUNT_ID = '123456789012';

const initialBuckets = { 'us-east-2': ['first-bucket', 'second-bucket'] };

const accountsResponse: ListAccounts200 = {
	status: 'success',
	data: {
		accounts: [
			{
				id: CLOUD_ACCOUNT_ID,
				orgId: 'org-1',
				provider: 'aws',
				config: {
					aws: {
						regions: ['ap-south-1', 'ap-south-2', 'us-east-1', 'us-east-2'],
					},
				},
				agentReport: {
					timestampMillis: 1747114366214,
					data: null,
				},
				providerAccountId: PROVIDER_ACCOUNT_ID,
				removedAt: null,
			},
		],
	},
};

/** Response shape for GET /cloud_integrations/aws/services/:serviceId (used by ServiceDetails). */
const buildServiceDetailsResponse = (
	serviceId: string,
	initialConfigLogsS3Buckets: Record<string, string[]> = {},
): GetService200 => ({
	status: 'success',
	data: {
		id: serviceId,
		title: serviceId === 's3sync' ? 'S3 Sync' : serviceId,
		icon: '',
		overview: '',
		supportedSignals: { logs: serviceId === 's3sync', metrics: false },
		assets: { dashboards: [] },
		dataCollected: { logs: [], metrics: [] },
		cloudIntegrationService: {
			id: serviceId,
			config: {
				aws: {
					logs: { enabled: true, s3Buckets: initialConfigLogsS3Buckets },
					metrics: { enabled: false },
				},
			},
		},
		telemetryCollectionStrategy: { aws: {} },
	},
});

export {
	accountsResponse,
	buildServiceDetailsResponse,
	CLOUD_ACCOUNT_ID,
	initialBuckets,
	PROVIDER_ACCOUNT_ID,
};
