import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';

import DashboardPageV2 from '../DashboardPageV2';

const DASHBOARD_ID = 'dash-1';
const DASHBOARD_URL = `http://localhost/api/v2/dashboards/${DASHBOARD_ID}`;

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useParams: (): { dashboardId: string } => ({ dashboardId: DASHBOARD_ID }),
}));

describe('DashboardPageV2 - AuthZ', () => {
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

		render(<DashboardPageV2 />);

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

	it('still shows the generic error for a server failure', async () => {
		server.use(
			rest.get(DASHBOARD_URL, (_req, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error', error: {} })),
			),
		);

		render(<DashboardPageV2 />);

		await expect(
			screen.findByText('Failed to load dashboard'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByText(/is not authorized to perform/),
		).not.toBeInTheDocument();
	});
});
