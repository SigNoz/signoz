import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
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

export function useMockTimezone(): {
	timezone: Timezone;
	browserTimezone: Timezone;
	updateTimezone: (timezone: Timezone) => void;
	formatTimezoneAdjustedTimestamp: (input: string, format?: string) => string;
	isAdaptationEnabled: boolean;
	setIsAdaptationEnabled: (enabled: boolean) => void;
} {
	const mockTimezone: Timezone = {
		name: 'timezone',
		value: 'mock-timezone',
		offset: '+1.30',
		searchIndex: '1',
	};
	return {
		timezone: mockTimezone,
		browserTimezone: mockTimezone,
		updateTimezone: jest.fn(),
		formatTimezoneAdjustedTimestamp: jest
			.fn()
			.mockImplementation((date: string) => new Date(date).toISOString()),
		isAdaptationEnabled: true,
		setIsAdaptationEnabled: jest.fn(),
	};
}
