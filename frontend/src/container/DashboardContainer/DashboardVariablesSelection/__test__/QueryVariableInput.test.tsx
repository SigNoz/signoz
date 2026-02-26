/* eslint-disable sonarjs/no-duplicate-string */
import { QueryClient, QueryClientProvider } from 'react-query';
import { act, render, waitFor } from '@testing-library/react';
import dashboardVariablesQuery from 'api/dashboard/variables/dashboardVariablesQuery';
import { variableFetchStore } from 'providers/Dashboard/store/variableFetchStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import QueryVariableInput from '../QueryVariableInput';

jest.mock('api/dashboard/variables/dashboardVariablesQuery');

jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: jest.fn().mockReturnValue({ minTime: 1000, maxTime: 2000 }),
}));

function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, refetchOnWindowFocus: false },
		},
	});
}

function Wrapper({
	children,
	queryClient,
}: {
	children: React.ReactNode;
	queryClient: QueryClient;
}): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

function createVariable(
	overrides: Partial<IDashboardVariable> = {},
): IDashboardVariable {
	return {
		id: 'env-id',
		name: 'env',
		description: '',
		type: 'QUERY',
		sort: 'DISABLED',
		showALLOption: false,
		multiSelect: false,
		order: 0,
		queryValue: 'SELECT env FROM table',
		...overrides,
	};
}

/** Put the named variable into 'loading' state so useQuery fires on mount */
function setVariableLoading(name: string): void {
	variableFetchStore.update((draft) => {
		draft.states[name] = 'loading';
		draft.cycleIds[name] = (draft.cycleIds[name] || 0) + 1;
	});
}

function resetFetchStore(): void {
	variableFetchStore.set(() => ({
		states: {},
		lastUpdated: {},
		cycleIds: {},
	}));
}

describe('QueryVariableInput - getOptions logic', () => {
	const mockOnValueUpdate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		resetFetchStore();
	});

	afterEach(() => {
		resetFetchStore();
	});

	it('applies default value (first option) when selectedValue is empty on first load', async () => {
		(dashboardVariablesQuery as jest.Mock).mockResolvedValue({
			statusCode: 200,
			payload: { variableValues: ['production', 'staging', 'dev'] },
		});

		const variable = createVariable({ selectedValue: undefined });
		setVariableLoading('env');

		const queryClient = createTestQueryClient();
		render(
			<Wrapper queryClient={queryClient}>
				<QueryVariableInput
					variableData={variable}
					existingVariables={{ 'env-id': variable }}
					onValueUpdate={mockOnValueUpdate}
				/>
			</Wrapper>,
		);

		await waitFor(() => {
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'env',
				'env-id',
				'production', // first option by default
				false,
			);
		});
	});

	it('keeps existing selectedValue when it is present in new options', async () => {
		(dashboardVariablesQuery as jest.Mock).mockResolvedValue({
			statusCode: 200,
			payload: { variableValues: ['production', 'staging'] },
		});

		const variable = createVariable({ selectedValue: 'staging' });
		setVariableLoading('env');

		const queryClient = createTestQueryClient();
		render(
			<Wrapper queryClient={queryClient}>
				<QueryVariableInput
					variableData={variable}
					existingVariables={{ 'env-id': variable }}
					onValueUpdate={mockOnValueUpdate}
				/>
			</Wrapper>,
		);

		await waitFor(() => {
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'env',
				'env-id',
				'staging',
				false,
			);
		});
	});

	it('selects all new options when allSelected=true and value is missing from new options', async () => {
		(dashboardVariablesQuery as jest.Mock).mockResolvedValue({
			statusCode: 200,
			payload: { variableValues: ['production', 'staging'] },
		});

		const variable = createVariable({
			selectedValue: ['old-env'],
			allSelected: true,
			multiSelect: true,
			showALLOption: true,
		});
		setVariableLoading('env');

		const queryClient = createTestQueryClient();
		render(
			<Wrapper queryClient={queryClient}>
				<QueryVariableInput
					variableData={variable}
					existingVariables={{ 'env-id': variable }}
					onValueUpdate={mockOnValueUpdate}
				/>
			</Wrapper>,
		);

		await waitFor(() => {
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'env',
				'env-id',
				['production', 'staging'],
				true,
			);
		});
	});

	it('does not call onValueUpdate a second time when options have not changed', async () => {
		const mockQueryFn = jest.fn().mockResolvedValue({
			statusCode: 200,
			payload: { variableValues: ['production', 'staging'] },
		});
		(dashboardVariablesQuery as jest.Mock).mockImplementation(mockQueryFn);

		const variable = createVariable({ selectedValue: 'production' });
		setVariableLoading('env');

		const queryClient = createTestQueryClient();
		render(
			<Wrapper queryClient={queryClient}>
				<QueryVariableInput
					variableData={variable}
					existingVariables={{ 'env-id': variable }}
					onValueUpdate={mockOnValueUpdate}
				/>
			</Wrapper>,
		);

		// Wait for first fetch and onValueUpdate call
		await waitFor(() => {
			expect(mockOnValueUpdate).toHaveBeenCalledTimes(1);
		});

		mockOnValueUpdate.mockClear();

		// Trigger a second fetch cycle with the same API response
		act(() => {
			variableFetchStore.update((draft) => {
				draft.states['env'] = 'revalidating';
				draft.cycleIds['env'] = (draft.cycleIds['env'] || 0) + 1;
			});
		});

		// Wait for second query to fire
		await waitFor(() => {
			expect(mockQueryFn).toHaveBeenCalledTimes(2);
		});

		// Options are unchanged, so onValueUpdate must not fire again
		expect(mockOnValueUpdate).not.toHaveBeenCalled();
	});

	it('does not call onValueUpdate when API returns a non-array response', async () => {
		(dashboardVariablesQuery as jest.Mock).mockResolvedValue({
			statusCode: 200,
			payload: { variableValues: null },
		});

		const variable = createVariable({ selectedValue: 'production' });
		setVariableLoading('env');

		const queryClient = createTestQueryClient();
		render(
			<Wrapper queryClient={queryClient}>
				<QueryVariableInput
					variableData={variable}
					existingVariables={{ 'env-id': variable }}
					onValueUpdate={mockOnValueUpdate}
				/>
			</Wrapper>,
		);

		await waitFor(() => {
			expect(dashboardVariablesQuery).toHaveBeenCalled();
		});

		expect(mockOnValueUpdate).not.toHaveBeenCalled();
	});

	it('does not fire the query when variableData.name is empty', () => {
		(dashboardVariablesQuery as jest.Mock).mockResolvedValue({
			statusCode: 200,
			payload: { variableValues: ['production'] },
		});

		// Variable with no name — useVariableFetchState will be called with ''
		// and the query key will have an empty name, leaving it disabled
		const variable = createVariable({ name: '' });
		// Note: we do NOT put it in 'loading' state since name is empty
		// (no variableFetchStore entry for '' means isVariableFetching=false)

		const queryClient = createTestQueryClient();
		render(
			<Wrapper queryClient={queryClient}>
				<QueryVariableInput
					variableData={variable}
					existingVariables={{ 'env-id': variable }}
					onValueUpdate={mockOnValueUpdate}
				/>
			</Wrapper>,
		);

		expect(dashboardVariablesQuery).not.toHaveBeenCalled();
		expect(mockOnValueUpdate).not.toHaveBeenCalled();
	});
});
