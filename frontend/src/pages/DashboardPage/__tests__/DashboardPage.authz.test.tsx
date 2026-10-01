import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';

import DashboardPage from '../DashboardPage';

const DASHBOARD_ID = 'dash-1';
const DASHBOARD_URL = `http://localhost/api/v2/dashboards/${DASHBOARD_ID}`;

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): { dashboardId: string } => ({ dashboardId: DASHBOARD_ID }),
}));

describe('DashboardPage - AuthZ', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	// The list is collection-scoped, so an unreadable row is expected, not a failure.
	it('blocks the page when the read check is denied', async () => {
		server.use(setupAuthzDenyAll());

		render(<DashboardPage />);

		await expect(
			screen.findByText('Uh-oh! You are not authorized'),
		).resolves.toBeInTheDocument();
		expect(
			screen.getByText(`read:dashboard:${DASHBOARD_ID}`),
		).toBeInTheDocument();
		expect(
			screen.queryByText('Failed to load dashboard'),
		).not.toBeInTheDocument();
	});

	// The check is the only authority; a 403 from the GET is an API failure.
	it('shows the generic load error for a 403 from the dashboard request', async () => {
		server.use(
			rest.get(DASHBOARD_URL, (_req, res, ctx) =>
				res(
					ctx.status(403),
					ctx.json({
						status: 'error',
						error: {
							type: 'forbidden',
							code: 'authz_forbidden',
							message: 'user/x is not authorized to perform dashboard:read',
						},
					}),
				),
			),
		);

		render(<DashboardPage />);

		await expect(
			screen.findByText('Failed to load dashboard'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByText('Uh-oh! You are not authorized'),
		).not.toBeInTheDocument();
	});

	// The page must not paint controls and then disable them once the check lands.
	it('holds the page on the spinner until the permission check resolves', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
			rest.get(DASHBOARD_URL, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							id: DASHBOARD_ID,
							spec: {
								display: { name: 'Checkout' },
								panels: {},
								layouts: [],
								variables: [],
							},
						},
					}),
				),
			),
		);

		render(<DashboardPage />);

		// Dashboard data has arrived, but the tree stays unmounted.
		await expect(screen.findByLabelText('loading')).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('show-drawer')).not.toBeInTheDocument();
		expect(screen.queryByTestId('add-panel-header')).not.toBeInTheDocument();
	});

	// An authz outage must not make every dashboard look forbidden.
	it('renders the dashboard when the permission check itself fails', async () => {
		server.use(
			rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) => res(ctx.status(500))),
			rest.get(DASHBOARD_URL, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							id: DASHBOARD_ID,
							spec: {
								display: { name: 'Checkout' },
								panels: {},
								layouts: [],
								variables: [],
							},
						},
					}),
				),
			),
		);

		render(<DashboardPage />);

		await waitFor(() => {
			expect(
				screen.queryByText('Uh-oh! You are not authorized'),
			).not.toBeInTheDocument();
		});
	});

	it('still shows the generic error for a server failure', async () => {
		server.use(
			rest.get(DASHBOARD_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error', error: {} })),
			),
		);

		render(<DashboardPage />);

		await expect(
			screen.findByText('Failed to load dashboard'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByText('Uh-oh! You are not authorized'),
		).not.toBeInTheDocument();
	});
});
