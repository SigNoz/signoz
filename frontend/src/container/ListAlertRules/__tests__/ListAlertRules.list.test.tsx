import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — list rendering', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('asks for rules sorted by status, firing first, by default', async () => {
		const requests: URLSearchParams[] = [];
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json(listRulesV3Response(alertRulesFixture, req.url.searchParams)),
				);
			}),
		);
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		expect(requests[0].get('sort')).toBe('state');
		expect(requests[0].get('order')).toBe('desc');
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
			'danger',
		);
		expect(screen.getByTestId('alert-row-rule-2-severity')).toHaveAttribute(
			'data-color',
			'warning',
		);
	});

	it('renders header controls (search, columns, new alert) and no state filter', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('alert-row-rule-1-name')).toBeInTheDocument(),
		);

		expect(screen.getByTestId('alert-rules-list-search')).toBeInTheDocument();
		expect(
			screen.getByTestId('alert-rules-list-search-submit'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('alert-rules-filter-states'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('alert-columns-button')).toBeInTheDocument();
		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /new alert/i }),
		).toBeInTheDocument();
	});
});
