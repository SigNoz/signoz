import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { fireEvent, screen } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — empty states', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('renders AlertsEmptyState when API returns no rules', async () => {
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [], status: 'success' })),
			),
		);

		renderListAlertRules();

		await screen.findByText('No Alert rules yet.');
		expect(
			screen.getByText('Create an Alert Rule to get started'),
		).toBeInTheDocument();

		// New Alert Rule button is visible and triggers safeNavigate to ALERTS_NEW.
		fireEvent.click(screen.getByTestId('add-alert'));
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('renders ErrorEmptyState when API returns 500; refresh triggers a refetch', async () => {
		let callCount = 0;
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) => {
				callCount += 1;
				if (callCount === 1) {
					return res(ctx.status(500), ctx.json({ status: 'error' }));
				}
				return res(
					ctx.status(200),
					ctx.json({ data: alertRulesFixture, status: 'success' }),
				);
			}),
		);

		renderListAlertRules();

		await screen.findByTestId('error-empty-state');

		fireEvent.click(screen.getByTestId('error-refresh-button'));

		const rule = await screen.findByText('High CPU Alert');
		expect(rule).toBeInTheDocument();
	});

	it('renders NoResultsEmptyState when search yields no match; Clear Search resets', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		fireEvent.change(screen.getByTestId('list-alerts-search-input'), {
			target: { value: 'totally-not-found' },
		});

		await screen.findByTestId('no-results-empty-state');
		expect(screen.getByTestId('no-results-title')).toHaveTextContent(
			'No matching alert rules',
		);
		expect(screen.getByTestId('no-results-subtitle')).toHaveTextContent(
			'No alert rules match your search. Try adjusting your search criteria.',
		);

		fireEvent.click(screen.getByTestId('no-results-clear-button'));

		const rule = await screen.findByText('High CPU Alert');
		expect(rule).toBeInTheDocument();
	});
});
