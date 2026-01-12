/* eslint-disable react/jsx-props-no-spreading */
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

// Import dependency building functions
import {
	buildDependencies,
	buildDependencyGraph,
} from '../DashboardVariablesSelection/util';

// Mock scrollIntoView since it's not available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

function createMockStore(globalTime?: any): any {
	return configureStore([])(() => ({
		globalTime: globalTime || {
			minTime: '2023-01-01T00:00:00Z',
			maxTime: '2023-01-02T00:00:00Z',
		},
	}));
}

// Mock the dashboard provider
const mockDashboard = {
	data: {
		variables: {
			env: {
				id: 'env',
				name: 'env',
				type: 'DYNAMIC',
				selectedValue: 'production',
				order: 1,
				dynamicVariablesAttribute: 'environment',
				dynamicVariablesSource: 'Traces',
			},
			service: {
				id: 'service',
				name: 'service',
				type: 'QUERY',
				queryValue: 'SELECT DISTINCT service_name WHERE env = $env',
				selectedValue: 'api-service',
				order: 2,
			},
		},
	},
};

// Mock the dashboard provider with stable functions to prevent infinite loops
const mockSetSelectedDashboard = jest.fn();
const mockUpdateLocalStorageDashboardVariables = jest.fn();
const mockSetVariablesToGetUpdated = jest.fn();

jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): any => ({
		selectedDashboard: mockDashboard,
		setSelectedDashboard: mockSetSelectedDashboard,
		updateLocalStorageDashboardVariables: mockUpdateLocalStorageDashboardVariables,
		variablesToGetUpdated: ['env'], // Stable initial value
		setVariablesToGetUpdated: mockSetVariablesToGetUpdated,
	}),
}));

interface TestWrapperProps {
	store: any;
	children: React.ReactNode;
}

function TestWrapper({ store, children }: TestWrapperProps): JSX.Element {
	return (
		<Provider store={store || createMockStore()}>
			<QueryClientProvider client={new QueryClient()}>
				{children}
			</QueryClientProvider>
		</Provider>
	);
}
TestWrapper.displayName = 'TestWrapper';

describe('Dynamic Variables Integration Tests', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Variable Dependencies and Updates', () => {
		it('should build dependency graph correctly for variables', async () => {
			// Convert mock dashboard variables to array format expected by the functions
			const { variables } = mockDashboard.data as any;
			const variablesArray = Object.values(variables) as any[];

			// Test the actual dependency building logic
			const dependencies = buildDependencies(variablesArray);
			const dependencyData = buildDependencyGraph(dependencies);

			// Verify the dependency graph structure
			expect(dependencies).toBeDefined();
			expect(dependencyData).toBeDefined();
			expect(dependencyData.order).toBeDefined();
			expect(dependencyData.graph).toBeDefined();
			expect(dependencyData.hasCycle).toBeDefined();

			// Verify that service depends on env (based on queryValue containing $env)
			// The dependencies object shows which variables depend on each variable
			// So dependencies.env should contain 'service' because service references $env
			expect(dependencies.env).toContain('service');

			// Verify the topological order (env should come before service)
			expect(dependencyData.order).toContain('env');
			expect(dependencyData.order).toContain('service');
			expect(dependencyData.order.indexOf('env')).toBeLessThan(
				dependencyData.order.indexOf('service'),
			);

			// Verify no cycles in this simple case
			expect(dependencyData.hasCycle).toBe(false);
		});

		it('should handle circular dependency detection', () => {
			// Create variables with circular dependency
			const circularVariables = [
				{
					id: 'var1',
					name: 'var1',
					type: 'QUERY',
					queryValue: 'SELECT * WHERE field = $var2',
					order: 1,
				},
				{
					id: 'var2',
					name: 'var2',
					type: 'QUERY',
					queryValue: 'SELECT * WHERE field = $var1',
					order: 2,
				},
			];

			// Test the actual circular dependency detection logic
			const dependencies = buildDependencies(circularVariables as any);
			const dependencyData = buildDependencyGraph(dependencies);

			// Verify that circular dependency is detected
			expect(dependencyData.hasCycle).toBe(true);
			expect(dependencyData.cycleNodes).toBeDefined();
			expect(dependencyData.cycleNodes).toContain('var1');
			expect(dependencyData.cycleNodes).toContain('var2');

			// Verify the dependency structure
			expect(dependencies.var1).toContain('var2');
			expect(dependencies.var2).toContain('var1');

			// Verify that topological order is incomplete due to cycle
			expect(dependencyData.order.length).toBeLessThan(2);
		});
	});
});
