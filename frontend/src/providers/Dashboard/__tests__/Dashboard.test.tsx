/* eslint-disable sonarjs/no-duplicate-string */
import { render, waitFor } from '@testing-library/react';
import getDashboard from 'api/v1/dashboards/id/get';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { DashboardProvider, useDashboard } from 'providers/Dashboard/Dashboard';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the dashboard API
jest.mock('api/v1/dashboards/id/get');
jest.mock('api/v1/dashboards/id/lock');
const mockGetDashboard = jest.mocked(getDashboard);

// Mock useRouteMatch to simulate different route scenarios
const mockUseRouteMatch = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useRouteMatch: (): any => mockUseRouteMatch(),
}));

// Mock other dependencies
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: jest.fn(),
	}),
}));

// Mock only the essential dependencies for Dashboard provider
jest.mock('providers/App/App', () => ({
	useAppContext: (): any => ({
		isLoggedIn: true,
		user: { email: 'test@example.com', role: 'ADMIN' },
	}),
}));

jest.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): any => ({ showErrorModal: jest.fn() }),
}));

jest.mock('react-redux', () => ({
	useSelector: jest.fn(() => ({
		selectedTime: 'GLOBAL_TIME',
		minTime: '2023-01-01T00:00:00Z',
		maxTime: '2023-01-01T01:00:00Z',
	})),
	useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

function TestComponent(): JSX.Element {
	const { dashboardResponse, dashboardId } = useDashboard();

	return (
		<div>
			<div data-testid="dashboard-id">{dashboardId}</div>
			<div data-testid="query-status">{dashboardResponse.status}</div>
			<div data-testid="is-loading">{dashboardResponse.isLoading.toString()}</div>
			<div data-testid="is-fetching">
				{dashboardResponse.isFetching.toString()}
			</div>
		</div>
	);
}

// Helper to create a test query client
function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				refetchOnWindowFocus: false,
			},
		},
	});
}

// Helper to render with dashboard provider
function renderWithDashboardProvider(
	initialRoute = '/dashboard/test-dashboard-id',
	routeMatchParams?: { dashboardId: string } | null,
): any {
	const queryClient = createTestQueryClient();

	// Mock the route match
	mockUseRouteMatch.mockReturnValue(
		routeMatchParams
			? {
					path: ROUTES.DASHBOARD,
					url: `/dashboard/${routeMatchParams.dashboardId}`,
					isExact: true,
					params: routeMatchParams,
			  }
			: null,
	);

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialRoute]}>
				<DashboardProvider>
					<TestComponent />
				</DashboardProvider>
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('Dashboard Provider - Query Key with Route Params', () => {
	const DASHBOARD_ID = 'test-dashboard-id';
	const mockDashboardData = {
		httpStatusCode: 200,
		data: {
			id: DASHBOARD_ID,
			title: 'Test Dashboard',
			description: 'Test Description',
			tags: [],
			data: {
				title: 'Test Dashboard',
				layout: [],
				widgets: [],
				variables: {},
				panelMap: {},
			},
			createdAt: '2023-01-01T00:00:00Z',
			updatedAt: '2023-01-01T00:00:00Z',
			createdBy: 'test-user',
			updatedBy: 'test-user',
			locked: false,
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetDashboard.mockResolvedValue(mockDashboardData);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Query Key Behavior', () => {
		it('should include route params in query key when on dashboard page', async () => {
			const dashboardId = 'test-dashboard-id';
			renderWithDashboardProvider(`/dashboard/${dashboardId}`, { dashboardId });

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: dashboardId });
			});

			// Verify the query was called with the correct parameters
			expect(mockGetDashboard).toHaveBeenCalledTimes(1);
		});

		it('should refetch when route params change', async () => {
			const initialDashboardId = 'initial-dashboard-id';
			const newDashboardId = 'new-dashboard-id';

			// First render with initial dashboard ID
			const { rerender } = renderWithDashboardProvider(
				`/dashboard/${initialDashboardId}`,
				{
					dashboardId: initialDashboardId,
				},
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: initialDashboardId });
			});

			// Change route params to simulate navigation
			mockUseRouteMatch.mockReturnValue({
				path: ROUTES.DASHBOARD,
				url: `/dashboard/${newDashboardId}`,
				isExact: true,
				params: { dashboardId: newDashboardId },
			});

			// Rerender with new route
			rerender(
				<QueryClientProvider client={createTestQueryClient()}>
					<MemoryRouter initialEntries={[`/dashboard/${newDashboardId}`]}>
						<DashboardProvider>
							<TestComponent />
						</DashboardProvider>
					</MemoryRouter>
				</QueryClientProvider>,
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: newDashboardId });
			});

			// Should have been called twice - once for each dashboard ID
			expect(mockGetDashboard).toHaveBeenCalledTimes(2);
		});

		it('should not fetch when not on dashboard page', () => {
			// Mock no route match (not on dashboard page)
			mockUseRouteMatch.mockReturnValue(null);

			renderWithDashboardProvider('/some-other-page', null);

			// Should not call the API
			expect(mockGetDashboard).not.toHaveBeenCalled();
		});

		it('should handle undefined route params gracefully', async () => {
			// Mock route match with undefined params
			mockUseRouteMatch.mockReturnValue({
				path: ROUTES.DASHBOARD,
				url: '/dashboard/undefined',
				isExact: true,
				params: undefined,
			});

			renderWithDashboardProvider('/dashboard/undefined');

			// Should not call API when params are undefined
			expect(mockGetDashboard).not.toHaveBeenCalled();
		});
	});

	describe('Cache Behavior', () => {
		it('should create separate cache entries for different route params', async () => {
			const queryClient = createTestQueryClient();
			const dashboardId1 = 'dashboard-1';
			const dashboardId2 = 'dashboard-2';

			// First dashboard
			mockUseRouteMatch.mockReturnValue({
				path: ROUTES.DASHBOARD,
				url: `/dashboard/${dashboardId1}`,
				isExact: true,
				params: { dashboardId: dashboardId1 },
			});

			const { rerender } = render(
				<QueryClientProvider client={queryClient}>
					<MemoryRouter initialEntries={[`/dashboard/${dashboardId1}`]}>
						<DashboardProvider>
							<TestComponent />
						</DashboardProvider>
					</MemoryRouter>
				</QueryClientProvider>,
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: dashboardId1 });
			});

			// Second dashboard
			mockUseRouteMatch.mockReturnValue({
				path: ROUTES.DASHBOARD,
				url: `/dashboard/${dashboardId2}`,
				isExact: true,
				params: { dashboardId: dashboardId2 },
			});

			rerender(
				<QueryClientProvider client={queryClient}>
					<MemoryRouter initialEntries={[`/dashboard/${dashboardId2}`]}>
						<DashboardProvider>
							<TestComponent />
						</DashboardProvider>
					</MemoryRouter>
				</QueryClientProvider>,
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: dashboardId2 });
			});

			// Should have separate cache entries
			const cacheKeys = queryClient
				.getQueryCache()
				.getAll()
				.map((query) => query.queryKey);
			expect(cacheKeys).toHaveLength(2);
			expect(cacheKeys[0]).toEqual([
				REACT_QUERY_KEY.DASHBOARD_BY_ID,
				{ dashboardId: dashboardId1 },
				dashboardId1,
			]);
			expect(cacheKeys[1]).toEqual([
				REACT_QUERY_KEY.DASHBOARD_BY_ID,
				{ dashboardId: dashboardId2 },
				dashboardId2,
			]);
		});
	});
});
