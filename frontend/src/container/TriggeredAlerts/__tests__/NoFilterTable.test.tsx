import { fireEvent, render, screen } from '@testing-library/react';
import * as timezoneHooks from 'providers/Timezone';

import NoFilterTable from '../NoFilterTable';
import { createAlert } from './utils';

const mockFormatTimezoneAdjustedTimestamp = jest
	.fn()
	.mockImplementation((date: string) => new Date(date).toISOString());
const mockTimezone = {
	name: 'timezone',
	value: 'mock-timezone',
	offset: '+1.30',
	searchIndex: '1',
};
jest.spyOn(timezoneHooks, 'useTimezone').mockReturnValue({
	timezone: mockTimezone,
	browserTimezone: mockTimezone,
	updateTimezone: jest.fn(),
	formatTimezoneAdjustedTimestamp: mockFormatTimezoneAdjustedTimestamp,
	isAdaptationEnabled: true,
	setIsAdaptationEnabled: jest.fn(),
});

const TEST_ALERT_1_NAME = 'Test Alert 1';
const TEST_ALERT_2_NAME = 'Test Alert 2';
const COLUMN_ALERT_NAME = 'Alert Name';
const COLUMN_FIRING_SINCE = 'Firing Since';

const allAlerts = [
	createAlert({
		name: TEST_ALERT_1_NAME,
		fingerprint: 'fingerprint-1',
		startsAt: '2021-01-01T00:00:00Z',
		status: {
			state: 'active',
			inhibitedBy: [],
			silencedBy: [],
		},
		labels: {
			severity: 'warning',
			alertname: TEST_ALERT_1_NAME,
		},
	}),
	createAlert({
		name: TEST_ALERT_2_NAME,
		fingerprint: 'fingerprint-2',
		startsAt: '2021-01-02T00:00:00Z',
		status: {
			state: 'active',
			inhibitedBy: [],
			silencedBy: [],
		},
		labels: {
			alertname: TEST_ALERT_2_NAME,
		},
	}),
];

describe('NoFilterTable', () => {
	it('should render the no filter table with correct columns', () => {
		render(<NoFilterTable allAlerts={allAlerts} selectedFilter={[]} />);
		expect(screen.getByText('Status')).toBeInTheDocument();
		expect(screen.getByText(COLUMN_ALERT_NAME)).toBeInTheDocument();
		expect(screen.getByText('Tags')).toBeInTheDocument();
		expect(screen.getByText('Severity')).toBeInTheDocument();
		expect(screen.getByText(COLUMN_FIRING_SINCE)).toBeInTheDocument();
	});

	it('should render the no filter table with correct rows', () => {
		render(<NoFilterTable allAlerts={allAlerts} selectedFilter={[]} />);
		const rows = screen.getAllByRole('row');
		expect(rows).toHaveLength(3); // 1 header row + 2 data rows
		const [headerRow, dataRow1, dataRow2] = rows;

		// Verify header row
		expect(headerRow).toHaveTextContent('Status');
		expect(headerRow).toHaveTextContent(COLUMN_ALERT_NAME);
		expect(headerRow).toHaveTextContent('Tags');
		expect(headerRow).toHaveTextContent('Severity');
		expect(headerRow).toHaveTextContent(COLUMN_FIRING_SINCE);

		// Verify 1st data row
		expect(dataRow1).toHaveTextContent(TEST_ALERT_1_NAME);
		expect(dataRow1).toHaveTextContent('warning');

		// Verify 2nd data row
		expect(dataRow2).toHaveTextContent(TEST_ALERT_2_NAME);
		expect(dataRow2).toHaveTextContent('-');
	});

	it('should sort the table by Alert Name when header is clicked', () => {
		render(<NoFilterTable allAlerts={allAlerts} selectedFilter={[]} />);

		const initialRows = screen.getAllByRole('row');
		expect(initialRows[1]).toHaveTextContent(TEST_ALERT_1_NAME);
		expect(initialRows[2]).toHaveTextContent(TEST_ALERT_2_NAME);

		const headers = screen.getAllByRole('columnheader');
		const alertNameHeader = headers.find((header) =>
			header.textContent?.includes(COLUMN_ALERT_NAME),
		);

		expect(alertNameHeader).toBeInTheDocument();

		// Click to sort ascending
		if (alertNameHeader) {
			fireEvent.click(alertNameHeader);
			const sortedRowsAsc = screen.getAllByRole('row');
			expect(sortedRowsAsc[1]).toHaveTextContent(TEST_ALERT_1_NAME);
			expect(sortedRowsAsc[2]).toHaveTextContent(TEST_ALERT_2_NAME);
		}
	});

	it('should sort the table by Severity when header is clicked', () => {
		const alertsWithDifferentSeverities = [
			createAlert({
				name: 'Alert A',
				fingerprint: 'fingerprint-a',
				startsAt: '2021-01-01T00:00:00Z',
				status: {
					state: 'active',
					inhibitedBy: [],
					silencedBy: [],
				},
				labels: {
					severity: 'critical',
					alertname: 'Alert A',
				},
			}),
			createAlert({
				name: 'Alert B',
				fingerprint: 'fingerprint-b',
				startsAt: '2021-01-02T00:00:00Z',
				status: {
					state: 'active',
					inhibitedBy: [],
					silencedBy: [],
				},
				labels: {
					severity: 'info',
					alertname: 'Alert B',
				},
			}),
		];

		render(
			<NoFilterTable
				allAlerts={alertsWithDifferentSeverities}
				selectedFilter={[]}
			/>,
		);

		const headers = screen.getAllByRole('columnheader');
		const severityHeader = headers.find((header) =>
			header.textContent?.includes('Severity'),
		);

		expect(severityHeader).toBeInTheDocument();

		if (severityHeader) {
			const initialRows = screen.getAllByRole('row');
			expect(initialRows[1]).toHaveTextContent('Alert A');
			expect(initialRows[2]).toHaveTextContent('Alert B');

			fireEvent.click(severityHeader);

			const sortedRows = screen.getAllByRole('row');
			expect(sortedRows[1]).toHaveTextContent('Alert B');
			expect(sortedRows[2]).toHaveTextContent('Alert A');
		}
	});
});
