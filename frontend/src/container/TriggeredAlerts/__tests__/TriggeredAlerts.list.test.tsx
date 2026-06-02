import { screen, waitFor } from 'tests/test-utils';

import { renderTriggeredAlerts } from './_helpers';

describe('TriggeredAlerts — list rendering', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('renders alerts from the API', async () => {
		renderTriggeredAlerts();

		await expect(
			screen.findByTestId('alert-row-fp-critical-1-name'),
		).resolves.toHaveTextContent('High CPU Usage');
		expect(screen.getByTestId('alert-row-fp-warning-1-name')).toHaveTextContent(
			'Memory Warning',
		);
		expect(screen.getByTestId('alert-row-fp-info-1-name')).toHaveTextContent(
			'Disk Slow',
		);
	});

	it('renders severity badges for alerts that have severity', async () => {
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(
				screen.getByTestId('alert-row-fp-critical-1-name'),
			).toBeInTheDocument(),
		);

		expect(
			screen.getByTestId('alert-row-fp-critical-1-severity'),
		).toHaveTextContent('critical');
		expect(
			screen.getByTestId('alert-row-fp-warning-1-severity'),
		).toHaveTextContent('warning');
		expect(screen.getByTestId('alert-row-fp-info-1-severity')).toHaveTextContent(
			'info',
		);
		expect(
			screen.getByTestId('alert-row-fp-noseverity-severity'),
		).toHaveTextContent('-');
	});

	it('renders status tags reflecting the alert state', async () => {
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(
				screen.getByTestId('alert-row-fp-critical-1-name'),
			).toBeInTheDocument(),
		);

		expect(
			screen.getByTestId('alert-row-fp-critical-1-status'),
		).toHaveTextContent('Firing');
		expect(screen.getByTestId('alert-row-fp-info-1-status')).toHaveTextContent(
			'Unprocessed',
		);
		expect(
			screen.getByTestId('alert-row-fp-suppressed-1-status'),
		).toHaveTextContent('Suppressed');
	});

	it('renders status badges with semantic colors', async () => {
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(
				screen.getByTestId('alert-row-fp-critical-1-status'),
			).toBeInTheDocument(),
		);

		expect(screen.getByTestId('alert-row-fp-critical-1-status')).toHaveAttribute(
			'data-color',
			'cherry',
		);
		expect(screen.getByTestId('alert-row-fp-info-1-status')).toHaveAttribute(
			'data-color',
			'forest',
		);
		expect(
			screen.getByTestId('alert-row-fp-critical-1-severity'),
		).toHaveAttribute('data-color', 'cherry');
		expect(screen.getByTestId('alert-row-fp-warning-1-severity')).toHaveAttribute(
			'data-color',
			'amber',
		);
	});

	it('renders the search input and filter comboboxes', async () => {
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(
				screen.getByTestId('alert-row-fp-critical-1-name'),
			).toBeInTheDocument(),
		);

		expect(
			screen.getByTestId('triggered-alerts-search-input'),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Search alerts by name'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('triggered-alerts-filter-combobox'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('triggered-alerts-groupby-combobox'),
		).toBeInTheDocument();
	});
});
