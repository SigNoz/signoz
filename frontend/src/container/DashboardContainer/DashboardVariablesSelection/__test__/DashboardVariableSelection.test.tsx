/* eslint-disable sonarjs/no-duplicate-string */
import { act, render } from '@testing-library/react';
import * as dashboardVariablesStoreModule from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import {
	dashboardVariablesStore,
	setDashboardVariablesStore,
	updateDashboardVariablesStore,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStore';
import {
	IDashboardVariables,
	IDashboardVariablesStoreState,
} from 'providers/Dashboard/store/dashboardVariables/dashboardVariablesStoreTypes';
import {
	enqueueDescendantsOfVariable,
	enqueueFetchOfAllVariables,
	initializeVariableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import DashboardVariableSelection from '../DashboardVariableSelection';

// Mutable container to capture the onValueUpdate callback from VariableItem
const mockVariableItemCallbacks: {
	onValueUpdate?: (
		name: string,
		id: string,
		value: IDashboardVariable['selectedValue'],
		allSelected: boolean,
		haveCustomValuesSelected?: boolean,
	) => void;
} = {};

// Mock providers/Dashboard/Dashboard
const mockSetSelectedDashboard = jest.fn();
const mockUpdateLocalStorageDashboardVariables = jest.fn();
jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): Record<string, unknown> => ({
		setSelectedDashboard: mockSetSelectedDashboard,
		updateLocalStorageDashboardVariables: mockUpdateLocalStorageDashboardVariables,
	}),
}));

// Mock hooks/dashboard/useVariablesFromUrl
const mockUpdateUrlVariable = jest.fn();
const mockGetUrlVariables = jest.fn().mockReturnValue({});
jest.mock('hooks/dashboard/useVariablesFromUrl', () => ({
	__esModule: true,
	default: (): Record<string, unknown> => ({
		updateUrlVariable: mockUpdateUrlVariable,
		getUrlVariables: mockGetUrlVariables,
	}),
}));

// Mock variableFetchStore functions
jest.mock('providers/Dashboard/store/variableFetchStore', () => ({
	initializeVariableFetchStore: jest.fn(),
	enqueueFetchOfAllVariables: jest.fn(),
	enqueueDescendantsOfVariable: jest.fn(),
}));

// Mock initializeDefaultVariables
jest.mock('providers/Dashboard/initializeDefaultVariables', () => ({
	initializeDefaultVariables: jest.fn(),
}));

// Mock react-redux useSelector for globalTime
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: jest.fn().mockReturnValue({ minTime: 1000, maxTime: 2000 }),
}));

// VariableItem mock captures the onValueUpdate prop for use in onValueUpdate tests
jest.mock('../VariableItem', () => ({
	__esModule: true,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	default: (props: any): JSX.Element => {
		mockVariableItemCallbacks.onValueUpdate = props.onValueUpdate;
		return <div data-testid="variable-item" />;
	},
}));

function createVariable(
	overrides: Partial<IDashboardVariable> = {},
): IDashboardVariable {
	return {
		id: 'test-id',
		name: 'test-var',
		description: '',
		type: 'QUERY',
		sort: 'DISABLED',
		showALLOption: false,
		multiSelect: false,
		order: 0,
		...overrides,
	};
}

function resetStore(): void {
	dashboardVariablesStore.set(() => ({
		dashboardId: '',
		variables: {},
		sortedVariablesArray: [],
		dependencyData: null,
		variableTypes: {},
		dynamicVariableOrder: [],
	}));
}

describe('DashboardVariableSelection', () => {
	beforeEach(() => {
		resetStore();
		jest.clearAllMocks();
	});

	it('should call initializeVariableFetchStore and enqueueFetchOfAllVariables on mount', () => {
		const variables: IDashboardVariables = {
			env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
		};

		setDashboardVariablesStore({ dashboardId: 'dash-1', variables });

		render(<DashboardVariableSelection />);

		expect(initializeVariableFetchStore).toHaveBeenCalledWith(['env']);
		expect(enqueueFetchOfAllVariables).toHaveBeenCalled();
	});

	it('should re-trigger fetch cycle when dynamicVariableOrder changes', () => {
		const variables: IDashboardVariables = {
			env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
		};

		setDashboardVariablesStore({ dashboardId: 'dash-1', variables });

		render(<DashboardVariableSelection />);

		// Clear mocks after initial render
		(initializeVariableFetchStore as jest.Mock).mockClear();
		(enqueueFetchOfAllVariables as jest.Mock).mockClear();

		// Add a DYNAMIC variable which changes dynamicVariableOrder
		act(() => {
			updateDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
					dyn1: createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
				},
			});
		});

		expect(initializeVariableFetchStore).toHaveBeenCalledWith(
			expect.arrayContaining(['env', 'dyn1']),
		);
		expect(enqueueFetchOfAllVariables).toHaveBeenCalled();
	});

	it('should re-trigger fetch cycle when a dynamic variable is removed', () => {
		const variables: IDashboardVariables = {
			env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
			dyn1: createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
			dyn2: createVariable({ name: 'dyn2', type: 'DYNAMIC', order: 2 }),
		};

		setDashboardVariablesStore({ dashboardId: 'dash-1', variables });

		render(<DashboardVariableSelection />);

		(initializeVariableFetchStore as jest.Mock).mockClear();
		(enqueueFetchOfAllVariables as jest.Mock).mockClear();

		// Remove dyn2, changing dynamicVariableOrder from ['dyn1','dyn2'] to ['dyn1']
		act(() => {
			updateDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
					dyn1: createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
				},
			});
		});

		expect(initializeVariableFetchStore).toHaveBeenCalledWith(['env', 'dyn1']);
		expect(enqueueFetchOfAllVariables).toHaveBeenCalled();
	});

	it('should NOT re-trigger fetch cycle when dynamicVariableOrder stays the same', () => {
		const variables: IDashboardVariables = {
			env: createVariable({ name: 'env', type: 'QUERY', order: 0 }),
			dyn1: createVariable({ name: 'dyn1', type: 'DYNAMIC', order: 1 }),
		};

		setDashboardVariablesStore({ dashboardId: 'dash-1', variables });

		render(<DashboardVariableSelection />);

		(initializeVariableFetchStore as jest.Mock).mockClear();
		(enqueueFetchOfAllVariables as jest.Mock).mockClear();

		// Update a non-dynamic variable's selectedValue — dynamicVariableOrder unchanged
		act(() => {
			const snapshot = dashboardVariablesStore.getSnapshot();
			dashboardVariablesStore.set(
				(): IDashboardVariablesStoreState => ({
					...snapshot,
					variables: {
						...snapshot.variables,
						env: {
							...snapshot.variables.env,
							selectedValue: 'production',
						},
					},
				}),
			);
		});

		expect(initializeVariableFetchStore).not.toHaveBeenCalled();
		expect(enqueueFetchOfAllVariables).not.toHaveBeenCalled();
	});

	describe('onValueUpdate', () => {
		let updateStoreSpy: jest.SpyInstance;

		beforeEach(() => {
			resetStore();
			jest.clearAllMocks();
			// Real implementation pass-through — we just want to observe calls
			updateStoreSpy = jest.spyOn(
				dashboardVariablesStoreModule,
				'updateDashboardVariablesStore',
			);
		});

		afterEach(() => {
			updateStoreSpy.mockRestore();
		});

		it('updates dashboardVariablesStore synchronously before enqueueDescendantsOfVariable', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({ name: 'env', id: 'env-id', order: 0 }),
				},
			});

			render(<DashboardVariableSelection />);

			const callOrder: string[] = [];
			updateStoreSpy.mockImplementation(() => {
				callOrder.push('updateDashboardVariablesStore');
			});
			(enqueueDescendantsOfVariable as jest.Mock).mockImplementation(() => {
				callOrder.push('enqueueDescendantsOfVariable');
			});

			act(() => {
				mockVariableItemCallbacks.onValueUpdate?.(
					'env',
					'env-id',
					'production',
					false,
				);
			});

			expect(callOrder).toEqual([
				'updateDashboardVariablesStore',
				'enqueueDescendantsOfVariable',
			]);
		});

		it('passes updated variable value to dashboardVariablesStore', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({
						name: 'env',
						id: 'env-id',
						order: 0,
						selectedValue: 'staging',
					}),
				},
			});

			render(<DashboardVariableSelection />);

			// Clear spy calls that happened during setup/render
			updateStoreSpy.mockClear();

			act(() => {
				mockVariableItemCallbacks.onValueUpdate?.(
					'env',
					'env-id',
					'production',
					false,
				);
			});

			expect(updateStoreSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					dashboardId: 'dash-1',
					variables: expect.objectContaining({
						env: expect.objectContaining({
							selectedValue: 'production',
							allSelected: false,
						}),
					}),
				}),
			);
		});

		it('calls enqueueDescendantsOfVariable synchronously without a timer', () => {
			jest.useFakeTimers();

			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({ name: 'env', id: 'env-id', order: 0 }),
				},
			});

			render(<DashboardVariableSelection />);

			act(() => {
				mockVariableItemCallbacks.onValueUpdate?.(
					'env',
					'env-id',
					'production',
					false,
				);
			});

			// Must be called immediately — no timer advancement needed
			expect(enqueueDescendantsOfVariable).toHaveBeenCalledWith('env');

			jest.useRealTimers();
		});

		it('propagates allSelected and haveCustomValuesSelected to the store', () => {
			setDashboardVariablesStore({
				dashboardId: 'dash-1',
				variables: {
					env: createVariable({
						name: 'env',
						id: 'env-id',
						order: 0,
						multiSelect: true,
						showALLOption: true,
					}),
				},
			});

			render(<DashboardVariableSelection />);
			updateStoreSpy.mockClear();

			act(() => {
				mockVariableItemCallbacks.onValueUpdate?.(
					'env',
					'env-id',
					['production', 'staging'],
					true,
					false,
				);
			});

			expect(updateStoreSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expect.objectContaining({
						env: expect.objectContaining({
							selectedValue: ['production', 'staging'],
							allSelected: true,
							haveCustomValuesSelected: false,
						}),
					}),
				}),
			);
		});
	});
});
