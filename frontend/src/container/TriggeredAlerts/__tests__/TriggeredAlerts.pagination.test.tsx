import { triggeredAlertsPaginationFixture } from 'mocks-server/__mockdata__/triggered_alerts';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';
import { NO_DELAY_USER_EVENT } from 'tests/noDelayUserEvent';
import { getCurrentNuqsQueryString } from 'tests/nuqs-helpers';

import { renderTriggeredAlerts } from './_helpers';

function usePaginationHandler(): void {
	server.use(
		rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					data: triggeredAlertsPaginationFixture,
					status: 'success',
				}),
			),
		),
	);
}

describe('TriggeredAlerts — pagination', () => {
	// Default sort is duration ascending = newest startsAt first. Fixture indices
	// 0..14 use startsAt 2023-10-01..15, so index 14 (newest) appears first and
	// index 0 (oldest) appears last. Page 1 (limit 10) = items 14..5. Page 2 = 4..0.

	it('shows the first 10 rows on page 1 by default', async () => {
		usePaginationHandler();
		renderTriggeredAlerts();

		await screen.findByText('Pag Alert 14');

		expect(screen.getByText('Pag Alert 5')).toBeInTheDocument();
		expect(screen.queryByText('Pag Alert 4')).not.toBeInTheDocument();
		expect(screen.queryByText('Pag Alert 0')).not.toBeInTheDocument();
	});

	it('renders a "page 2" pagination button reflecting total=15 with pageSize=10', async () => {
		usePaginationHandler();
		renderTriggeredAlerts();

		await screen.findByText('Pag Alert 14');

		const nav = screen.getByRole('navigation');
		expect(
			within(nav).getByRole('button', { name: 'Page 2' }),
		).toBeInTheDocument();
	});

	it('navigates to page 2 and shows the next batch of alerts', async () => {
		usePaginationHandler();
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		renderTriggeredAlerts();

		await screen.findByText('Pag Alert 14');

		const nav = screen.getByRole('navigation');
		await user.click(within(nav).getByRole('button', { name: 'Page 2' }));

		await waitFor(() =>
			expect(screen.getByText('Pag Alert 0')).toBeInTheDocument(),
		);
		expect(screen.getByText('Pag Alert 4')).toBeInTheDocument();
		expect(screen.queryByText('Pag Alert 14')).not.toBeInTheDocument();
		await waitFor(() => expect(getCurrentNuqsQueryString()).toContain('page=2'));
	});
});
