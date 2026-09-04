import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	setupAuthzAdmin,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';

import DashboardSettings from '../index';

const DASHBOARD_ID = 'dash-1';

const dashboard = {
	id: DASHBOARD_ID,
	spec: { display: { name: 'D' }, panels: {}, layouts: [], variables: [] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

let isCloudUser = true;
jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: (): {
		isCloudUser: boolean;
		isEnterpriseSelfHostedUser: boolean;
	} => ({ isCloudUser, isEnterpriseSelfHostedUser: false }),
}));

describe('DashboardSettings - AuthZ', () => {
	beforeEach(() => {
		isCloudUser = true;
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it('renders a trigger per tab', async () => {
		server.use(setupAuthzAdmin());

		render(<DashboardSettings dashboard={dashboard} />);

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
		});
		expect(screen.getByRole('tab', { name: /Variables/ })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: /Publish/ })).toBeInTheDocument();
	});

	// The triggers used to be rendered from the TabKeys enum rather than the
	// items list, so Publish appeared on OSS and landed on an empty body.
	it('omits the Publish tab when public dashboards are unavailable', async () => {
		isCloudUser = false;
		server.use(setupAuthzAdmin());

		render(<DashboardSettings dashboard={dashboard} />);

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
		});
		expect(
			screen.queryByRole('tab', { name: /Publish/ }),
		).not.toBeInTheDocument();
	});

	// Reading the publish config only needs read; the writes inside gate on update.
	it('keeps the Publish tab reachable for a non-admin', async () => {
		server.use(setupAuthzDenyAll());

		render(<DashboardSettings dashboard={dashboard} />);

		await waitFor(() => {
			expect(screen.getByRole('tab', { name: /Publish/ })).toBeInTheDocument();
		});
		expect(screen.getByRole('tab', { name: /Publish/ })).toBeEnabled();
	});
});
