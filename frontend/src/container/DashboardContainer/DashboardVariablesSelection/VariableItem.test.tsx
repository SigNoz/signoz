import React, { useEffect } from 'react';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import '@testing-library/jest-dom/extend-expect';

import VariableItem from './VariableItem';

const mockVariableData: IDashboardVariable = {
	id: 'test_variable',
	description: 'Test Variable',
	type: 'TEXTBOX',
	textboxValue: 'defaultValue',
	sort: 'DISABLED',
	multiSelect: false,
	showALLOption: false,
	name: 'testVariable',
};

// New mock data for a custom variable
const mockCustomVariableData: IDashboardVariable = {
	...mockVariableData,
	name: 'customVariable',
	type: 'CUSTOM',
	customValue: 'option1,option2,option3',
};

const mockOnValueUpdate = jest.fn();

describe('VariableItem', () => {
	let useEffectSpy: jest.SpyInstance;

	beforeEach(() => {
		useEffectSpy = jest.spyOn(React, 'useEffect');
	});

	afterEach(() => {
		jest.clearAllMocks();
		useEffectSpy.mockRestore();
	});

	test('renders component with default props', () => {
		render(
			<MockQueryClientProvider>
				<VariableItem
					variableData={mockVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					variablesToGetUpdated={[]}
					setVariablesToGetUpdated={(): void => {}}
					dependencyData={{
						order: [],
						graph: {},
						parentDependencyGraph: {},
						hasCycle: false,
					}}
				/>
			</MockQueryClientProvider>,
		);

		expect(screen.getByText('$testVariable')).toBeInTheDocument();
	});

	test('renders Input when the variable type is TEXTBOX', () => {
		render(
			<MockQueryClientProvider>
				<VariableItem
					variableData={mockVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					variablesToGetUpdated={[]}
					setVariablesToGetUpdated={(): void => {}}
					dependencyData={{
						order: [],
						graph: {},
						parentDependencyGraph: {},
						hasCycle: false,
					}}
				/>
			</MockQueryClientProvider>,
		);
		expect(
			screen.getByTestId('variable-textbox-test_variable'),
		).toBeInTheDocument();
	});

	test('calls onValueUpdate when Input value changes and blurs', async () => {
		render(
			<MockQueryClientProvider>
				<VariableItem
					variableData={mockVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					variablesToGetUpdated={[]}
					setVariablesToGetUpdated={(): void => {}}
					dependencyData={{
						order: [],
						graph: {},
						parentDependencyGraph: {},
						hasCycle: false,
					}}
				/>
			</MockQueryClientProvider>,
		);

		const inputElement = screen.getByTestId('variable-textbox-test_variable');

		// Change the value
		act(() => {
			fireEvent.change(inputElement, { target: { value: 'newValue' } });
		});

		// Blur the input to trigger the update
		act(() => {
			fireEvent.blur(inputElement);
		});

		await waitFor(() => {
			expect(mockOnValueUpdate).toHaveBeenCalledWith(
				'testVariable',
				'test_variable',
				'newValue',
				false,
			);
		});
	});

	test('renders a Select element when variable type is CUSTOM', () => {
		render(
			<MockQueryClientProvider>
				<VariableItem
					variableData={mockCustomVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					variablesToGetUpdated={[]}
					setVariablesToGetUpdated={(): void => {}}
					dependencyData={{
						order: [],
						graph: {},
						parentDependencyGraph: {},
						hasCycle: false,
					}}
				/>
			</MockQueryClientProvider>,
		);

		expect(screen.getByText('$customVariable')).toBeInTheDocument();
		expect(screen.getByTestId('variable-select')).toBeInTheDocument();
	});

	test('renders a Select element with all selected', async () => {
		const customVariableData = {
			...mockCustomVariableData,
			allSelected: true,
			showALLOption: true,
			multiSelect: true,
		};

		render(
			<MockQueryClientProvider>
				<VariableItem
					variableData={customVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					variablesToGetUpdated={[]}
					setVariablesToGetUpdated={(): void => {}}
					dependencyData={{
						order: [],
						graph: {},
						parentDependencyGraph: {},
						hasCycle: false,
					}}
				/>
			</MockQueryClientProvider>,
		);

		expect(screen.getByText('ALL')).toBeInTheDocument();
	});

	test('calls useEffect when the component mounts', () => {
		render(
			<MockQueryClientProvider>
				<VariableItem
					variableData={mockCustomVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					variablesToGetUpdated={[]}
					setVariablesToGetUpdated={(): void => {}}
					dependencyData={{
						order: [],
						graph: {},
						parentDependencyGraph: {},
						hasCycle: false,
					}}
				/>
			</MockQueryClientProvider>,
		);

		expect(useEffect).toHaveBeenCalled();
	});
});
