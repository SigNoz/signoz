import { renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';

import { useGetDynamicVariables } from '../useGetDynamicVariables';

// Mock the dependencies
jest.mock('react-query', () => ({
	...jest.requireActual('react-query'),
	useQuery: jest.fn(),
}));

jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: jest.fn(),
}));

// Sample dashboard data with variables
const mockDashboardData = {
	data: {
		title: 'Test Dashboard',
		variables: {
			var1: {
				id: 'var1',
				name: 'service',
				type: 'DYNAMIC',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				selectedValue: 'frontend',
				multiSelect: false,
				showALLOption: false,
				allSelected: false,
				description: '',
				sort: 'DISABLED',
			},
			var2: {
				id: 'var2',
				name: 'status',
				type: 'DYNAMIC',
				dynamicVariablesAttribute: 'http.status_code',
				dynamicVariablesSource: 'Traces',
				selectedValue: '200',
				multiSelect: false,
				showALLOption: false,
				allSelected: false,
				description: '',
				sort: 'DISABLED',
			},
			var3: {
				id: 'var3',
				name: 'interval',
				type: 'CUSTOM', // Not DYNAMIC - should be filtered out
				customValue: '5m',
				multiSelect: false,
				showALLOption: false,
				allSelected: false,
				description: '',
				sort: 'DISABLED',
			},
		},
	},
	uuid: 'dashboard-123',
	loading: false,
	error: null,
};

// Mock refetch function
const mockRefetch = jest.fn();

// Constants
const DASHBOARD_ID = 'dashboard-123';

// Create a wrapper for the renderHook function with the QueryClientProvider
const createWrapper = (): React.FC<{ children: ReactNode }> => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	// Define as function declaration to fix linter error
	function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	}

	return Wrapper;
};

describe('useGetDynamicVariables', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Mock the useDashboard hook
		(useDashboard as jest.Mock).mockReturnValue({
			dashboardId: DASHBOARD_ID,
		});

		// Mock the useQuery hook for successful response
		(useQuery as jest.Mock).mockReturnValue({
			data: mockDashboardData,
			isLoading: false,
			isError: false,
			refetch: mockRefetch,
		});
	});

	it('should return dynamic variables from the dashboard', async () => {
		const { result } = renderHook(() => useGetDynamicVariables(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.dynamicVariables).toHaveLength(2); // Only DYNAMIC type variables
			expect(result.current.dynamicVariables[0].name).toBe('service');
			expect(result.current.dynamicVariables[1].name).toBe('status');
			expect(result.current.isLoading).toBe(false);
			expect(result.current.isError).toBe(false);
		});

		// Verify each dynamic variable has dashboard info
		expect(result.current.dynamicVariables[0].dashboardName).toBe(
			'Test Dashboard',
		);
		expect(result.current.dynamicVariables[0].dashboardId).toBe(DASHBOARD_ID);
	});

	it('should use dashboardId from props if provided', async () => {
		const customDashboardId = 'custom-dashboard-id';
		renderHook(() => useGetDynamicVariables({ dashboardId: customDashboardId }), {
			wrapper: createWrapper(),
		});

		// Check that useQuery was called with the custom dashboardId
		expect(useQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: expect.arrayContaining(['DASHBOARD_BY_ID', customDashboardId]),
			}),
		);
	});

	it('should return empty array when dashboard has no variables', async () => {
		// Mock no variables in dashboard
		(useQuery as jest.Mock).mockReturnValue({
			data: {
				data: { title: 'Empty Dashboard' },
				uuid: 'dashboard-empty',
				loading: false,
				error: null,
			},
			isLoading: false,
			isError: false,
			refetch: mockRefetch,
		});

		const { result } = renderHook(() => useGetDynamicVariables(), {
			wrapper: createWrapper(),
		});

		expect(result.current.dynamicVariables).toHaveLength(0);
	});

	it('should return empty array when dashboard is null', async () => {
		// Mock null dashboard data
		(useQuery as jest.Mock).mockReturnValue({
			data: null,
			isLoading: false,
			isError: false,
			refetch: mockRefetch,
		});

		const { result } = renderHook(() => useGetDynamicVariables(), {
			wrapper: createWrapper(),
		});

		expect(result.current.dynamicVariables).toHaveLength(0);
	});

	it('should handle loading state', async () => {
		// Mock loading state
		(useQuery as jest.Mock).mockReturnValue({
			data: null,
			isLoading: true,
			isError: false,
			refetch: mockRefetch,
		});

		const { result } = renderHook(() => useGetDynamicVariables(), {
			wrapper: createWrapper(),
		});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.dynamicVariables).toHaveLength(0);
	});

	it('should handle error state', async () => {
		// Mock error state
		(useQuery as jest.Mock).mockReturnValue({
			data: null,
			isLoading: false,
			isError: true,
			refetch: mockRefetch,
		});

		const { result } = renderHook(() => useGetDynamicVariables(), {
			wrapper: createWrapper(),
		});

		expect(result.current.isError).toBe(true);
		expect(result.current.dynamicVariables).toHaveLength(0);
	});

	it('should call refetch when returned function is called', async () => {
		const { result } = renderHook(() => useGetDynamicVariables(), {
			wrapper: createWrapper(),
		});

		result.current.refetch();
		expect(mockRefetch).toHaveBeenCalledTimes(1);
	});
});
