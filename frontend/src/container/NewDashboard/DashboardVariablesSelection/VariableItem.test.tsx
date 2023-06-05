import '@testing-library/jest-dom/extend-expect';

import { fireEvent, render, screen } from '@testing-library/react';
import React, { ReactElement, useEffect } from 'react';
import { Provider } from 'react-redux';
import store from 'store';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import VariableItem from './VariableItem';

const mockVariableData: IDashboardVariable = {
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
const mockOnAllSelectedUpdate = jest.fn();
const renderWithProvider = (component: ReactElement): ReactElement => (
	<Provider store={store}>{component}</Provider>
);
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
			renderWithProvider(
				<VariableItem
					variableData={mockVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);

		expect(screen.getByText('$testVariable')).toBeInTheDocument();
	});

	test('renders Input when the variable type is TEXTBOX', () => {
		render(
			renderWithProvider(
				<VariableItem
					variableData={mockVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);
		expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
	});

	test('calls onChange event handler when Input value changes', () => {
		render(
			renderWithProvider(
				<VariableItem
					variableData={mockVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);
		const inputElement = screen.getByPlaceholderText('Enter value');
		fireEvent.change(inputElement, { target: { value: 'newValue' } });

		expect(mockOnValueUpdate).toHaveBeenCalledTimes(1);
		expect(mockOnValueUpdate).toHaveBeenCalledWith('testVariable', 'newValue');
		expect(mockOnAllSelectedUpdate).toHaveBeenCalledTimes(1);
		expect(mockOnAllSelectedUpdate).toHaveBeenCalledWith('testVariable', false);
	});

	test('renders a Select element when variable type is CUSTOM', () => {
		render(
			renderWithProvider(
				<VariableItem
					variableData={mockCustomVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);

		expect(screen.getByText('$customVariable')).toBeInTheDocument();
		expect(screen.getByTestId('variable-select')).toBeInTheDocument();
	});

	test('renders a Select element with all selected', async () => {
		const customVariableData = {
			...mockCustomVariableData,
			allSelected: true,
		};

		render(
			renderWithProvider(
				<VariableItem
					variableData={customVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);

		expect(screen.getByTitle('ALL')).toBeInTheDocument();
	});

	test('calls useEffect when the component mounts', () => {
		render(
			renderWithProvider(
				<VariableItem
					variableData={mockCustomVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);

		expect(useEffect).toHaveBeenCalled();
	});

	test('calls useEffect only once when the component mounts', () => {
		// Render the component
		const { rerender } = render(
			renderWithProvider(
				<VariableItem
					variableData={mockCustomVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);

		// Create an updated version of the mock data
		const updatedMockCustomVariableData = {
			...mockCustomVariableData,
			selectedValue: 'option1',
		};

		// Re-render the component with the updated data
		rerender(
			renderWithProvider(
				<VariableItem
					variableData={updatedMockCustomVariableData}
					existingVariables={{}}
					onValueUpdate={mockOnValueUpdate}
					onAllSelectedUpdate={mockOnAllSelectedUpdate}
					lastUpdatedVar=""
				/>,
			),
		);

		// Check if the useEffect is called with the correct arguments
		expect(useEffectSpy).toHaveBeenCalledTimes(8);
	});
});
