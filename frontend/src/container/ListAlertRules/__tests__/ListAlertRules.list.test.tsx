import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — list rendering', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('renders alert rules from API', async () => {
		renderListAlertRules();

		await expect(
			screen.findByTestId('alert-row-rule-1-name'),
		).resolves.toHaveTextContent('High CPU Alert');
		expect(screen.getByTestId('alert-row-rule-2-name')).toHaveTextContent(
			'Memory Pending Alert',
		);
		expect(screen.getByTestId('alert-row-rule-3-name')).toHaveTextContent(
			'Healthy Alert',
		);
		expect(screen.getByTestId('alert-row-rule-4-name')).toHaveTextContent(
			'Disabled Alert',
		);
	});

	it('renders state badges via STATE_CONFIG mapping', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('alert-row-rule-1-state')).toBeInTheDocument(),
		);

		expect(screen.getByTestId('alert-row-rule-1-state')).toHaveTextContent(
			'Firing',
		);
		expect(screen.getByTestId('alert-row-rule-2-state')).toHaveTextContent(
			'Pending',
		);
		expect(screen.getByTestId('alert-row-rule-3-state')).toHaveTextContent('OK');
		expect(screen.getByTestId('alert-row-rule-4-state')).toHaveTextContent(
			'Disabled',
		);
		expect(screen.getByTestId('alert-row-rule-5-state')).toHaveTextContent('OK');
	});

	it('renders state badges with semantic colors', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('alert-row-rule-1-state')).toBeInTheDocument(),
		);

		expect(screen.getByTestId('alert-row-rule-1-state')).toHaveAttribute(
			'data-color',
			'danger',
		);
		expect(screen.getByTestId('alert-row-rule-2-state')).toHaveAttribute(
			'data-color',
			'warning',
		);
		expect(screen.getByTestId('alert-row-rule-3-state')).toHaveAttribute(
			'data-color',
			'success',
		);
		expect(screen.getByTestId('alert-row-rule-4-state')).toHaveAttribute(
			'data-color',
			'secondary',
		);
	});

	it('renders a badge per threshold under the Thresholds column', async () => {
		renderListAlertRules();

		await expect(
			screen.findByTestId('alert-row-rule-1-severity'),
		).resolves.toHaveTextContent('criticalwarning');
		expect(screen.getByTitle('Thresholds')).toBeInTheDocument();
		expect(
			screen.getByTestId('alert-row-rule-1-severity-critical'),
		).toHaveAttribute('data-color', 'danger');
		expect(
			screen.getByTestId('alert-row-rule-1-severity-warning'),
		).toHaveAttribute('data-color', 'warning');
		expect(screen.getByTestId('alert-row-rule-3-severity-info')).toHaveAttribute(
			'data-color',
			'primary',
		);
		expect(screen.getByTestId('alert-row-rule-5-severity')).toHaveTextContent(
			'-',
		);
	});

	it('shows the severity label among the labels', async () => {
		renderListAlertRules();

		await expect(
			screen.findByTestId('alert-row-rule-1-labels'),
		).resolves.toHaveTextContent('severity: critical');
	});

	it('renders header controls (search, states, columns, new alert)', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('alert-row-rule-1-name')).toBeInTheDocument(),
		);

		expect(screen.getByTestId('alert-rules-list-search')).toBeInTheDocument();
		expect(
			screen.getByTestId('alert-rules-list-search-submit'),
		).toBeInTheDocument();
		expect(screen.getByTestId('alert-rules-filter-states')).toBeInTheDocument();
		expect(screen.getByTestId('alert-columns-button')).toBeInTheDocument();
		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /new alert/i }),
		).toBeInTheDocument();
	});
});
