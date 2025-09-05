/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import VariableItem from '../DashboardSettings/Variables/VariableItem/VariableItem';

// Mock dependencies
jest.mock('api/dashboard/variables/dashboardVariablesQuery');
jest.mock('hooks/dynamicVariables/useGetFieldValues', () => ({
	useGetFieldValues: (): any => ({
		data: {
			payload: {
				normalizedValues: ['frontend', 'backend', 'database'],
			},
		},
		isLoading: false,
		error: null,
	}),
}));
jest.mock('components/Editor', () => {
	function MockEditor({
		value,
		onChange,
	}: {
		value: string;
		onChange: (value: string) => void;
	}): JSX.Element {
		return (
			<textarea
				data-testid="sql-editor"
				value={value}
				onChange={(e): void => onChange(e.target.value)}
			/>
		);
	}
	MockEditor.displayName = 'MockEditor';
	return MockEditor;
});

const mockStore = configureStore([])(() => ({
	globalTime: {
		minTime: '2023-01-01T00:00:00Z',
		maxTime: '2023-01-02T00:00:00Z',
	},
}));

const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

function TestWrapper({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<Provider store={mockStore}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</Provider>
	);
}
TestWrapper.displayName = 'TestWrapper';

describe('VariableItem Component - Creation Flow', () => {
	const mockOnSave = jest.fn();
	const mockOnCancel = jest.fn();
	const mockValidateName = jest.fn();
	const mockValidateAttributeKey = jest.fn();
	// Constants to avoid string duplication
	const VARIABLE_NAME_PLACEHOLDER = 'Unique name of the variable';
	const VARIABLE_DESCRIPTION_PLACEHOLDER =
		'Enter a description for the variable';
	const SAVE_BUTTON_TEXT = 'Save Variable';
	const DISCARD_BUTTON_TEXT = 'Discard';

	const defaultProps = {
		variableData: {} as IDashboardVariable,
		existingVariables: {},
		onCancel: mockOnCancel,
		onSave: mockOnSave,
		validateName: mockValidateName,
		mode: 'ADD' as const,
		validateAttributeKey: mockValidateAttributeKey,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockValidateName.mockReturnValue(true);
	});

	describe('Dynamic Variable Creation', () => {
		it('should switch between variable types correctly', () => {
			render(
				<TestWrapper>
					<VariableItem {...defaultProps} />
				</TestWrapper>,
			);

			// Test switching to different variable types
			const textboxButton = screen.getByText('Textbox');
			fireEvent.click(textboxButton);
			// Check if the button has the selected class or is in selected state
			expect(textboxButton.closest('button')).toHaveClass('selected');

			const customButton = screen.getByText('Custom');
			fireEvent.click(customButton);
			expect(customButton.closest('button')).toHaveClass('selected');

			const queryButton = screen.getByText('Query');
			fireEvent.click(queryButton);
			expect(queryButton.closest('button')).toHaveClass('selected');

			// Verify SQL editor appears for QUERY type
			expect(screen.getByTestId('sql-editor')).toBeInTheDocument();
		});

		it('should validate variable name and show errors', () => {
			mockValidateName.mockReturnValue(false);

			render(
				<TestWrapper>
					<VariableItem {...defaultProps} />
				</TestWrapper>,
			);

			const nameInput = screen.getByPlaceholderText(VARIABLE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: 'duplicate_name' } });

			// Should show error message
			expect(screen.getByText('Variable name already exists')).toBeInTheDocument();

			// Save button should be disabled
			const saveButton = screen.getByText(SAVE_BUTTON_TEXT);
			expect(saveButton.closest('button')).toBeDisabled();
		});

		it('should detect and prevent cyclic dependencies', async () => {
			const existingVariables = {
				var1: {
					id: 'var1',
					name: 'var1',
					queryValue: 'SELECT * WHERE field = $var2',
					type: 'QUERY',
					description: '',
					sort: 'DISABLED',
					multiSelect: false,
					showALLOption: false,
				} as IDashboardVariable,
				var2: {
					id: 'var2',
					name: 'var2',
					queryValue: 'SELECT * WHERE field = $var1',
					type: 'QUERY',
					description: '',
					sort: 'DISABLED',
					multiSelect: false,
					showALLOption: false,
				} as IDashboardVariable,
			};

			render(
				<TestWrapper>
					<VariableItem {...defaultProps} existingVariables={existingVariables} />
				</TestWrapper>,
			);

			// Fill in name and create a variable that would create cycle
			const nameInput = screen.getByPlaceholderText(VARIABLE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: 'var3' } });

			// Switch to QUERY type
			const queryButton = screen.getByText('Query');
			fireEvent.click(queryButton);

			// Add query that creates dependency
			const sqlEditor = screen.getByTestId('sql-editor');
			fireEvent.change(sqlEditor, {
				target: { value: 'SELECT * WHERE field = $var1' },
			});

			// Try to save
			const saveButton = screen.getByText(SAVE_BUTTON_TEXT);
			fireEvent.click(saveButton);

			// Should show cycle detection error
			await waitFor(() => {
				expect(
					screen.getByText(/Circular dependency detected/),
				).toBeInTheDocument();
			});
		});

		it('should handle cancel button functionality', () => {
			render(
				<TestWrapper>
					<VariableItem {...defaultProps} />
				</TestWrapper>,
			);

			// Fill in some data
			const nameInput = screen.getByPlaceholderText(VARIABLE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: 'test_variable' } });

			// Click cancel
			const cancelButton = screen.getByText(DISCARD_BUTTON_TEXT);
			fireEvent.click(cancelButton);

			// Should call onCancel
			expect(mockOnCancel).toHaveBeenCalledWith(expect.any(Object));
		});

		it('should persist form fields when switching between variable types', () => {
			render(
				<TestWrapper>
					<VariableItem {...defaultProps} />
				</TestWrapper>,
			);

			// Fill in name and description
			const nameInput = screen.getByPlaceholderText(VARIABLE_NAME_PLACEHOLDER);
			const descriptionInput = screen.getByPlaceholderText(
				VARIABLE_DESCRIPTION_PLACEHOLDER,
			);

			fireEvent.change(nameInput, { target: { value: 'persistent_var' } });
			fireEvent.change(descriptionInput, {
				target: { value: 'Persistent description' },
			});

			// Switch to TEXTBOX type
			const textboxButton = screen.getByText('Textbox');
			fireEvent.click(textboxButton);

			// Switch back to DYNAMIC
			const dynamicButton = screen.getByText('Dynamic');
			fireEvent.click(dynamicButton);

			// Name and description should be preserved
			expect(nameInput).toHaveValue('persistent_var');
			expect(descriptionInput).toHaveValue('Persistent description');
		});
	});
});
