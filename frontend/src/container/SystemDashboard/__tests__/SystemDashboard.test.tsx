import {
	DashboardtypesSourceDTO,
	type GetSystemDashboard200,
} from 'api/generated/services/sigNoz.schemas';
import { rest, server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';

import SystemDashboard from '../SystemDashboard';
import { createSystemDashboardHost } from '../systemDashboardHost';

const HOST = createSystemDashboardHost('test-overview', 'test-overview-id');
const ENDPOINT = '*/api/v2/dashboards/system/test-overview';

jest.mock('pages/DashboardPage/DashboardContainer', () => ({
	__esModule: true,
	default: ({
		dashboard,
		readOnly,
	}: {
		dashboard: { id: string; spec: { display: { name: string } } };
		readOnly: boolean;
	}): JSX.Element => (
		<div
			data-testid="dashboard-container"
			data-dashboard-id={dashboard.id}
			data-read-only={String(readOnly)}
		>
			{dashboard.spec.display.name}
		</div>
	),
}));

const response: GetSystemDashboard200 = {
	status: 'success',
	data: {
		orgId: 'org',
		locked: true,
		name: 'signoz---test-overview',
		schemaVersion: 'v6',
		source: DashboardtypesSourceDTO.system,
		tags: [],
		spec: {
			display: { name: 'Test overview' },
			variables: [],
			panels: {},
			layouts: [],
		},
	},
};

describe('SystemDashboard', () => {
	afterEach(() => server.resetHandlers());

	it('mounts the named system dashboard read-only under the host id', async () => {
		server.use(rest.get(ENDPOINT, (_req, res, ctx) => res(ctx.json(response))));

		render(<SystemDashboard host={HOST} />);

		const container = await screen.findByTestId('dashboard-container');
		expect(container).toHaveTextContent('Test overview');
		expect(container).toHaveAttribute('data-dashboard-id', 'test-overview-id');
		expect(container).toHaveAttribute('data-read-only', 'true');
	});

	it('shows why the dashboard failed to load', async () => {
		server.use(
			rest.get(ENDPOINT, (_req, res, ctx) =>
				res(
					ctx.status(404),
					ctx.json({
						status: 'error',
						error: { code: 'not_found', message: 'not provisioned' },
					}),
				),
			),
		);

		render(<SystemDashboard host={HOST} />);

		await expect(
			screen.findByTestId('system-dashboard-error'),
		).resolves.toHaveTextContent('not provisioned');
	});
});
