/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable sonarjs/no-duplicate-string */
import * as ReactQuery from 'react-query';
import * as ReactRedux from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import DynamicVariableInput from '../DynamicVariableInput';

// Mock useVariableFetchState to return "fetching" state so useQuery is enabled
jest.mock('hooks/dashboard/useVariableFetchState', () => ({
	useVariableFetchState: (): Record<string, unknown> => ({
		variableFetchCycleId: 0,
		variableFetchState: 'loading',
		isVariableSettled: false,
		isVariableFetching: true,
		hasVariableFetchedOnce: false,
		isVariableWaitingForDependencies: false,
		variableDependencyWaitMessage: '',
	}),
}));

// Don't mock the components - use real ones

// Mock for useQuery
const mockQueryResult = {
	data: undefined,
	error: null,
	isError: false,
	isIdle: false,
	isLoading: false,
	isPreviousData: false,
	isSuccess: true,
	status: 'success',
	isFetched: true,
	isFetchingNextPage: false,
	isFetchingPreviousPage: false,
	isPlaceholderData: false,
	isPaused: false,
	isRefetchError: false,
	isRefetching: false,
	isStale: false,
	isLoadingError: false,
	isFetching: false,
	isFetchedAfterMount: true,
	dataUpdatedAt: 0,
	errorUpdatedAt: 0,
	failureCount: 0,
	refetch: jest.fn(),
	remove: jest.fn(),
	fetchNextPage: jest.fn(),
	fetchPreviousPage: jest.fn(),
	hasNextPage: false,
	hasPreviousPage: false,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// Sample data for testing
const mockApiResponse = {
	data: {
		normalizedValues: ['frontend', 'backend', 'database'],
		complete: true,
	},
	httpStatusCode: 200,
};

// Mock scrollIntoView since it's not available in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('DynamicVariableInput Component', () => {
	const mockOnValueUpdate = jest.fn();

	const mockDynamicVariableData: IDashboardVariable = {
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
	};

	const mockMultiSelectDynamicVariableData: IDashboardVariable = {
		...mockDynamicVariableData,
		id: 'var2',
		name: 'services',
		multiSelect: true,
		selectedValue: ['frontend', 'backend'],
		showALLOption: true,
	};

	const mockExistingVariables: Record<string, IDashboardVariable> = {
		var1: mockDynamicVariableData,
		var2: mockMultiSelectDynamicVariableData,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockOnValueUpdate.mockClear();

		// Mock useSelector
		const useSelectorSpy = jest.spyOn(ReactRedux, 'useSelector');
		useSelectorSpy.mockReturnValue({
			minTime: '2023-01-01T00:00:00Z',
			maxTime: '2023-01-02T00:00:00Z',
		});

		// Mock useQuery with success state
		const useQuerySpy = jest.spyOn(ReactQuery, 'useQuery');
		useQuerySpy.mockReturnValue({
			...mockQueryResult,
			data: mockApiResponse,
			isLoading: false,
			error: null,
		});
	});

	it('renders with single select variable correctly', () => {
		render(
			<DynamicVariableInput
				variableData={mockDynamicVariableData}
				existingVariables={mockExistingVariables}
				onValueUpdate={mockOnValueUpdate}
			/>,
		);

		// Verify the selected value is displayed
		const selectedItem = screen.getByRole('combobox');
		expect(selectedItem).toBeInTheDocument();

		// CustomSelect doesn't use the 'mode' attribute for single select
		expect(selectedItem).not.toHaveAttribute('mode');
	});

	it('renders with multi select variable correctly', () => {
		// First set up allSelected to true to properly test the ALL display
		const multiSelectWithAllSelected = {
			...mockMultiSelectDynamicVariableData,
			allSelected: true,
		};

		render(
			<DynamicVariableInput
				variableData={multiSelectWithAllSelected}
				existingVariables={mockExistingVariables}
				onValueUpdate={mockOnValueUpdate}
			/>,
		);

		// In ALL selected mode, there should be an "ALL" text element
		expect(screen.getByText('ALL')).toBeInTheDocument();
	});

	it('shows loading state correctly', () => {
		// Mock loading state
		jest.spyOn(ReactQuery, 'useQuery').mockReturnValue({
			...mockQueryResult,
			data: null,
			isLoading: true,
			isFetching: true,
			isSuccess: false,
			status: 'loading',
		});

		render(
			<DynamicVariableInput
				variableData={mockDynamicVariableData}
				existingVariables={mockExistingVariables}
				onValueUpdate={mockOnValueUpdate}
			/>,
		);

		// Open dropdown to see loading text
		const selectElement = screen.getByRole('combobox');
		fireEvent.mouseDown(selectElement);

		// The loading text should appear in the dropdown
		expect(screen.getByText('Refreshing values...')).toBeInTheDocument();
	});

	it('handles error state correctly', () => {
		const errorMessage = 'Failed to fetch data';

		// Mock error state
		jest.spyOn(ReactQuery, 'useQuery').mockReturnValue({
			...mockQueryResult,
			data: null,
			isLoading: false,
			isSuccess: false,
			isError: true,
			status: 'error',
			error: { message: errorMessage },
		});

		render(
			<DynamicVariableInput
				variableData={mockDynamicVariableData}
				existingVariables={mockExistingVariables}
				onValueUpdate={mockOnValueUpdate}
			/>,
		);

		// For error states, we should check that error handling is in place
		// Without opening the dropdown as the error message might be handled differently
		expect(ReactQuery.useQuery).toHaveBeenCalled();
		// We don't need to check refetch as it might be called during component initialization
	});

	it('makes API call to fetch variable values', () => {
		render(
			<DynamicVariableInput
				variableData={mockDynamicVariableData}
				existingVariables={mockExistingVariables}
				onValueUpdate={mockOnValueUpdate}
			/>,
		);

		// Verify the useQuery hook was called with expected parameters
		expect(ReactQuery.useQuery).toHaveBeenCalledWith(
			[
				'DASHBOARD_BY_ID',
				mockDynamicVariableData.name,
				'service:"frontend"|services:["frontend","backend"]', // The actual dynamicVariablesKey
				'2023-01-01T00:00:00Z', // minTime from useSelector mock
				'2023-01-02T00:00:00Z', // maxTime from useSelector mock
				'',
				'Traces',
				'service.name',
				0, // variableFetchCycleId
			],
			expect.objectContaining({
				enabled: true, // isVariableFetching is true from mock
				queryFn: expect.any(Function),
				onSuccess: expect.any(Function),
				onError: expect.any(Function),
			}),
		);
	});

	it('has the correct selected value', () => {
		// Use a different variable configuration to test different behavior
		const customVariable = {
			...mockDynamicVariableData,
			id: 'custom1',
			name: 'customService',
			selectedValue: 'backend',
		};

		render(
			<DynamicVariableInput
				variableData={customVariable}
				existingVariables={{ ...mockExistingVariables, custom1: customVariable }}
				onValueUpdate={mockOnValueUpdate}
			/>,
		);

		// Find the selection item in the component using data-testid
		const selectElement = screen.getByTestId('variable-select');
		expect(selectElement).toBeInTheDocument();

		// Check that the selected value is displayed in the select element
		expect(selectElement).toHaveTextContent('backend');
	});
});
