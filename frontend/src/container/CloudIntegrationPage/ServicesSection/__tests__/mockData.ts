import { IConfigureServiceModalProps } from '../ConfigureServiceModal';

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

const defaultModalProps: Omit<IConfigureServiceModalProps, 'initialConfig'> = {
	isOpen: true,
	onClose: jest.fn(),
	serviceName: 'S3 Sync',
	serviceId: 's3sync',
	cloudAccountId: CLOUD_ACCOUNT_ID,
	supportedSignals: {
		logs: true,
		metrics: false,
	},
};

export {
	accountsResponse,
	CLOUD_ACCOUNT_ID,
	defaultModalProps,
	initialBuckets,
};
