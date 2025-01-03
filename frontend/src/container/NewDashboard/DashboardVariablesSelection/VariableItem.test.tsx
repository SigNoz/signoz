import '@testing-library/jest-dom/extend-expect';

import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';
import React, { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

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
					}}
				/>
			</MockQueryClientProvider>,
		);
		expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
	});

	test('calls onChange event handler when Input value changes', async () => {
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
					}}
				/>
			</MockQueryClientProvider>,
		);

		act(() => {
			const inputElement = screen.getByPlaceholderText('Enter value');
			fireEvent.change(inputElement, { target: { value: 'newValue' } });
		});

		await waitFor(() => {
			// expect(mockOnValueUpdate).toHaveBeenCalledTimes(1);
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
					}}
				/>
			</MockQueryClientProvider>,
		);

		expect(screen.getByTitle('ALL')).toBeInTheDocument();
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
					}}
				/>
			</MockQueryClientProvider>,
		);

		expect(useEffect).toHaveBeenCalled();
	});
});
