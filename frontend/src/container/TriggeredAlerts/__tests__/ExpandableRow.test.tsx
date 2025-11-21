import { render, within } from '@testing-library/react';
import * as timezoneHooks from 'providers/Timezone';

import ExpandableRow from '../FilteredTable/ExapandableRow';
import { createAlert } from './utils';

const mockFormatTimezoneAdjustedTimestamp = jest
	.fn()
	.mockImplementation((date: Date) => date.toISOString());
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

const TEST_ALERT_NAME = 'Test Alert';

const allAlerts = [
	createAlert({
		fingerprint: 'alert-no-labels',
		name: TEST_ALERT_NAME,
	}),
	createAlert({
		fingerprint: 'alert-with-labels',
		name: 'Test Alert with Labels',
		startsAt: '2021-02-03T00:00:00Z',
		status: {
			inhibitedBy: [],
			silencedBy: [],
			state: 'active',
		},
		labels: {
			severity: 'warning',
			alertname: 'Test Label',
		},
	}),
];

describe('ExpandableRow', () => {
	it('should render the expandable row with both labels and no labels', () => {
		const { container } = render(<ExpandableRow allAlerts={allAlerts} />);
		const rows = container.querySelectorAll('.ant-card');

		expect(rows).toHaveLength(2);

		const [rowWithoutLabels, rowWithLabels] = rows;
		const rowWithoutLabelsWithin = within(rowWithoutLabels as HTMLElement);
		const rowWithLabelsWithin = within(rowWithLabels as HTMLElement);

		expect(
			rowWithoutLabelsWithin.getByText('Unknown Status'),
		).toBeInTheDocument();
		expect(
			rowWithoutLabelsWithin.getByText('2021-01-03T00:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			rowWithoutLabelsWithin.queryByText(TEST_ALERT_NAME),
		).not.toBeInTheDocument();
		expect(rowWithoutLabelsWithin.queryByText('warning')).not.toBeInTheDocument();
		expect(
			rowWithoutLabelsWithin.queryByText(`alertname:${TEST_ALERT_NAME}`),
		).not.toBeInTheDocument();

		expect(rowWithLabelsWithin.getByText('Firing')).toBeInTheDocument();
		expect(rowWithLabelsWithin.getByText('Test Label')).toBeInTheDocument();
		expect(rowWithLabelsWithin.getByText('warning')).toBeInTheDocument();
		expect(
			rowWithLabelsWithin.getByText('2021-02-03T00:00:00.000Z'),
		).toBeInTheDocument();
		expect(
			rowWithLabelsWithin.getByText(`alertname:Test Label`),
		).toBeInTheDocument();

		expect(mockFormatTimezoneAdjustedTimestamp).toHaveBeenCalledTimes(2);
	});
});
