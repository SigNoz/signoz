import { render, screen } from 'tests/test-utils';
import { Alerts } from 'types/api/alerts/getTriggered';

import TableRowComponent from './TableRow';

jest.mock('types/api/alerts/getTriggered', () => ({}));

describe('TableRowComponent component', () => {
	const tags = ['tag1', 'tag2'];
	const tagsAlerts: Alerts[] = [
		{
			labels: {
				alertname: 'Critical Alert',
				severity: 'critical',
				tag1: 'value1',
				tag2: 'value2',
			},
			annotations: {
				description: 'Description 1',
				summary: 'Summary 1',
				customProperty: 'Custom Value 1',
			},
			state: 'active',
			name: 'Alert 1',
			id: 1,
			endsAt: '2023-12-05T12:00:00Z',
			fingerprint: 'fingerprint1',
			generatorURL: 'generatorURL1',
			receivers: [],
			startsAt: '2023-12-05T11:00:00Z',
			status: { inhibitedBy: [], silencedBy: [], state: 'active' },
			updatedAt: '2023-12-05T11:30:00Z',
		},
		{
			labels: {
				alertname: 'Warning Alert',
				severity: 'warning',
				tag1: 'value3',
				tag2: 'value4',
				tag3: 'value5',
			},
			annotations: {
				description: 'Description 2',
				summary: 'Summary 2',
				customProperty: 'Custom Value 2',
			},
			state: 'inactive',
			name: 'Alert 2',
			id: 2,
			endsAt: '2023-12-05T13:00:00Z',
			fingerprint: 'fingerprint2',
			generatorURL: 'generatorURL2',
			receivers: [],
			startsAt: '2023-12-05T12:30:00Z',
			status: { inhibitedBy: [], silencedBy: [], state: 'inactive' },
			updatedAt: '2023-12-05T12:45:00Z',
		},
		// Add more test alerts as needed
	];

	test('should render tags and expandable row when clicked', () => {
		render(<TableRowComponent tags={tags} tagsAlert={tagsAlerts} />);
		expect(screen.getByText('tag1')).toBeInTheDocument();
		expect(screen.getByText('tag2')).toBeInTheDocument();
	});

	// Add more test cases as needed
});
