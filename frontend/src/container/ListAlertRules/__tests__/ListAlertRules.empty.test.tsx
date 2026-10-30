import { safeNavigateMock } from '__tests__/safeNavigateMock';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { getCurrentNuqsSearchParams } from 'tests/nuqs-helpers';
import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — empty states', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('renders AlertsEmptyState when API returns no rules', async () => {
		const user = userEvent.setup({ delay: null });

		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json(listRulesV3Response([], req.url.searchParams)),
				),
			),
		);

		renderListAlertRules();

		await screen.findByText('No Alert rules yet.');
		expect(
			screen.getByText('Create an Alert Rule to get started'),
		).toBeInTheDocument();

		// New Alert Rule button is visible and triggers safeNavigate to ALERTS_NEW.
		await user.click(screen.getByTestId('add-alert'));
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('renders ErrorEmptyState when API returns 500; refresh triggers a refetch', async () => {
		const user = userEvent.setup({ delay: null });

		let callCount = 0;
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
				callCount += 1;
				if (callCount === 1) {
					return res(ctx.status(500), ctx.json({ status: 'error' }));
				}
				return res(
					ctx.status(200),
					ctx.json(listRulesV3Response(alertRulesFixture, req.url.searchParams)),
				);
			}),
		);

		renderListAlertRules();

		await screen.findByTestId('error-empty-state');

		await user.click(screen.getByTestId('error-refresh-button'));

		const rule = await screen.findByText('High CPU Alert');
		expect(rule).toBeInTheDocument();
	});

	it('renders NoResultsEmptyState when the query matches nothing; Clear Search resets it', async () => {
		const user = userEvent.setup({ delay: null });

		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json(
						listRulesV3Response(
							req.url.searchParams.has('query') ? [] : alertRulesFixture,
							req.url.searchParams,
						),
					),
				),
			),
		);

		renderListAlertRules({
			initialRoute: `/?query=${encodeURIComponent("name = 'missing'")}`,
		});

		await screen.findByTestId('no-results-empty-state');
		expect(screen.queryByText('No Alert rules yet.')).not.toBeInTheDocument();
		expect(screen.getByTestId('no-results-title')).toHaveTextContent(
			'No matching alert rules',
		);
		expect(screen.getByTestId('no-results-subtitle')).toHaveTextContent(
			'No alert rules match your search. Try adjusting your search criteria.',
		);

		await user.click(screen.getByTestId('no-results-clear-button'));

		await expect(
			screen.findByText('High CPU Alert'),
		).resolves.toBeInTheDocument();
		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().has('query')).toBe(false);
		});
	});

	it('renders NoResultsEmptyState when the states filter matches nothing; Clear Search resets it', async () => {
		const user = userEvent.setup({ delay: null });

		renderListAlertRules({ initialRoute: '/?states=nodata' });

		await screen.findByTestId('no-results-empty-state');

		await user.click(screen.getByTestId('no-results-clear-button'));

		await expect(
			screen.findByText('High CPU Alert'),
		).resolves.toBeInTheDocument();
		await waitFor(() => {
			expect(getCurrentNuqsSearchParams().has('states')).toBe(false);
		});
	});
});
