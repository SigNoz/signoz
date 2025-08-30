/* eslint-disable sonarjs/no-duplicate-string */
import '@testing-library/jest-dom/extend-expect';

import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { render, screen, waitFor } from 'tests/test-utils';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import VariableItem from '../VariableItem';

const mockOnValueUpdate = jest.fn();
const mockSetVariablesToGetUpdated = jest.fn();

const baseDependencyData = {
	order: [],
	graph: {},
	parentDependencyGraph: {},
	hasCycle: false,
};

const TEST_VARIABLE_ID = 'test_variable';
const VARIABLE_SELECT_TESTID = 'variable-select';
const TEST_VARIABLE_NAME = 'testVariable';
const TEST_VARIABLE_DESCRIPTION = 'Test Variable';

const renderVariableItem = (
	variableData: IDashboardVariable,
): ReturnType<typeof render> =>
	render(
		<MockQueryClientProvider>
			<VariableItem
				variableData={variableData}
				existingVariables={{}}
				onValueUpdate={mockOnValueUpdate}
				variablesToGetUpdated={[]}
				setVariablesToGetUpdated={mockSetVariablesToGetUpdated}
				dependencyData={baseDependencyData}
			/>
		</MockQueryClientProvider>,
	);

describe('VariableItem Default Value Selection Behavior', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Single Select Variables', () => {
		test('should keep previous selection value', async () => {
			const variable: IDashboardVariable = {
				id: TEST_VARIABLE_ID,
				name: TEST_VARIABLE_NAME,
				description: TEST_VARIABLE_DESCRIPTION,
				type: 'CUSTOM',
				customValue: 'option1,option2,option3',
				selectedValue: 'option1',
				sort: 'DISABLED',
				multiSelect: false,
				showALLOption: false,
			};

			renderVariableItem(variable);

			await waitFor(() => {
				expect(screen.getByTestId(VARIABLE_SELECT_TESTID)).toBeInTheDocument();
			});

			expect(screen.getByText('option1')).toBeInTheDocument();
		});

		test('should show placeholder when no previous and no default', async () => {
			const variable: IDashboardVariable = {
				id: TEST_VARIABLE_ID,
				name: TEST_VARIABLE_NAME,
				description: TEST_VARIABLE_DESCRIPTION,
				type: 'CUSTOM',
				customValue: 'option1,option2,option3',
				selectedValue: undefined,
				sort: 'DISABLED',
				multiSelect: false,
				showALLOption: false,
			};

			renderVariableItem(variable);

			await waitFor(() => {
				expect(screen.getByTestId(VARIABLE_SELECT_TESTID)).toBeInTheDocument();
			});

			expect(screen.getByText('Select value')).toBeInTheDocument();
		});
	});

	describe('Multi Select Variables with ALL enabled', () => {
		test('should show ALL when all options are selected', async () => {
			const variable: IDashboardVariable = {
				id: TEST_VARIABLE_ID,
				name: TEST_VARIABLE_NAME,
				description: TEST_VARIABLE_DESCRIPTION,
				type: 'CUSTOM',
				customValue: 'option1,option2,option3',
				selectedValue: ['option1', 'option2', 'option3'],
				allSelected: true,
				sort: 'DISABLED',
				multiSelect: true,
				showALLOption: true,
			};

			renderVariableItem(variable);

			await waitFor(() => {
				expect(screen.getByTestId(VARIABLE_SELECT_TESTID)).toBeInTheDocument();
			});

			expect(screen.getByText('ALL')).toBeInTheDocument();
		});
	});

	describe('Multi Select Variables with ALL disabled', () => {
		test('should show placeholder when no selection', async () => {
			const variable: IDashboardVariable = {
				id: TEST_VARIABLE_ID,
				name: TEST_VARIABLE_NAME,
				description: TEST_VARIABLE_DESCRIPTION,
				type: 'CUSTOM',
				customValue: 'option1,option2,option3',
				selectedValue: undefined,
				sort: 'DISABLED',
				multiSelect: true,
				showALLOption: false,
			};

			renderVariableItem(variable);

			await waitFor(() => {
				expect(screen.getByTestId(VARIABLE_SELECT_TESTID)).toBeInTheDocument();
			});

			expect(screen.getByText('Select value')).toBeInTheDocument();
		});
	});
});
