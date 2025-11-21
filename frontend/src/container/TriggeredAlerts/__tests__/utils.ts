import { Alerts } from 'types/api/alerts/getTriggered';

export function createAlert(overrides: Partial<Alerts> = {}): Alerts {
	return {
		labels: undefined,
		annotations: {
			description: 'Test Description',
			summary: 'Test Summary',
		},
		state: 'firing',
		name: 'Test Alert',
		id: 1,
		endsAt: '2021-01-02T00:00:00Z',
		fingerprint: '1234567890',
		generatorURL: 'https://test.com',
		receivers: [{ name: 'Test Receiver' }],
		startsAt: '2021-01-03T00:00:00Z',
		status: {
			inhibitedBy: [],
			silencedBy: [],
			state: 'firing',
		},
		updatedAt: '2021-01-01T00:00:00Z',
		...overrides,
	};
}
