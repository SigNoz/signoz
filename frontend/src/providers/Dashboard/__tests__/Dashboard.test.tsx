import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import getDashboard from 'api/v1/dashboards/id/get';
import { DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED } from 'constants/queryCacheTime';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useDashboardBootstrap } from 'hooks/dashboard/useDashboardBootstrap';

function DashboardBootstrapWrapper({
	dashboardId,
	children,
}: {
	dashboardId: string;
	children: ReactNode;
}): JSX.Element {
	useDashboardBootstrap(dashboardId);
	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{children}</>;
}
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { useDashboardVariables } from '../../../hooks/dashboard/useDashboardVariables';
import { initializeDefaultVariables } from '../initializeDefaultVariables';
import { normalizeUrlValueForVariable } from '../normalizeUrlValue';

// Mock the dashboard API
jest.mock('api/v1/dashboards/id/get');
jest.mock('api/v1/dashboards/id/lock');
const mockGetDashboard = jest.mocked(getDashboard);

// Mock other dependencies
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): { safeNavigate: jest.Mock } => ({
		safeNavigate: jest.fn(),
	}),
}));

// Mock only the essential dependencies for Dashboard provider
jest.mock('providers/App/App', () => ({
	useAppContext: (): {
		isLoggedIn: boolean;
		user: { email: string; role: string };
	} => ({
		isLoggedIn: true,
		user: { email: 'test@example.com', role: 'ADMIN' },
	}),
}));

jest.mock('providers/ErrorModalProvider', () => ({
	useErrorModal: (): { showErrorModal: jest.Mock } => ({
		showErrorModal: jest.fn(),
	}),
}));

jest.mock('react-redux', () => ({
	useSelector: jest.fn(() => ({
		selectedTime: 'GLOBAL_TIME',
		minTime: '2023-01-01T00:00:00Z',
		maxTime: '2023-01-01T01:00:00Z',
		isAutoRefreshDisabled: true,
	})),
	useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

function TestComponent(): JSX.Element {
	const { selectedDashboard } = useDashboardStore();
	const { dashboardVariables } = useDashboardVariables();

	return (
		<div>
			<div data-testid="dashboard-id">{selectedDashboard?.id}</div>
			<div data-testid="dashboard-variables">
				{dashboardVariables ? JSON.stringify(dashboardVariables) : 'null'}
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
function renderWithDashboardBootstrap(
	dashboardId = 'test-dashboard-id',
): RenderResult {
	const queryClient = createTestQueryClient();
	const initialRoute = dashboardId ? `/dashboard/${dashboardId}` : '/dashboard';

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[initialRoute]}>
				<DashboardBootstrapWrapper dashboardId={dashboardId}>
					<TestComponent />
				</DashboardBootstrapWrapper>
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
			renderWithDashboardBootstrap(dashboardId);

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
			const { rerender } = renderWithDashboardBootstrap(initialDashboardId);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: initialDashboardId });
			});

			// Rerender with new dashboard ID prop
			rerender(
				<QueryClientProvider client={createTestQueryClient()}>
					<MemoryRouter initialEntries={[`/dashboard/${newDashboardId}`]}>
						<DashboardBootstrapWrapper dashboardId={newDashboardId}>
							<TestComponent />
						</DashboardBootstrapWrapper>
					</MemoryRouter>
				</QueryClientProvider>,
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: newDashboardId });
			});

			// Should have been called twice - once for each dashboard ID
			expect(mockGetDashboard).toHaveBeenCalledTimes(2);
		});

		it('should not fetch when no dashboardId is provided', () => {
			renderWithDashboardBootstrap('');

			// Should not call the API
			expect(mockGetDashboard).not.toHaveBeenCalled();
		});
	});

	describe('Cache Behavior', () => {
		it('should create separate cache entries for different dashboardIds', async () => {
			const queryClient = createTestQueryClient();
			const dashboardId1 = 'dashboard-1';
			const dashboardId2 = 'dashboard-2';

			const { rerender } = render(
				<QueryClientProvider client={queryClient}>
					<MemoryRouter initialEntries={[`/dashboard/${dashboardId1}`]}>
						<DashboardBootstrapWrapper dashboardId={dashboardId1}>
							<TestComponent />
						</DashboardBootstrapWrapper>
					</MemoryRouter>
				</QueryClientProvider>,
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: dashboardId1 });
			});

			rerender(
				<QueryClientProvider client={queryClient}>
					<MemoryRouter initialEntries={[`/dashboard/${dashboardId2}`]}>
						<DashboardBootstrapWrapper dashboardId={dashboardId2}>
							<TestComponent />
						</DashboardBootstrapWrapper>
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
				dashboardId1,
				true, // globalTime.isAutoRefreshDisabled
			]);
			expect(cacheKeys[1]).toEqual([
				REACT_QUERY_KEY.DASHBOARD_BY_ID,
				dashboardId2,
				true, // globalTime.isAutoRefreshDisabled
			]);
		});

		it('should not store dashboard in cache when autoRefresh is enabled (isAutoRefreshDisabled=false)', async () => {
			jest.mocked(useSelector).mockImplementation(() => ({
				selectedTime: 'GLOBAL_TIME',
				minTime: '2023-01-01T00:00:00Z',
				maxTime: '2023-01-01T01:00:00Z',
				isAutoRefreshDisabled: false,
			}));

			const queryClient = createTestQueryClient();
			const dashboardId = 'auto-refresh-dashboard';

			render(
				<QueryClientProvider client={queryClient}>
					<MemoryRouter initialEntries={[`/dashboard/${dashboardId}`]}>
						<DashboardBootstrapWrapper dashboardId={dashboardId}>
							<TestComponent />
						</DashboardBootstrapWrapper>
					</MemoryRouter>
				</QueryClientProvider>,
			);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: dashboardId });
			});

			const dashboardQuery = queryClient
				.getQueryCache()
				.getAll()
				.find(
					(query) =>
						query.queryKey[0] === REACT_QUERY_KEY.DASHBOARD_BY_ID &&
						query.queryKey[2] === false,
				);
			expect(dashboardQuery).toBeDefined();
			expect((dashboardQuery as { cacheTime: number }).cacheTime).toBe(
				DASHBOARD_CACHE_TIME_ON_REFRESH_ENABLED,
			);

			jest.mocked(useSelector).mockImplementation(() => ({
				selectedTime: 'GLOBAL_TIME',
				minTime: '2023-01-01T00:00:00Z',
				maxTime: '2023-01-01T01:00:00Z',
				isAutoRefreshDisabled: true,
			}));
		});
	});
});

describe('Dashboard Provider - URL Variables Integration', () => {
	const DASHBOARD_ID = 'test-dashboard-id';

	beforeEach(() => {
		jest.clearAllMocks();
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

			renderWithDashboardBootstrap(DASHBOARD_ID);

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
							order: 0,
						},
						services: {
							id: 'svc-id',
							name: 'services',
							multiSelect: true,
							allSelected: false,
							showALLOption: true,
							order: 1,
						},
					},
					mockGetUrlVariables,
					mockUpdateUrlVariable,
				);
			});

			// Verify dashboard state contains the variables with default values
			await waitFor(() => {
				const dashboardVariables = screen.getByTestId('dashboard-variables');
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

			renderWithDashboardBootstrap(DASHBOARD_ID);

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
				const dashboardVariables = screen.getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				// First ensure the variables exist
				expect(parsedVariables).toHaveProperty('environment');
				expect(parsedVariables).toHaveProperty('services');

				// Then check their properties
				expect(parsedVariables.environment).toHaveProperty('selectedValue');
				expect(parsedVariables.services).toHaveProperty('selectedValue');

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

			renderWithDashboardBootstrap(DASHBOARD_ID);

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
				const dashboardVariables = screen.getByTestId('dashboard-variables');
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

			renderWithDashboardBootstrap(DASHBOARD_ID);

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

describe('Dashboard Provider - Textbox Variable Backward Compatibility', () => {
	const DASHBOARD_ID = 'test-dashboard-id';

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetUrlVariables.mockReturnValue({});
		mockNormalizeUrlValueForVariable.mockImplementation((urlValue) => {
			if (urlValue === undefined || urlValue === null) {
				return urlValue;
			}
			return urlValue as IDashboardVariable['selectedValue'];
		});
	});

	describe('Textbox Variable defaultValue Migration', () => {
		it('should set defaultValue from textboxValue for TEXTBOX variables without defaultValue (BWC)', async () => {
			// Mock dashboard with TEXTBOX variable that has textboxValue but no defaultValue
			// This simulates old data format before the migration
			mockGetDashboard.mockResolvedValue({
				httpStatusCode: 200,
				data: {
					id: DASHBOARD_ID,
					title: 'Test Dashboard',
					data: {
						variables: {
							myTextbox: {
								id: 'textbox-id',
								name: 'myTextbox',
								type: 'TEXTBOX',
								textboxValue: 'legacy-default-value',
								// defaultValue is intentionally missing to test BWC
								multiSelect: false,
								showALLOption: false,
								sort: 'DISABLED',
							} as any,
						},
					},
				},
			} as any);
			/* eslint-enable @typescript-eslint/no-explicit-any */

			renderWithDashboardBootstrap(DASHBOARD_ID);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Verify that defaultValue is set from textboxValue
			await waitFor(() => {
				const dashboardVariables = screen.getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				expect(parsedVariables.myTextbox.type).toBe('TEXTBOX');
				expect(parsedVariables.myTextbox.textboxValue).toBe('legacy-default-value');
				expect(parsedVariables.myTextbox.defaultValue).toBe('legacy-default-value');
			});
		});

		it('should not override existing defaultValue for TEXTBOX variables', async () => {
			// Mock dashboard with TEXTBOX variable that already has defaultValue
			mockGetDashboard.mockResolvedValue({
				httpStatusCode: 200,
				data: {
					id: DASHBOARD_ID,
					title: 'Test Dashboard',
					data: {
						variables: {
							myTextbox: {
								id: 'textbox-id',
								name: 'myTextbox',
								type: 'TEXTBOX',
								textboxValue: 'old-textbox-value',
								defaultValue: 'existing-default-value',
								multiSelect: false,
								showALLOption: false,
								sort: 'DISABLED',
							} as any,
						},
					},
				},
			} as any);
			/* eslint-enable @typescript-eslint/no-explicit-any */

			renderWithDashboardBootstrap(DASHBOARD_ID);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Verify that existing defaultValue is preserved
			await waitFor(() => {
				const dashboardVariables = screen.getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				expect(parsedVariables.myTextbox.type).toBe('TEXTBOX');
				expect(parsedVariables.myTextbox.defaultValue).toBe(
					'existing-default-value',
				);
			});
		});

		it('should set empty defaultValue when textboxValue is also empty for TEXTBOX variables', async () => {
			// Mock dashboard with TEXTBOX variable with empty textboxValue and no defaultValue
			mockGetDashboard.mockResolvedValue({
				httpStatusCode: 200,
				data: {
					id: DASHBOARD_ID,
					title: 'Test Dashboard',
					data: {
						variables: {
							myTextbox: {
								id: 'textbox-id',
								name: 'myTextbox',
								type: 'TEXTBOX',
								textboxValue: '',
								// defaultValue is intentionally missing
								multiSelect: false,
								showALLOption: false,
								sort: 'DISABLED',
							} as any,
						},
					},
				},
			} as any);
			/* eslint-enable @typescript-eslint/no-explicit-any */

			renderWithDashboardBootstrap(DASHBOARD_ID);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Verify that defaultValue is set to empty string
			await waitFor(() => {
				const dashboardVariables = screen.getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				expect(parsedVariables.myTextbox.type).toBe('TEXTBOX');
				expect(parsedVariables.myTextbox.defaultValue).toBe('');
			});
		});

		it('should not apply BWC logic to non-TEXTBOX variables', async () => {
			// Mock dashboard with QUERY variable that has no defaultValue
			mockGetDashboard.mockResolvedValue({
				httpStatusCode: 200,
				data: {
					id: DASHBOARD_ID,
					title: 'Test Dashboard',
					data: {
						variables: {
							myQuery: {
								id: 'query-id',
								name: 'myQuery',
								type: 'QUERY',
								queryValue: 'SELECT * FROM test',
								textboxValue: 'should-not-be-used',
								// defaultValue is intentionally missing
								multiSelect: false,
								showALLOption: false,
								sort: 'DISABLED',
							} as any,
						},
					},
				},
			} as any);
			/* eslint-enable @typescript-eslint/no-explicit-any */

			renderWithDashboardBootstrap(DASHBOARD_ID);

			await waitFor(() => {
				expect(mockGetDashboard).toHaveBeenCalledWith({ id: DASHBOARD_ID });
			});

			// Verify that defaultValue is NOT set from textboxValue for QUERY type
			await waitFor(() => {
				const dashboardVariables = screen.getByTestId('dashboard-variables');
				const parsedVariables = JSON.parse(dashboardVariables.textContent || '{}');

				expect(parsedVariables.myQuery.type).toBe('QUERY');
				// defaultValue should not be set to textboxValue for non-TEXTBOX variables
				expect(parsedVariables.myQuery.defaultValue).not.toBe('should-not-be-used');
			});
		});
	});
});
