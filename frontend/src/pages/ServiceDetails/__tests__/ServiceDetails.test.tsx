import ROUTES from 'constants/routes';
import type { SystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';
import { rest, server } from 'mocks-server/server';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { render, screen, userEvent } from 'tests/test-utils';

import ServiceDetails from '../ServiceDetails';

jest.mock('container/SystemDashboard/SystemDashboard', () => ({
	__esModule: true,
	default: ({ host }: { host: SystemDashboardHost }): JSX.Element => (
		<div data-testid="system-dashboard" data-name={host.name} />
	),
}));

const APDEX = '*/api/v1/settings/apdex';

function seededVariables(): Record<string, string> {
	return JSON.parse(
		new URLSearchParams(window.location.search).get('variables') ?? '{}',
	);
}

describe('ServiceDetails', () => {
	beforeEach(() => {
		server.use(
			rest.get(APDEX, (_req, res, ctx) =>
				res(
					ctx.json({
						status: 'success',
						data: [
							{ servicename: 'checkout api', threshold: 0.5, excludeStatusCode: '' },
						],
					}),
				),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
		window.history.replaceState(null, '', '/');
	});

	it('names the service from the route and opens the overview dashboard', async () => {
		render(<ServiceDetails />, undefined, {
			initialRoute: '/services/checkout%20api',
			routePath: ROUTES.SERVICE_METRICS,
		});

		await expect(
			screen.findByTestId('system-dashboard'),
		).resolves.toHaveAttribute('data-name', 'services-overview');
		expect(screen.getByTestId('service-details-name')).toHaveTextContent(
			'checkout api',
		);
	});

	it('goes back to the services list from the breadcrumb', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<ServiceDetails />, undefined, {
			initialRoute: '/services/checkout%20api',
			routePath: ROUTES.SERVICE_METRICS,
		});

		await user.click(
			await screen.findByTestId('service-details-breadcrumb-services'),
		);

		expect(safeNavigateMock).toHaveBeenCalledWith(ROUTES.APPLICATION);
	});

	it('seeds the service and its Apdex threshold before the dashboard mounts', async () => {
		render(<ServiceDetails />, undefined, {
			initialRoute: '/services/checkout%20api',
			routePath: ROUTES.SERVICE_METRICS,
		});

		await screen.findByTestId('system-dashboard');

		expect(seededVariables()).toStrictEqual({
			service_name: 'checkout api',
			apdex_threshold_ns: '500000000',
			apdex_tolerated_ns: '2000000000',
		});
	});

	it('opens the tab named in the URL', async () => {
		window.history.replaceState(
			null,
			'',
			'/services/checkout%20api?tab=DB_CALL_METRICS',
		);
		render(<ServiceDetails />, undefined, {
			initialRoute: '/services/checkout%20api?tab=DB_CALL_METRICS',
			routePath: ROUTES.SERVICE_METRICS,
		});

		await expect(
			screen.findByTestId('system-dashboard'),
		).resolves.toHaveAttribute('data-name', 'services-db-calls');
	});
});
