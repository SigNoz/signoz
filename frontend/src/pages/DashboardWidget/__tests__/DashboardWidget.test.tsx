import { Route } from 'react-router-dom';
import * as getDashboardModule from 'api/v1/dashboards/id/get';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { rest, server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import DashboardWidget from '../index';

const DASHBOARD_ID = 'dash-1';
const WIDGET_ID = 'widget-abc';

const mockDashboardResponse = {
	status: 'success',
	data: {
		id: DASHBOARD_ID,
		createdAt: '2024-01-01T00:00:00Z',
		createdBy: 'test',
		updatedAt: '2024-01-01T00:00:00Z',
		updatedBy: 'test',
		isLocked: false,
		data: {
			collapsableRowsMigrated: true,
			description: '',
			name: '',
			panelMap: {},
			tags: [],
			title: 'Test Dashboard',
			uploadedGrafana: false,
			uuid: '',
			version: '',
			variables: {},
			widgets: [],
			layout: [],
		},
	},
};

const mockSafeNavigate = jest.fn();

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

jest.mock('container/NewWidget', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="new-widget">NewWidget</div>,
}));

// Wrap component in a Route so useParams can resolve dashboardId.
// Query params are passed via the URL so useUrlQuery (react-router) can read them.
function renderAtRoute(
	queryState: Record<string, string | null> = {},
): ReturnType<typeof render> {
	const params = new URLSearchParams();
	Object.entries(queryState).forEach(([k, v]) => {
		if (v !== null) {
			params.set(k, v);
		}
	});
	const search = params.toString() ? `?${params.toString()}` : '';
	return render(
		<Route path="/dashboard/:dashboardId/new">
			<DashboardWidget />
		</Route>,
		undefined,
		{ initialRoute: `/dashboard/${DASHBOARD_ID}/new${search}` },
	);
}

beforeEach(() => {
	mockSafeNavigate.mockClear();
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('DashboardWidget', () => {
	it('redirects to dashboard when widgetId is missing', async () => {
		renderAtRoute({ graphType: PANEL_TYPES.TIME_SERIES });

		await waitFor(() => {
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		const [navigatedTo] = mockSafeNavigate.mock.calls[0];
		expect(navigatedTo).toContain(`/dashboard/${DASHBOARD_ID}`);
	});

	it('redirects to dashboard when graphType is missing', async () => {
		renderAtRoute({ widgetId: WIDGET_ID });

		await waitFor(() => {
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		const [navigatedTo] = mockSafeNavigate.mock.calls[0];
		expect(navigatedTo).toContain(`/dashboard/${DASHBOARD_ID}`);
	});

	it('shows spinner while dashboard is loading', () => {
		// Spy instead of MSW delay('infinite') to avoid leaving an open network handle.
		jest
			.spyOn(getDashboardModule, 'default')
			.mockReturnValue(new Promise(() => {}));

		renderAtRoute({ widgetId: WIDGET_ID, graphType: PANEL_TYPES.TIME_SERIES });

		expect(screen.getByRole('img', { name: 'loading' })).toBeInTheDocument();
	});

	it('shows error message when dashboard fetch fails', async () => {
		server.use(
			rest.get(
				`http://localhost/api/v1/dashboards/${DASHBOARD_ID}`,
				(_req, res, ctx) => res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);

		renderAtRoute({ widgetId: WIDGET_ID, graphType: PANEL_TYPES.TIME_SERIES });

		await waitFor(() => {
			expect(screen.getByText('Something went wrong')).toBeInTheDocument();
		});
	});

	it('renders NewWidget when dashboard loads successfully', async () => {
		server.use(
			rest.get(
				`http://localhost/api/v1/dashboards/${DASHBOARD_ID}`,
				(_req, res, ctx) => res(ctx.status(200), ctx.json(mockDashboardResponse)),
			),
		);

		renderAtRoute({ widgetId: WIDGET_ID, graphType: PANEL_TYPES.TIME_SERIES });

		await waitFor(() => {
			expect(screen.getByTestId('new-widget')).toBeInTheDocument();
		});
	});
});
