import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { buildDashboardUpdatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import PublicDashboardSettings from '../index';

const DASHBOARD_ID = 'dash-1';
const PUBLIC_URL = `http://localhost/api/v1/dashboards/${DASHBOARD_ID}/public`;

const dashboard = {
	id: DASHBOARD_ID,
	spec: { display: { name: 'D' }, panels: {}, layouts: [], variables: [] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

describe('PublicDashboard - AuthZ', () => {
	beforeEach(() => {
		// Not published yet — the tab offers Publish.
		server.use(
			rest.get(PUBLIC_URL, (_req, res, ctx) =>
				res(ctx.status(404), ctx.json({ status: 'error', error: {} })),
			),
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	// The backend gates the public-config writes on dashboard:update, so a
	// licensed editor can publish — this used to be admin-only in the UI.
	it('lets a non-admin holding update publish', async () => {
		server.use(setupAuthzAdmin());

		render(<PublicDashboardSettings dashboard={dashboard} />, undefined, {
			role: 'EDITOR',
		});

		await waitFor(() => {
			expect(screen.getByTestId('public-dashboard-publish')).toBeEnabled();
		});
	});

	it('disables publishing when update is denied', async () => {
		server.use(setupAuthzDeny(buildDashboardUpdatePermission(DASHBOARD_ID)));

		render(<PublicDashboardSettings dashboard={dashboard} />, undefined, {
			role: 'ADMIN',
		});

		await waitFor(() => {
			expect(screen.getByTestId('public-dashboard-publish')).toBeDisabled();
		});
	});
});
