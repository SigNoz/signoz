import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';
import { triggeredAlertsFixture } from 'mocks-server/__mockdata__/triggered_alerts';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { act, screen, userEvent } from 'tests/test-utils';

import {
	getTriggeredAlertRowTestId,
	renderTriggeredAlerts,
	search,
	SEARCH_SETTLE_MS,
} from './_helpers';

const HIGH_CPU_NAME = getTriggeredAlertRowTestId('fp-critical-1', 'name');
const NO_MATCH_SEARCH = 'this-matches-nothing-xyz';

describe('TriggeredAlerts — empty / error states', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

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
		const user = userEvent.setup();
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

		const user = userEvent.setup();
		renderTriggeredAlerts();

		await screen.findByTestId('error-refresh-button');

		await user.click(screen.getByTestId('error-refresh-button'));

		await expect(screen.findByTestId(HIGH_CPU_NAME)).resolves.toHaveTextContent(
			'High CPU Usage',
		);
	});

	it('shows NoResultsEmptyState when filters yield zero matches', async () => {
		renderTriggeredAlerts();

		await screen.findByTestId(HIGH_CPU_NAME);

		await search(NO_MATCH_SEARCH);

		expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument();
		expect(screen.getByTestId('no-results-title')).toHaveTextContent(
			'No matching alerts',
		);
		expect(screen.getByTestId('no-results-subtitle')).toHaveTextContent(
			'No alerts match your current filters. Try adjusting your search criteria.',
		);
	});

	it('clears the search from the no-results state', async () => {
		renderTriggeredAlerts({ initialRoute: `/?search=${NO_MATCH_SEARCH}` });

		await screen.findByTestId('no-results-empty-state');

		jest.useFakeTimers();
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		await user.click(screen.getByTestId('no-results-clear-button'));
		act(() => {
			jest.advanceTimersByTime(SEARCH_SETTLE_MS);
		});

		expect(screen.getByTestId(HIGH_CPU_NAME)).toHaveTextContent('High CPU Usage');
		expect(screen.getByTestId('triggered-alerts-search-input-field')).toHaveValue(
			'',
		);
	});
});
