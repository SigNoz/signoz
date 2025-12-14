/* eslint-disable sonarjs/no-duplicate-string */
import { render, waitFor } from '@testing-library/react';
import getDashboard from 'api/v1/dashboards/id/get';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import { DashboardProvider, useDashboard } from 'providers/Dashboard/Dashboard';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { initializeDefaultVariables } from '../initializeDefaultVariables';
import { normalizeUrlValueForVariable } from '../normalizeUrlValue';

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
	const { dashboardResponse, dashboardId, selectedDashboard } = useDashboard();

	return (
		<div>
			<div data-testid="dashboard-id">{dashboardId}</div>
			<div data-testid="query-status">{dashboardResponse.status}</div>
			<div data-testid="is-loading">{dashboardResponse.isLoading.toString()}</div>
			<div data-testid="is-fetching">
				{dashboardResponse.isFetching.toString()}
			</div>
			<div data-testid="dashboard-variables">
				{selectedDashboard?.data?.variables
					? JSON.stringify(selectedDashboard.data.variables)
					: 'null'}
			</div>
			<div data-testid="dashboard-data">
				{selectedDashboard?.data?.title || 'No Title'}
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

// Mock URL variables hook
const mockGetUrlVariables = jest.fn();
const mockUpdateUrlVariable = jest.fn();
const mockSetUrlVariables = jest.fn();

jest.mock('hooks/dashboard/useVariablesFromUrl', () => ({
	__esModule: true,
	default: jest.fn(() => ({
		getUrlVariables: mockGetUrlVariables,
		updateUrlVariable: mockUpdateUrlVariable,
		setUrlVariables: mockSetUrlVariables,
	})),
}));

// Mock normalization function
jest.mock('providers/Dashboard/normalizeUrlValue', () => ({
	normalizeUrlValueForVariable: jest.fn(),
}));

// Mock initialize default variables
jest.mock('providers/Dashboard/initializeDefaultVariables', () => ({
	initializeDefaultVariables: jest.fn(),
}));

const mockNormalizeUrlValueForVariable = jest.mocked(
	normalizeUrlValueForVariable,
);

const mockInitializeDefaultVariables = jest.mocked(initializeDefaultVariables);

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

describe('Dashboard Provider - URL Variables Integration', () => {
	const DASHBOARD_ID = 'test-dashboard-id';

	beforeEach(() => {
		jest.clearAllMocks();
		/* eslint-disable @typescript-eslint/no-explicit-any */
		mockGetDashboard.mockResolvedValue({
			httpStatusCode: 200,
			data: {
				id: DASHBOARD_ID,
				title: 'Test Dashboard',
				data: {
					variables: {
						environment: {
							id: 'env-id',
							name: 'environment',
							multiSelect: false,
							allSelected: false,
							showALLOption: true,
						} as any,
						services: {
							id: 'svc-id',
							name: 'services',
							multiSelect: true,
							allSelected: false,
							showALLOption: true,
						} as any,
					},
				},
			},
		} as any);
		/* eslint-enable @typescript-eslint/no-explicit-any */
		mockGetUrlVariables.mockReturnValue({});
		mockNormalizeUrlValueForVariable.mockImplementation((urlValue) => {
			if (urlValue === undefined || urlValue === null) {
				return urlValue;
			}
			return urlValue as IDashboardVariable['selectedValue'];
		});
	});

	describe('URL Variable Synchronization', () => {
		it('should initialize variables correctly when no URL variables exist', async () => {
			// Empty URL variables - tests initialization flow
			mockGetUrlVariables.mockReturnValue({});

			const { getByTestId } = renderWithDashboardProvider(
				`/dashboard/${DASHBOARD_ID}`,
				{
					dashboardId: DASHBOARD_ID,
				},
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Verify initializeDefaultVariables was called
			await waitFor(() => {
				expect(mockInitializeDefaultVariables).toHaveBeenCalledWith(
					{
						environment: {
							id: 'env-id',
							name: 'environment',
							multiSelect: false,
							allSelected: false,
							showALLOption: true,
						},
						services: {
							id: 'svc-id',
							name: 'services',
							multiSelect: true,
							allSelected: false,
							showALLOption: true,
						},
					},
					mockGetUrlVariables,
					mockUpdateUrlVariable,
				);
			});

			// Verify dashboard state contains the variables with default values
			await waitFor(() => {
				const dashboardVariables = getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				expect(parsedVariables).toHaveProperty('environment');
				expect(parsedVariables).toHaveProperty('services');
				// Default allSelected values should be preserved
				expect(parsedVariables.environment.allSelected).toBe(false);
				expect(parsedVariables.services.allSelected).toBe(false);
			});
		});

		it('should merge URL variables with dashboard data and normalize values correctly', async () => {
			const urlVariables = {
				environment: 'development',
				services: ['db', 'cache'],
			};

			mockGetUrlVariables.mockReturnValue(urlVariables);
			mockNormalizeUrlValueForVariable
				.mockReturnValueOnce('development')
				.mockReturnValueOnce(['db', 'cache']);

			const { getByTestId } = renderWithDashboardProvider(
				`/dashboard/${DASHBOARD_ID}`,
				{
					dashboardId: DASHBOARD_ID,
				},
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Verify normalization was called with correct values and variable configs
			await waitFor(() => {
				expect(mockNormalizeUrlValueForVariable).toHaveBeenCalledWith(
					'development',
					{
						id: 'env-id',
						name: 'environment',
						multiSelect: false,
						allSelected: false,
						showALLOption: true,
					},
				);
				expect(mockNormalizeUrlValueForVariable).toHaveBeenCalledWith(
					['db', 'cache'],
					{
						id: 'svc-id',
						name: 'services',
						multiSelect: true,
						allSelected: false,
						showALLOption: true,
					},
				);
			});

			// Verify the dashboard state reflects the normalized URL values
			await waitFor(() => {
				const dashboardVariables = getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				// The selectedValue should be updated with normalized URL values
				expect(parsedVariables.environment.selectedValue).toBe('development');
				expect(parsedVariables.services.selectedValue).toEqual(['db', 'cache']);

				// allSelected should be set to false when URL values override
				expect(parsedVariables.environment.allSelected).toBe(false);
				expect(parsedVariables.services.allSelected).toBe(false);
			});
		});

		it('should handle ALL_SELECTED_VALUE from URL and set allSelected correctly', async () => {
			const urlVariables = {
				services: '__ALL__',
			};

			mockGetUrlVariables.mockReturnValue(urlVariables);

			const { getByTestId } = renderWithDashboardProvider(
				`/dashboard/${DASHBOARD_ID}`,
				{
					dashboardId: DASHBOARD_ID,
				},
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Should not call normalize for __ALL__ values
			expect(mockNormalizeUrlValueForVariable).not.toHaveBeenCalledWith(
				'__ALL__',
				expect.anything(),
			);

			// Verify that allSelected is set to true for the services variable
			await waitFor(() => {
				const dashboardVariables = getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				expect(parsedVariables.services.allSelected).toBe(true);
				// Environment should remain unaffected
				expect(parsedVariables.environment.allSelected).toBe(false);
			});
		});
	});

	describe('Variable Value Normalization', () => {
		it('should normalize URL variables when they exist', async () => {
			const urlVariables = {
				environment: ['development', 'staging'], // Array for single-select
				services: 'api', // Single value for multi-select
			};

			mockGetUrlVariables.mockReturnValue(urlVariables);
			mockNormalizeUrlValueForVariable
				.mockReturnValueOnce('development')
				.mockReturnValueOnce(['api']);

			renderWithDashboardProvider(`/dashboard/${DASHBOARD_ID}`, {
				dashboardId: DASHBOARD_ID,
			});

			await waitFor(() => {
				// Verify normalization was called with the specific values and variable configs
				expect(mockNormalizeUrlValueForVariable).toHaveBeenCalledWith(
					['development', 'staging'],
					{
						id: 'env-id',
						name: 'environment',
						multiSelect: false,
						allSelected: false,
						showALLOption: true,
					},
				);
				expect(mockNormalizeUrlValueForVariable).toHaveBeenCalledWith('api', {
					id: 'svc-id',
					name: 'services',
					multiSelect: true,
					allSelected: false,
					showALLOption: true,
				});
			});
		});
	});
});
