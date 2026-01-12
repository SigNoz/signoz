/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable react/jsx-props-no-spreading */
import {
	act,
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
} from '@testing-library/react';
import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import * as ReactRedux from 'react-redux';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import DynamicVariableSelection from '../DashboardVariablesSelection/DynamicVariableSelection';

// Mock the getFieldValues API
jest.mock('api/dynamicVariables/getFieldValues', () => ({
	getFieldValues: jest.fn(),
}));

describe('Dynamic Variable Default Behavior', () => {
	const mockOnValueUpdate = jest.fn();
	const mockApiResponse = {
		httpStatusCode: 200,
		data: {
			values: {
				stringValues: ['frontend', 'backend', 'database', 'cache'],
			},
			normalizedValues: ['frontend', 'backend', 'database', 'cache'],
			complete: true,
		},
	};

	let queryClient: QueryClient;

	const renderWithQueryClient = (component: React.ReactElement): RenderResult =>
		render(
			<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>,
		);

	beforeEach(() => {
		// Mock scrollIntoView for JSDOM environment
		window.HTMLElement.prototype.scrollIntoView = jest.fn();
		jest.clearAllMocks();

		// Create a new QueryClient for each test
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		// Mock getFieldValues API to return our test data
		(getFieldValues as jest.Mock).mockResolvedValue(mockApiResponse);

		jest.spyOn(ReactRedux, 'useSelector').mockReturnValue({
			minTime: '2023-01-01T00:00:00Z',
			maxTime: '2023-01-02T00:00:00Z',
		});
	});

	describe('Single Select Default Values', () => {
		it('should use default value when no previous selection exists', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'service',
				type: 'DYNAMIC',
				multiSelect: false,
				defaultValue: 'backend',
				selectedValue: undefined,
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				showALLOption: false,
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Should call onValueUpdate with default value
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'service',
				'var1',
				'backend',
				true,
				false,
			);
		});

		it('should preserve previous selection over default value', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'service',
				type: 'DYNAMIC',
				multiSelect: false,
				defaultValue: 'backend',
				selectedValue: 'frontend',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				showALLOption: false,
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Should NOT call onValueUpdate since previous selection exists
			expect(mockOnValueUpdate).not.toHaveBeenCalledWith();

			// Check if the previous selection 'frontend' is displayed in the UI
			// For single select, the value should be visible in the select component
			const selectElement = screen.getByRole('combobox');
			expect(selectElement).toBeInTheDocument();

			// Open dropdown to check if 'frontend' is selected
			await act(async () => {
				fireEvent.mouseDown(selectElement);
			});

			// Check if 'frontend' option is present and selected in dropdown
			const frontendOption = screen.getByRole('option', { name: 'frontend' });
			expect(frontendOption).toHaveClass('selected');
		});

		it('should use first value when no default and no previous selection', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'service',
				type: 'DYNAMIC',
				multiSelect: false,
				defaultValue: undefined,
				selectedValue: undefined,
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				showALLOption: false,
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Component should render without errors
			expect(screen.getByText('$service')).toBeInTheDocument();

			// Check if the dropdown is present
			const selectElement = screen.getByRole('combobox');
			expect(selectElement).toBeInTheDocument();

			// Wait for API call to complete and data to be loaded
			await waitFor(() => {
				expect(getFieldValues).toHaveBeenCalledWith(
					'traces',
					'service.name',
					'',
					'2023-01-01T00:00:00Z',
					'2023-01-02T00:00:00Z',
					'',
				);
			});

			// Open dropdown to check available options
			await act(async () => {
				fireEvent.mouseDown(selectElement);
			});

			// Wait for dropdown to populate with API data
			await waitFor(() => {
				expect(
					screen.getByRole('option', { name: 'frontend' }),
				).toBeInTheDocument();
			});

			expect(screen.getByRole('option', { name: 'backend' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'database' })).toBeInTheDocument();
			expect(screen.getByRole('option', { name: 'cache' })).toBeInTheDocument();

			// Check if the first value 'frontend' is selected (active)
			const frontendOption = screen.getByRole('option', { name: 'frontend' });
			expect(frontendOption).toHaveClass('active');
		});
	});

	describe('Multi Select Default Values - ALL Enabled', () => {
		it('should use default value when no previous selection exists', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'services',
				type: 'DYNAMIC',
				multiSelect: true,
				showALLOption: true,
				defaultValue: (['backend', 'database'] as unknown) as string,
				selectedValue: undefined,
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'services',
				'var1',
				['backend', 'database'],
				true,
				true,
			);
		});

		it('should preserve previous selection over default', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'services',
				type: 'DYNAMIC',
				multiSelect: true,
				showALLOption: true,
				defaultValue: (['backend'] as unknown) as string,
				selectedValue: ['frontend', 'cache'],
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Should NOT call onValueUpdate since previous selection exists
			expect(mockOnValueUpdate).not.toHaveBeenCalledWith();

			// The component shows individual selected values ['frontend', 'cache']
			// when specific values are selected (not ALL)
			expect(screen.getByText('frontend')).toBeInTheDocument();
			expect(screen.getByText('cache')).toBeInTheDocument();

			// Verify that the multi-select wrapper is present
			const multiselectWrapper = screen
				.getByTestId('variable-select')
				.closest('.custom-multiselect-wrapper');
			expect(multiselectWrapper).toBeInTheDocument();

			// Verify that 'backend' (default value) is NOT displayed since previous selection takes priority
			expect(screen.queryByText('backend')).not.toBeInTheDocument();
		});

		it('should default to ALL when no default and no previous selection', async () => {
			const variableData: IDashboardVariable = {
				id: 'var21',
				name: 'services',
				type: 'DYNAMIC',
				multiSelect: true,
				showALLOption: true,
				defaultValue: undefined,
				selectedValue: undefined,
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Open dropdown to check if ALL option is selected
			const selectElement = screen.getByRole('combobox');
			await act(async () => {
				fireEvent.mouseDown(selectElement);
			});

			// Check if ALL option is present in dropdown
			const allOption = screen.getByText('ALL');
			expect(allOption).toBeInTheDocument();

			// Verify that the ALL option is available for selection
			const allOptionContainer = allOption.closest(
				'.option-item, .ant-select-item-option',
			);
			expect(allOptionContainer).toBeInTheDocument();

			// Check if the checkbox exists (it should be unchecked initially)
			const checkbox = allOptionContainer?.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			expect(checkbox).toBeInTheDocument();

			// Should call onValueUpdate with all values (ALL selection)
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'services',
				'var21',
				[], // Empty array when allSelected is true
				true, // allSelected = true
				false,
			);
		});
	});

	describe('Multi Select Default Values - ALL Disabled', () => {
		it('should use default value over first value when provided', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'services',
				type: 'DYNAMIC',
				multiSelect: true,
				showALLOption: false,
				defaultValue: (['database', 'cache'] as unknown) as string,
				selectedValue: undefined,
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
				allSelected: false,
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Should call onValueUpdate with default values
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'services',
				'var1',
				['database', 'cache'],
				true,
				true,
			);
		});
	});

	describe('ALL Option Special Value', () => {
		it('should display ALL correctly when all values are selected', async () => {
			const variableData: IDashboardVariable = {
				id: 'var1',
				name: 'services',
				type: 'DYNAMIC',
				multiSelect: true,
				showALLOption: true,
				allSelected: true,
				selectedValue: ['frontend', 'backend', 'database', 'cache'],
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'Traces',
				description: '',
				sort: 'DISABLED',
			};

			await act(async () => {
				renderWithQueryClient(
					<DynamicVariableSelection
						variableData={variableData}
						existingVariables={{ var1: variableData }}
						onValueUpdate={mockOnValueUpdate}
					/>,
				);
			});

			// Component should render without errors
			expect(screen.getByText('$services')).toBeInTheDocument();

			// Check if ALL is displayed in the UI (in the main selection area)
			const allTextElement = screen.getByText('ALL');
			expect(allTextElement).toBeInTheDocument();

			// Verify that the ALL selection wrapper is present and has correct class
			const allSelectedWrapper = allTextElement.closest(
				'.custom-multiselect-wrapper',
			);
			expect(allSelectedWrapper).toHaveClass('all-selected');

			// Open dropdown to check if ALL option is selected/active
			const selectElement = screen.getByRole('combobox');
			await act(async () => {
				fireEvent.mouseDown(selectElement);
			});

			// Wait for API data to be loaded and dropdown to populate
			await waitFor(() => {
				expect(getFieldValues).toHaveBeenCalledWith(
					'traces',
					'service.name',
					'',
					'2023-01-01T00:00:00Z',
					'2023-01-02T00:00:00Z',
					'',
				);
			});

			// Check if ALL option is present in dropdown and selected
			// Use getAllByText to get all ALL elements and find the one in dropdown
			const allElements = screen.getAllByText('ALL');
			expect(allElements.length).toBeGreaterThan(1); // Should have ALL in UI and dropdown

			// Find the ALL option in the dropdown (should have the 'all-option' class)
			const dropdownAllOption = screen.getByRole('option', { name: 'ALL' });
			expect(dropdownAllOption).toBeInTheDocument();
			expect(dropdownAllOption).toHaveClass('all-option');
			expect(dropdownAllOption).toHaveClass('selected');

			// Check if the checkbox for ALL option is checked
			const checkbox = dropdownAllOption.querySelector(
				'input[type="checkbox"]',
			) as HTMLInputElement;
			expect(checkbox).toBeInTheDocument();
			expect(checkbox.checked).toBe(true);
		});
	});
});
