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
			'cherry',
		);
		expect(screen.getByTestId('alert-row-rule-2-state')).toHaveAttribute(
			'data-color',
			'amber',
		);
		expect(screen.getByTestId('alert-row-rule-3-state')).toHaveAttribute(
			'data-color',
			'forest',
		);
		expect(screen.getByTestId('alert-row-rule-4-state')).toHaveAttribute(
			'data-color',
			'vanilla',
		);
	});

	it('renders severity badges for rules with severity', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('alert-row-rule-1-severity')).toBeInTheDocument(),
		);

		expect(screen.getByTestId('alert-row-rule-1-severity')).toHaveTextContent(
			'critical',
		);
		expect(screen.getByTestId('alert-row-rule-2-severity')).toHaveTextContent(
			'warning',
		);
		expect(screen.getByTestId('alert-row-rule-3-severity')).toHaveTextContent(
			'info',
		);
		expect(screen.getByTestId('alert-row-rule-4-severity')).toHaveTextContent(
			'critical',
		);
		expect(screen.getByTestId('alert-row-rule-5-severity')).toHaveTextContent(
			'-',
		);
		expect(screen.getByTestId('alert-row-rule-1-severity')).toHaveAttribute(
			'data-color',
			'cherry',
		);
		expect(screen.getByTestId('alert-row-rule-2-severity')).toHaveAttribute(
			'data-color',
			'amber',
		);
	});

	it('renders header controls (search, columns, new alert)', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('alert-row-rule-1-name')).toBeInTheDocument(),
		);

		expect(screen.getByTestId('list-alerts-search-input')).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Search by Alert Name, Severity and Labels'),
		).toBeInTheDocument();
		expect(screen.getByTestId('alert-columns-button')).toBeInTheDocument();
		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /new alert/i }),
		).toBeInTheDocument();
	});
});
