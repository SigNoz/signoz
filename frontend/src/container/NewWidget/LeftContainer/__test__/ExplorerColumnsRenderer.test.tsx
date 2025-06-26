/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable react/jsx-props-no-spreading */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import React from 'react';
import { DropResult } from 'react-beautiful-dnd';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import ExplorerColumnsRenderer from '../ExplorerColumnsRenderer';

// Mock hooks
jest.mock('hooks/queryBuilder/useQueryBuilder');
jest.mock('hooks/queryBuilder/useGetAggregateKeys');

// Mock react-beautiful-dnd
let onDragEndMock: ((result: DropResult) => void) | undefined;

jest.mock('react-beautiful-dnd', () => ({
	DragDropContext: jest.fn(
		({
			children,
			onDragEnd,
		}: {
			children: React.ReactNode;
			onDragEnd: (result: any) => void;
		}) => {
			onDragEndMock = onDragEnd;
			return children;
		},
	),
	Droppable: jest.fn(
		({ children }: { children: (provided: any) => React.ReactNode }) =>
			children({
				draggableProps: { style: {} },
				innerRef: jest.fn(),
				placeholder: null,
			}),
	),
	Draggable: jest.fn(
		({ children }: { children: (provided: any) => React.ReactNode }) =>
			children({
				draggableProps: { style: {} },
				innerRef: jest.fn(),
				dragHandleProps: {},
			}),
	),
}));

describe('ExplorerColumnsRenderer', () => {
	const mockSetSelectedLogFields = jest.fn();
	const mockSetSelectedTracesFields = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset mock implementations for useQueryBuilder and useGetAggregateKeys before each test
		// to ensure a clean state for each test case unless explicitly overridden.
		(useQueryBuilder as jest.Mock).mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							dataSource: DataSource.LOGS,
							aggregateOperator: 'count',
						},
					],
				},
			},
		});
		(useGetAggregateKeys as jest.Mock).mockReturnValue({
			data: {
				payload: {
					attributeKeys: [
						{ key: 'attribute1', dataType: 'string', type: '' },
						{ key: 'attribute2', dataType: 'string', type: '' },
						{ key: 'another_attribute', dataType: 'string', type: '' },
					],
				},
			},
			isLoading: false,
			isError: false,
		});
	});

	it('renders correctly with default props and displays "Columns" title', () => {
		render(
			<ExplorerColumnsRenderer
				selectedLogFields={[]}
				setSelectedLogFields={mockSetSelectedLogFields}
				selectedTracesFields={[]}
				setSelectedTracesFields={mockSetSelectedTracesFields}
			/>,
		);

		expect(screen.getByText('Columns')).toBeInTheDocument();
		expect(screen.getByTestId('add-columns-button')).toBeInTheDocument();
	});

	it('displays error message when data fetching fails', () => {
		(useGetAggregateKeys as jest.Mock).mockReturnValueOnce({
			data: undefined,
			isLoading: false,
			isError: true,
		});

		render(
			<ExplorerColumnsRenderer
				selectedLogFields={[]}
				setSelectedLogFields={mockSetSelectedLogFields}
				selectedTracesFields={[]}
				setSelectedTracesFields={mockSetSelectedTracesFields}
			/>,
		);

		expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
	});

	it('opens and closes the dropdown', async () => {
		render(
			<ExplorerColumnsRenderer
				selectedLogFields={[]}
				setSelectedLogFields={mockSetSelectedLogFields}
				selectedTracesFields={[]}
				setSelectedTracesFields={mockSetSelectedTracesFields}
			/>,
		);

		const addButton = screen.getByTestId('add-columns-button');
		await userEvent.click(addButton);

		expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
		expect(screen.getByText('attribute1')).toBeInTheDocument();

		await userEvent.click(addButton);
		await waitFor(() => {
			expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		});
	});

	it('filters attribute keys based on search text', async () => {
		render(
			<ExplorerColumnsRenderer
				selectedLogFields={[]}
				setSelectedLogFields={mockSetSelectedLogFields}
				selectedTracesFields={[]}
				setSelectedTracesFields={mockSetSelectedTracesFields}
			/>,
		);

		await userEvent.click(screen.getByTestId('add-columns-button'));

		const searchInput = screen.getByPlaceholderText('Search');
		await userEvent.type(searchInput, 'another');

		await waitFor(() => {
			expect(screen.queryByText('attribute1')).not.toBeInTheDocument();
			expect(screen.getByText('another_attribute')).toBeInTheDocument();
		});

		await userEvent.clear(searchInput);
		await userEvent.type(searchInput, 'attribute');

		await waitFor(() => {
			expect(screen.getByText('attribute1')).toBeInTheDocument();
			expect(screen.getByText('attribute2')).toBeInTheDocument();
			expect(screen.getByText('another_attribute')).toBeInTheDocument();
		});
	});

	describe('Log Data Source', () => {
		it('adds a log field when checkbox is checked', async () => {
			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			await userEvent.click(screen.getByTestId('add-columns-button'));
			const checkbox = screen.getByLabelText('attribute1');
			await userEvent.click(checkbox);

			expect(mockSetSelectedLogFields).toHaveBeenCalledWith([
				{ dataType: 'string', name: 'attribute1', type: '' },
			]);
		});

		it('removes a log field when checkbox is unchecked', async () => {
			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[{ dataType: 'string', name: 'attribute1', type: '' }]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			await userEvent.click(screen.getByTestId('add-columns-button'));
			const checkbox = screen.getByLabelText('attribute1');
			await userEvent.click(checkbox);

			expect(mockSetSelectedLogFields).toHaveBeenCalledWith([]);
		});

		it('removes a log field using the trash icon', async () => {
			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[{ dataType: 'string', name: 'attribute1', type: '' }]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			expect(screen.getByText('attribute1')).toBeInTheDocument();
			const trashIcon = screen.getByTestId('trash-icon');
			await userEvent.click(trashIcon);

			expect(mockSetSelectedLogFields).toHaveBeenCalledWith([]);
		});

		it('reorders log fields on drag and drop', () => {
			const initialSelectedFields = [
				{ dataType: 'string', name: 'field1', type: '' },
				{ dataType: 'string', name: 'field2', type: '' },
			];

			render(
				<ExplorerColumnsRenderer
					selectedLogFields={initialSelectedFields}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			const field1Element = screen.getByText('field1');
			const dragDropContext = field1Element.closest('.explorer-columns');

			if (dragDropContext && onDragEndMock) {
				// Simulate onDragEnd directly
				onDragEndMock({
					source: { index: 0, droppableId: 'drag-drop-list' },
					destination: { index: 1, droppableId: 'drag-drop-list' },
					draggableId: '0',
					type: 'DEFAULT',
					reason: 'DROP',
					combine: undefined,
					mode: 'FLUID',
				});

				expect(mockSetSelectedLogFields).toHaveBeenCalledWith([
					{ dataType: 'string', name: 'field2', type: '' },
					{ dataType: 'string', name: 'field1', type: '' },
				]);
			} else {
				fail('DragDropContext or onDragEndMock not found');
			}
		});
	});

	describe('Trace Data Source', () => {
		beforeEach(() => {
			(useQueryBuilder as jest.Mock).mockReturnValue({
				currentQuery: {
					builder: {
						queryData: [
							{
								dataSource: DataSource.TRACES,
								aggregateOperator: 'count',
							},
						],
					},
				},
			});

			(useGetAggregateKeys as jest.Mock).mockReturnValue({
				data: {
					payload: {
						attributeKeys: [
							{ key: 'trace_attribute1', dataType: 'string', type: 'tag' },
							{ key: 'trace_attribute2', dataType: 'string', type: 'tag' },
						],
					},
				},
				isLoading: false,
				isError: false,
			});
		});

		it('adds a trace field when checkbox is checked', async () => {
			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			await userEvent.click(screen.getByTestId('add-columns-button'));
			const checkbox = screen.getByLabelText('trace_attribute1');
			await userEvent.click(checkbox);

			expect(mockSetSelectedTracesFields).toHaveBeenCalledWith([
				{ key: 'trace_attribute1', dataType: 'string', type: 'tag' },
			]);
		});

		it('removes a trace field when checkbox is unchecked', async () => {
			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[
						{ key: 'trace_attribute1', dataType: DataTypes.String, type: 'tag' },
					]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			await userEvent.click(screen.getByTestId('add-columns-button'));
			const checkbox = screen.getByLabelText('trace_attribute1');
			await userEvent.click(checkbox);

			expect(mockSetSelectedTracesFields).toHaveBeenCalledWith([]);
		});

		it('removes a trace field using the trash icon', async () => {
			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={[
						{ key: 'trace_attribute1', dataType: DataTypes.String, type: 'tag' },
					]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			expect(screen.getByText('trace_attribute1')).toBeInTheDocument();
			const trashIcon = screen.getByTestId('trash-icon');
			await userEvent.click(trashIcon);

			expect(mockSetSelectedTracesFields).toHaveBeenCalledWith([]);
		});

		it('reorders trace fields on drag and drop', () => {
			const initialSelectedFields = [
				{ key: 'trace_field1', dataType: 'string', type: 'tag' },
				{ key: 'trace_field2', dataType: 'string', type: 'tag' },
			];

			render(
				<ExplorerColumnsRenderer
					selectedLogFields={[]}
					setSelectedLogFields={mockSetSelectedLogFields}
					selectedTracesFields={initialSelectedFields as BaseAutocompleteData[]}
					setSelectedTracesFields={mockSetSelectedTracesFields}
				/>,
			);

			const traceField1Element = screen.getByText('trace_field1');
			const dragDropContext = traceField1Element.closest('.explorer-columns');
			if (dragDropContext && onDragEndMock) {
				// Simulate onDragEnd directly
				onDragEndMock({
					source: { index: 0, droppableId: 'drag-drop-list' },
					destination: { index: 1, droppableId: 'drag-drop-list' },
					draggableId: '0',
					type: 'DEFAULT',
					reason: 'DROP',
					combine: undefined,
					mode: 'FLUID',
				});

				expect(mockSetSelectedTracesFields).toHaveBeenCalledWith([
					{ key: 'trace_field2', dataType: 'string', type: 'tag' },
					{ key: 'trace_field1', dataType: 'string', type: 'tag' },
				]);
			} else {
				fail('DragDropContext or onDragEndMock not found');
			}
		});
	});
});
