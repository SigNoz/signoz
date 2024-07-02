import { render, screen } from 'tests/test-utils';
import { Alerts } from 'types/api/alerts/getTriggered';

import ExapandableRow from './ExapandableRow';

jest.mock('lib/convertDateToAmAndPm', () => jest.fn(() => '12:00 PM'));
jest.mock('lib/getFormatedDate', () => jest.fn(() => '2023-12-05'));

describe('ExapandableRow component', () => {
	const allAlerts: Alerts[] = [
		{
			id: 1,
			annotations: { description: 'Description 1', summary: 'Summary 1' },
			state: 'active',
			name: 'Alert 1',
			labels: {
				alertname: 'Critical Alert',
				severity: 'critical',
				tag1: 'value1',
				tag2: 'value2',
			},
			status: { inhibitedBy: [], silencedBy: [], state: 'active' },
			startsAt: '2023-12-05T11:00:00Z',
			fingerprint: 'fingerprint1',
			endsAt: '2023-12-05T12:00:00Z',
			generatorURL: 'generatorURL1',
			receivers: [],
			updatedAt: '2023-12-05T11:30:00Z',
		},
		{
			id: 2,
			annotations: { description: 'Description 2', summary: 'Summary 2' },
			state: 'inactive',
			name: 'Alert 2',
			labels: {
				alertname: 'Warning Alert',
				severity: 'warning',
				tag1: 'value3',
				tag2: 'value4',
				tag3: 'value5',
			},
			status: { inhibitedBy: [], silencedBy: [], state: 'inactive' },
			startsAt: '2023-12-05T13:00:00Z',
			fingerprint: 'fingerprint2',
			endsAt: '2023-12-05T14:00:00Z',
			generatorURL: 'generatorURL2',
			receivers: [],
			updatedAt: '2023-12-05T13:30:00Z',
		},
	];

	test('should render correct content for each alert', () => {
		render(<ExapandableRow allAlerts={allAlerts} />);

		expect(screen.getByText('Critical Alert')).toBeInTheDocument();
		expect(screen.getByText('critical')).toBeInTheDocument();

		expect(screen.getByText('Warning Alert')).toBeInTheDocument();
		expect(screen.getByText('warning')).toBeInTheDocument();
	});

	test('Should render the unknown status if tag is not corrently mentioned', () => {
		render(<ExapandableRow allAlerts={allAlerts} />);
		const unknowStatus = screen.getByText('Unknown Status');
		expect(unknowStatus).toBeInTheDocument();
		screen.debug();
	});
});
