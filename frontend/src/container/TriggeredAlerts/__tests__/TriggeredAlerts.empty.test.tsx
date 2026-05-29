import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { triggeredAlertsFixture } from 'mocks-server/__mockdata__/triggered_alerts';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { cleanup, screen, waitFor } from 'tests/test-utils';

import { flushNuqsUrl, renderTriggeredAlerts, resetUrl } from './_helpers';

const safeNavigateMock = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: safeNavigateMock })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('TriggeredAlerts — empty / error states', () => {
	jest.setTimeout(15000);

	beforeEach(() => {
		resetUrl();
	});

	afterEach(async () => {
		cleanup();
		await flushNuqsUrl();
		resetUrl();
	});

	it('shows the "No alerts firing" empty state when the API returns []', async () => {
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [], status: 'success' })),
			),
		);

		renderTriggeredAlerts();

		await screen.findByText('No alerts firing', {}, { timeout: 5000 });
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

		await screen.findByText('No alerts firing', {}, { timeout: 5000 });

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

		await screen.findByTestId('error-empty-state', {}, { timeout: 5000 });
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

		await screen.findByTestId('error-refresh-button', {}, { timeout: 5000 });

		await user.click(screen.getByTestId('error-refresh-button'));

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);
	});

	it('shows NoResultsEmptyState when filters yield zero matches', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		const input = screen.getByTestId('triggered-alerts-search-input');
		await user.type(input, 'this-matches-nothing-xyz');

		await screen.findByTestId('no-results-empty-state', {}, { timeout: 5000 });

		await user.click(screen.getByTestId('no-results-clear-button'));

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);
		expect(
			(screen.getByTestId('triggered-alerts-search-input') as HTMLInputElement)
				.value,
		).toBe('');
	});
});
