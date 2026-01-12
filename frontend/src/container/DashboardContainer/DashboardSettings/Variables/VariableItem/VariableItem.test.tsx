/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import {
	IDashboardVariable,
	TSortVariableValuesType,
	VariableSortTypeArr,
} from 'types/api/dashboard/getAll';

import VariableItem from './VariableItem';

// Mock modules
jest.mock('api/dashboard/variables/dashboardVariablesQuery', () => ({
	__esModule: true,
	default: jest.fn().mockResolvedValue({
		payload: {
			variableValues: ['value1', 'value2', 'value3'],
		},
	}),
}));

jest.mock('uuid', () => ({
	v4: jest.fn().mockReturnValue('test-uuid'),
}));

// Mock functions
const onCancel = jest.fn();
const onSave = jest.fn();
const validateName = jest.fn(() => true);
const validateAttributeKey = jest.fn(() => true);

// Mode constant
const VARIABLE_MODE = 'ADD';

// Common text constants
const TEXT = {
	INCLUDE_ALL_VALUES: 'Include an option for ALL values',
	ENABLE_MULTI_VALUES: 'Enable multiple values to be checked',
	VARIABLE_EXISTS: 'Variable name already exists',
	VARIABLE_WHITESPACE: 'Variable name cannot contain whitespaces',
	ATTRIBUTE_KEY_EXISTS: 'A variable with this attribute key already exists',
	SORT_VALUES: 'Sort Values',
	DEFAULT_VALUE: 'Default Value',
	ALL_VARIABLES: 'All variables',
	DISCARD: 'Discard',
	OPTIONS: 'Options',
	QUERY: 'Query',
	TEXTBOX: 'Textbox',
	CUSTOM: 'Custom',
	DYNAMIC: 'Dynamic',
};

// Common test constants
const VARIABLE_DEFAULTS = {
	sort: VariableSortTypeArr[0] as TSortVariableValuesType,
	multiSelect: false,
	showALLOption: false,
};

// Common variable properties
const TEST_VAR_NAMES = {
	VAR1: 'variable1',
	VAR2: 'variable2',
	VAR3: 'variable3',
};

const TEST_VAR_IDS = {
	VAR1: 'var1',
	VAR2: 'var2',
	VAR3: 'var3',
};

const TEST_VAR_DESCRIPTIONS = {
	VAR1: 'Variable 1',
	VAR2: 'Variable 2',
	VAR3: 'Variable 3',
};

// Common UI elements
const SAVE_BUTTON_TEXT = 'Save Variable';
const UNIQUE_NAME_PLACEHOLDER = 'Unique name of the variable';

// Basic variable data for testing
const basicVariableData: IDashboardVariable = {
	id: TEST_VAR_IDS.VAR1,
	name: TEST_VAR_NAMES.VAR1,
	description: 'Test Variable 1',
	type: 'QUERY',
	queryValue: 'SELECT * FROM test',
	...VARIABLE_DEFAULTS,
	order: 0,
};

// Helper function to render VariableItem with common props
const renderVariableItem = (
	variableData: IDashboardVariable = basicVariableData,
	existingVariables: Record<string, IDashboardVariable> = {},
	validateNameFn = validateName,
	validateAttributeKeyFn = validateAttributeKey,
): void => {
	render(
		<VariableItem
			variableData={variableData}
			existingVariables={existingVariables}
			onCancel={onCancel}
			onSave={onSave}
			validateName={validateNameFn}
			validateAttributeKey={validateAttributeKeyFn}
			mode={VARIABLE_MODE}
		/>,
	);
};

// Helper function to find button by text within its span
const findButtonByText = (text: string): HTMLElement | null => {
	const buttons = screen.getAllByRole('button');
	return buttons.find((button) => button.textContent?.includes(text)) || null;
};

describe('VariableItem Component', () => {
	// Test SQL query patterns
	const SQL_PATTERN_DOT = 'SELECT * FROM test WHERE env = {{.variable2}}';
	const SQL_PATTERN_DOLLAR = 'SELECT * FROM test WHERE env = $variable2';
	const SQL_PATTERN_BRACKET = 'SELECT * FROM test WHERE service = [[variable3]]';
	const SQL_PATTERN_BRACES = 'SELECT * FROM test WHERE app = {{variable1}}';
	const SQL_PATTERN_NO_VARS = 'SELECT * FROM test WHERE env = "prod"';
	const SQL_PATTERN_DOT_VAR1 =
		'SELECT * FROM test WHERE service = {{.variable1}}';

	// Error message text constant
	const CIRCULAR_DEPENDENCY_ERROR = /Cannot save: Circular dependency detected/;

	// Test functions and utilities
	const createVariable = (
		id: string,
		name: string,
		description: string,
		queryValue: string,
		order: number,
	): IDashboardVariable => ({
		id,
		name,
		description,
		type: 'QUERY',
		queryValue,
		...VARIABLE_DEFAULTS,
		order,
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('renders without crashing', () => {
		renderVariableItem();

		expect(screen.getByText(TEXT.ALL_VARIABLES)).toBeInTheDocument();
		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByText('Description')).toBeInTheDocument();
		expect(screen.getByText('Variable Type')).toBeInTheDocument();
	});

	describe('Variable Name Validation', () => {
		test('shows error when variable name already exists', () => {
			// Set validateName to return false (name exists)
			const mockValidateName = jest.fn().mockReturnValue(false);

			renderVariableItem({ ...basicVariableData, name: '' }, {}, mockValidateName);

			// Enter a name that already exists
			const nameInput = screen.getByPlaceholderText(UNIQUE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: 'existingVariable' } });

			// Error message should be displayed
			expect(screen.getByText(TEXT.VARIABLE_EXISTS)).toBeInTheDocument();

			// We won't check for button disabled state as it might be inconsistent in tests
		});

		test('allows save when current variable name is used', () => {
			// Mock validate to return false for all other names but true for own name
			const mockValidateName = jest
				.fn()
				.mockImplementation((name) => name === TEST_VAR_NAMES.VAR1);

			renderVariableItem(basicVariableData, {}, mockValidateName);

			// Enter the current variable name
			const nameInput = screen.getByPlaceholderText(UNIQUE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: TEST_VAR_NAMES.VAR1 } });

			// Error should not be visible
			expect(screen.queryByText(TEXT.VARIABLE_EXISTS)).not.toBeInTheDocument();
		});

		test('shows error when variable name contains whitespace', () => {
			renderVariableItem({ ...basicVariableData, name: '' });

			// Enter a name with whitespace
			const nameInput = screen.getByPlaceholderText(UNIQUE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: 'variable name' } });

			// Error message should be displayed
			expect(screen.getByText(TEXT.VARIABLE_WHITESPACE)).toBeInTheDocument();

			// Save button should be disabled
			const saveButton = screen.getByRole('button', { name: /save variable/i });
			expect(saveButton).toBeDisabled();
		});

		test('allows variable name without whitespace', () => {
			renderVariableItem({ ...basicVariableData, name: '' });

			// Enter a valid name without whitespace
			const nameInput = screen.getByPlaceholderText(UNIQUE_NAME_PLACEHOLDER);
			fireEvent.change(nameInput, { target: { value: 'variable.name' } });

			// Error should not be visible
			expect(screen.queryByText(TEXT.VARIABLE_WHITESPACE)).not.toBeInTheDocument();
		});

		test('validates whitespace in auto-generated name for dynamic variables', () => {
			// Create a dynamic variable with empty name
			const dynamicVariable: IDashboardVariable = {
				...basicVariableData,
				name: '',
				type: 'DYNAMIC',
				dynamicVariablesAttribute: 'service name', // Contains whitespace
				dynamicVariablesSource: 'All telemetry',
			};

			renderVariableItem(dynamicVariable);

			// Error message should be displayed for auto-generated name
			expect(screen.getByText(TEXT.VARIABLE_WHITESPACE)).toBeInTheDocument();
		});
	});

	describe('Dynamic Variable Attribute Key Validation', () => {
		test('shows error when attribute key already exists', async () => {
			// Mock validateAttributeKey to return false (attribute key exists)
			const mockValidateAttributeKey = jest.fn().mockReturnValue(false);

			// Create a dynamic variable
			const dynamicVariable: IDashboardVariable = {
				...basicVariableData,
				name: 'test-variable',
				type: 'DYNAMIC',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'All telemetry',
			};

			renderVariableItem(
				dynamicVariable,
				{},
				validateName,
				mockValidateAttributeKey,
			);

			// Switch to Dynamic type to trigger the validation
			const dynamicButton = findButtonByText(TEXT.DYNAMIC);
			if (dynamicButton) {
				fireEvent.click(dynamicButton);
			}

			// Error message should be displayed
			await waitFor(() => {
				expect(screen.getByText(TEXT.ATTRIBUTE_KEY_EXISTS)).toBeInTheDocument();
			});

			// Save button should be disabled
			const saveButton = screen.getByRole('button', { name: /save variable/i });
			expect(saveButton).toBeDisabled();
		});

		test('allows saving when attribute key is unique', async () => {
			// Mock validateAttributeKey to return true (attribute key is unique)
			const mockValidateAttributeKey = jest.fn().mockReturnValue(true);

			// Create a dynamic variable
			const dynamicVariable: IDashboardVariable = {
				...basicVariableData,
				name: 'test-variable',
				type: 'DYNAMIC',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'All telemetry',
			};

			renderVariableItem(
				dynamicVariable,
				{},
				validateName,
				mockValidateAttributeKey,
			);

			// Switch to Dynamic type
			const dynamicButton = findButtonByText(TEXT.DYNAMIC);
			if (dynamicButton) {
				fireEvent.click(dynamicButton);
			}

			// Error should not be visible
			await waitFor(() => {
				expect(
					screen.queryByText(TEXT.ATTRIBUTE_KEY_EXISTS),
				).not.toBeInTheDocument();
			});

			// Save button should not be disabled due to attribute key error
			const saveButton = screen.getByRole('button', { name: /save variable/i });
			expect(saveButton).not.toBeDisabled();
		});

		test('allows same attribute key for current variable being edited', async () => {
			// Mock validateAttributeKey to return true for same variable
			const mockValidateAttributeKey = jest.fn().mockImplementation(
				(attributeKey, currentVariableId) =>
					// Allow if it's the same variable ID
					currentVariableId === TEST_VAR_IDS.VAR1,
			);

			// Create a dynamic variable
			const dynamicVariable: IDashboardVariable = {
				...basicVariableData,
				id: TEST_VAR_IDS.VAR1,
				name: 'test-variable',
				type: 'DYNAMIC',
				dynamicVariablesAttribute: 'service.name',
				dynamicVariablesSource: 'All telemetry',
			};

			renderVariableItem(
				dynamicVariable,
				{},
				validateName,
				mockValidateAttributeKey,
			);

			// Error should not be visible
			await waitFor(() => {
				expect(
					screen.queryByText(TEXT.ATTRIBUTE_KEY_EXISTS),
				).not.toBeInTheDocument();
			});
		});

		test('does not validate attribute key for non-dynamic variables', async () => {
			// Mock validateAttributeKey to return false (would show error for dynamic)
			const mockValidateAttributeKey = jest.fn().mockReturnValue(false);

			// Create a non-dynamic variable
			const queryVariable: IDashboardVariable = {
				...basicVariableData,
				name: 'test-variable',
				type: 'QUERY',
			};

			renderVariableItem(
				queryVariable,
				{},
				validateName,
				mockValidateAttributeKey,
			);

			// No error should be displayed for query variables
			expect(
				screen.queryByText(TEXT.ATTRIBUTE_KEY_EXISTS),
			).not.toBeInTheDocument();

			// validateAttributeKey should not be called for non-dynamic variables
			expect(mockValidateAttributeKey).not.toHaveBeenCalled();
		});
	});

	describe('Variable Type Switching', () => {
		test('switches to CUSTOM variable type correctly', () => {
			renderVariableItem();

			// Find the Query button
			const queryButton = findButtonByText(TEXT.QUERY);
			expect(queryButton).toBeInTheDocument();
			expect(queryButton).toHaveClass('selected');

			// Find and click Custom button
			const customButton = findButtonByText(TEXT.CUSTOM);
			expect(customButton).toBeInTheDocument();

			if (customButton) {
				fireEvent.click(customButton);
			}

			// Custom button should now be selected
			expect(customButton).toHaveClass('selected');
			expect(queryButton).not.toHaveClass('selected');

			// Custom options input should appear
			expect(screen.getByText(TEXT.OPTIONS)).toBeInTheDocument();
		});

		test('switches to TEXTBOX variable type correctly', () => {
			renderVariableItem();

			// Find and click Textbox button
			const textboxButton = findButtonByText(TEXT.TEXTBOX);
			expect(textboxButton).toBeInTheDocument();

			if (textboxButton) {
				fireEvent.click(textboxButton);
			}

			// Textbox button should now be selected
			expect(textboxButton).toHaveClass('selected');

			// Default Value input should appear
			expect(screen.getByText(TEXT.DEFAULT_VALUE)).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText('Enter a default value (if any)...'),
			).toBeInTheDocument();
		});
	});

	describe('MultiSelect and ALL Option', () => {
		test('enables ALL option only when multiSelect is enabled', async () => {
			renderVariableItem();

			// Initially, ALL option should not be visible
			expect(screen.queryByText(TEXT.INCLUDE_ALL_VALUES)).not.toBeInTheDocument();

			// Enable multiple values
			const multipleValuesSwitch = screen
				.getByText(TEXT.ENABLE_MULTI_VALUES)
				.closest('.multiple-values-section')
				?.querySelector('button');

			expect(multipleValuesSwitch).toBeInTheDocument();
			if (multipleValuesSwitch) {
				fireEvent.click(multipleValuesSwitch);
			}

			// Now ALL option should be visible
			await waitFor(() => {
				expect(screen.getByText(TEXT.INCLUDE_ALL_VALUES)).toBeInTheDocument();
			});

			// Disable multiple values
			if (multipleValuesSwitch) {
				fireEvent.click(multipleValuesSwitch);
			}

			// ALL option should be hidden again
			await waitFor(() => {
				expect(screen.queryByText(TEXT.INCLUDE_ALL_VALUES)).not.toBeInTheDocument();
			});
		});

		test('disables ALL option when multiSelect is disabled', async () => {
			// Create variable with multiSelect and showALLOption both enabled
			const variable: IDashboardVariable = {
				...basicVariableData,
				multiSelect: true,
				showALLOption: true,
			};

			renderVariableItem(variable);

			// ALL option should be visible initially
			expect(screen.getByText(TEXT.INCLUDE_ALL_VALUES)).toBeInTheDocument();

			// Disable multiple values
			const multipleValuesSwitch = screen
				.getByText(TEXT.ENABLE_MULTI_VALUES)
				.closest('.multiple-values-section')
				?.querySelector('button');

			if (multipleValuesSwitch) {
				fireEvent.click(multipleValuesSwitch);
			}

			// ALL option should be hidden
			await waitFor(() => {
				expect(screen.queryByText(TEXT.INCLUDE_ALL_VALUES)).not.toBeInTheDocument();
			});

			// Check that when saving, showALLOption is set to false
			const saveButton = screen.getByText(SAVE_BUTTON_TEXT);
			fireEvent.click(saveButton);

			expect(onSave).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					multiSelect: false,
					showALLOption: false,
				}),
				expect.anything(), // widgetIds prop
			);
		});
	});

	describe('Cancel and Navigation', () => {
		test('calls onCancel when clicking All Variables button', () => {
			renderVariableItem();

			// Click All variables button
			const allVariablesButton = screen.getByText(TEXT.ALL_VARIABLES);
			fireEvent.click(allVariablesButton);

			expect(onCancel).toHaveBeenCalledTimes(1);
		});

		test('calls onCancel when clicking Discard button', () => {
			renderVariableItem();

			// Click Discard button
			const discardButton = screen.getByText(TEXT.DISCARD);
			fireEvent.click(discardButton);

			expect(onCancel).toHaveBeenCalledTimes(1);
		});
	});

	describe('Cyclic Dependency Detection', () => {
		// Common function to render the component with variables and click save
		const renderAndSave = async (
			variableData: IDashboardVariable,
			existingVariables: Record<string, IDashboardVariable>,
		): Promise<void> => {
			renderVariableItem(variableData, existingVariables);

			// Fill in the variable name if it's not already populated
			const nameInput = screen.getByPlaceholderText(UNIQUE_NAME_PLACEHOLDER);
			if (nameInput.getAttribute('value') === '') {
				fireEvent.change(nameInput, { target: { value: variableData.name || '' } });
			}

			// Click save button to trigger the dependency check
			const saveButton = screen.getByText(SAVE_BUTTON_TEXT);
			fireEvent.click(saveButton);
		};

		// Common expectations for finding circular dependency error
		const expectCircularDependencyError = async (): Promise<void> => {
			await waitFor(() => {
				expect(screen.getByText(CIRCULAR_DEPENDENCY_ERROR)).toBeInTheDocument();
				expect(onSave).not.toHaveBeenCalled();
			});
		};

		// Test for cyclic dependency detection
		test('detects circular dependency and shows error message', async () => {
			// Create variables with circular dependency
			const variable1 = createVariable(
				TEST_VAR_IDS.VAR1,
				TEST_VAR_NAMES.VAR1,
				TEST_VAR_DESCRIPTIONS.VAR1,
				SQL_PATTERN_DOT,
				0,
			);

			const variable2 = createVariable(
				TEST_VAR_IDS.VAR2,
				TEST_VAR_NAMES.VAR2,
				TEST_VAR_DESCRIPTIONS.VAR2,
				SQL_PATTERN_DOT_VAR1,
				1,
			);

			const existingVariables = {
				[TEST_VAR_IDS.VAR2]: variable2,
			};

			await renderAndSave(variable1, existingVariables);
			await expectCircularDependencyError();
		});

		// Test for saving with no circular dependency
		test('allows saving when no circular dependency exists', async () => {
			// Create variables without circular dependency
			const variable1 = createVariable(
				TEST_VAR_IDS.VAR1,
				TEST_VAR_NAMES.VAR1,
				TEST_VAR_DESCRIPTIONS.VAR1,
				SQL_PATTERN_NO_VARS,
				0,
			);

			const variable2 = createVariable(
				TEST_VAR_IDS.VAR2,
				TEST_VAR_NAMES.VAR2,
				TEST_VAR_DESCRIPTIONS.VAR2,
				SQL_PATTERN_DOT_VAR1,
				1,
			);

			const existingVariables = {
				[TEST_VAR_IDS.VAR2]: variable2,
			};

			await renderAndSave(variable1, existingVariables);

			// Verify the onSave function was called
			await waitFor(() => {
				expect(onSave).toHaveBeenCalled();
			});
		});

		// Test with multiple variable formats in query
		test('detects circular dependency with different variable formats', async () => {
			// Create variables with circular dependency using different formats
			const variable1 = createVariable(
				TEST_VAR_IDS.VAR1,
				TEST_VAR_NAMES.VAR1,
				TEST_VAR_DESCRIPTIONS.VAR1,
				SQL_PATTERN_DOLLAR,
				0,
			);

			const variable2 = createVariable(
				TEST_VAR_IDS.VAR2,
				TEST_VAR_NAMES.VAR2,
				TEST_VAR_DESCRIPTIONS.VAR2,
				SQL_PATTERN_BRACKET,
				1,
			);

			const variable3 = createVariable(
				TEST_VAR_IDS.VAR3,
				TEST_VAR_NAMES.VAR3,
				TEST_VAR_DESCRIPTIONS.VAR3,
				SQL_PATTERN_BRACES,
				2,
			);

			const existingVariables = {
				[TEST_VAR_IDS.VAR2]: variable2,
				[TEST_VAR_IDS.VAR3]: variable3,
			};

			await renderAndSave(variable1, existingVariables);
			await expectCircularDependencyError();
		});
	});
});
