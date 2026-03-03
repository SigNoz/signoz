import { ServiceDetailsResponse } from '../types';

const CLOUD_ACCOUNT_ID = '123456789012';

const initialBuckets = { 'us-east-2': ['first-bucket', 'second-bucket'] };

const accountsResponse = {
	status: 'success',
	data: {
		accounts: [
			{
				id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
				cloud_account_id: CLOUD_ACCOUNT_ID,
				config: {
					regions: ['ap-south-1', 'ap-south-2', 'us-east-1', 'us-east-2'],
				},
				status: {
					integration: {
						last_heartbeat_ts_ms: 1747114366214,
					},
				},
			},
		],
	},
};

/** Response shape for GET /cloud-integrations/aws/services/:serviceId (used by ServiceDetails). */
const buildServiceDetailsResponse = (
	serviceId: string,
	initialConfigLogsS3Buckets: Record<string, string[]> = {},
): ServiceDetailsResponse => ({
	status: 'success',
	data: {
		id: serviceId,
		title: serviceId === 's3sync' ? 'S3 Sync' : serviceId,
		icon: '',
		overview: '',
		supported_signals: { logs: serviceId === 's3sync', metrics: false },
		assets: { dashboards: [] },
		data_collected: { logs: [], metrics: [] },
		config: {
			logs: { enabled: true, s3_buckets: initialConfigLogsS3Buckets },
			metrics: { enabled: false },
		},
		status: { logs: null, metrics: null },
	},
});

export {
	accountsResponse,
	buildServiceDetailsResponse,
	CLOUD_ACCOUNT_ID,
	initialBuckets,
};
