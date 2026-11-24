export const notificationChannelsV2 = [
	{
		id: '3',
		name: 'dummy-channel',
		displayName: 'Dummy-Channel',
		kind: 'slack',
		createdAt: '2023-08-09T04:45:19.239344617Z',
		updatedAt: '2024-06-27T11:37:14.841184399Z',
	},
	{
		id: '4',
		name: 'oncall-pagerduty',
		displayName: 'Oncall PagerDuty',
		kind: 'pagerduty',
		createdAt: '2024-02-03T04:45:19.239344617Z',
		updatedAt: '2024-06-28T11:37:14.841184399Z',
	},
];

export const notificationChannelV2 = {
	id: '3',
	name: 'dummy-channel',
	displayName: 'Dummy-Channel',
	createdAt: '2023-08-09T04:45:19.239344617Z',
	updatedAt: '2024-06-27T11:37:14.841184399Z',
	config: {
		kind: 'slack',
		spec: {
			apiUrl: 'https://hooks.slack.com/services/dummy',
			channel: '#dummy_channel',
			sendResolved: true,
		},
	},
};
