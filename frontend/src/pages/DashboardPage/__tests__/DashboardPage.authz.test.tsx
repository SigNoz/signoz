import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
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

	// The list is collection-scoped, so a row the caller cannot read is expected —
	// opening it should explain itself, not read as a failure.
	it('explains a read denial instead of showing a generic load error', async () => {
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
			screen.findByText(/is not authorized to perform/),
		).resolves.toBeInTheDocument();
		expect(
			screen.getByText(`read:dashboard:${DASHBOARD_ID}`),
		).toBeInTheDocument();
		expect(
			screen.queryByText('Failed to load dashboard'),
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
				screen.queryByText(/is not authorized to perform/),
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
			screen.queryByText(/is not authorized to perform/),
		).not.toBeInTheDocument();
	});
});
