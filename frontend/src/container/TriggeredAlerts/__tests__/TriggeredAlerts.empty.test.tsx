import userEvent from '@testing-library/user-event';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';
import { triggeredAlertsFixture } from 'mocks-server/__mockdata__/triggered_alerts';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';

import { renderTriggeredAlerts } from './_helpers';

describe('TriggeredAlerts — empty / error states', () => {
	it('shows the "No alerts firing" empty state when the API returns []', async () => {
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [], status: 'success' })),
			),
		);

		renderTriggeredAlerts();

		await screen.findByText('No alerts firing');
		expect(
			screen.getByTestId('triggered-alerts-empty-create-button'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('triggered-alerts-empty-refresh-button'),
		).toBeInTheDocument();
	});

	it('navigates to ROUTES.ALERTS_NEW when "Create Alert Rule" is clicked', async () => {
		const user = userEvent.setup({ delay: null });
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [], status: 'success' })),
			),
		);

		renderTriggeredAlerts();

		await screen.findByText('No alerts firing');

		await user.click(screen.getByTestId('triggered-alerts-empty-create-button'));
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('shows ErrorEmptyState when the API returns 500', async () => {
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
				res(ctx.status(500)),
			),
		);

		renderTriggeredAlerts();

		await screen.findByTestId('error-empty-state');
		expect(screen.getByTestId('error-refresh-button')).toBeInTheDocument();
	});

	it('refetches on refresh button click after an initial error', async () => {
		let callCount = 0;
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) => {
				callCount += 1;
				if (callCount === 1) {
					return res(ctx.status(500));
				}
				return res(
					ctx.status(200),
					ctx.json({ data: triggeredAlertsFixture, status: 'success' }),
				);
			}),
		);

		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await screen.findByTestId('error-refresh-button');

		await user.click(screen.getByTestId('error-refresh-button'));

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);
	});

	it('shows NoResultsEmptyState when filters yield zero matches', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'this-matches-nothing-xyz');

		await screen.findByTestId('no-results-empty-state');
		expect(screen.getByTestId('no-results-title')).toHaveTextContent(
			'No matching alerts',
		);
		expect(screen.getByTestId('no-results-subtitle')).toHaveTextContent(
			'No alerts match your current filters. Try adjusting your search criteria.',
		);

		await user.click(screen.getByTestId('no-results-clear-button'));

		await waitFor(() =>
			expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
		);
		expect(
			(screen.getByTestId('triggered-alerts-search-input') as HTMLInputElement)
				.value,
		).toBe('');
	});
});
