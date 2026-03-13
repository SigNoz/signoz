import { Route } from 'react-router-dom';
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

// nuqs's useQueryState doesn't read from MemoryRouter, so we mock it to return
// controlled values via the `mockQueryState` map below.
const mockQueryState: Record<string, string | null> = {};

jest.mock('nuqs', () => ({
	...jest.requireActual('nuqs'),
	useQueryState: (key: string): [string | null, jest.Mock] => [
		mockQueryState[key] ?? null,
		jest.fn(),
	],
}));

// Wrap component in a Route so useParams can resolve dashboardId
function renderAtRoute(
	queryState: Record<string, string | null> = {},
): ReturnType<typeof render> {
	Object.assign(mockQueryState, queryState);
	return render(
		<Route path="/dashboard/:dashboardId/new">
			<DashboardWidget />
		</Route>,
		undefined,
		{ initialRoute: `/dashboard/${DASHBOARD_ID}/new` },
	);
}

beforeEach(() => {
	mockSafeNavigate.mockClear();
	Object.keys(mockQueryState).forEach((k) => delete mockQueryState[k]);
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
		server.use(
			rest.get(
				`http://localhost/api/v1/dashboards/${DASHBOARD_ID}`,
				(_req, res, ctx) => res(ctx.delay('infinite')),
			),
		);

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
