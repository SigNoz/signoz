import { act } from '@testing-library/react';
import { render, screen, userEvent } from 'tests/test-utils';

import ResizeTable from '../ResizeTable';

jest.mock('react-resizable', () => ({
	Resizable: ({
		children,
		onResize,
		width,
	}: {
		children: React.ReactNode;
		onResize: (
			e: React.SyntheticEvent,
			data: { size: { width: number } },
		) => void;
		width: number;
	}): JSX.Element => (
		<div>
			{children}
			<button
				data-testid="resize-trigger"
				type="button"
				onClick={(e): void => onResize(e, { size: { width: width + 50 } })}
			/>
		</div>
	),
}));

// Make debounce synchronous so onColumnWidthsChange fires immediately
jest.mock('lodash-es', () => ({
	...jest.requireActual('lodash-es'),
	debounce: (fn: (...args: any[]) => any): ((...args: any[]) => any) => fn,
}));

const baseColumns = [
	{ dataIndex: 'name', title: 'Name', width: 100 },
	{ dataIndex: 'value', title: 'Value', width: 100 },
];

const baseDataSource = [
	{ key: '1', name: 'Alice', value: 42 },
	{ key: '2', name: 'Bob', value: 99 },
];

describe('ResizeTable', () => {
	it('renders column headers and data rows', () => {
		render(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
			/>,
		);

		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByText('Value')).toBeInTheDocument();
		expect(screen.getByText('Alice')).toBeInTheDocument();
		expect(screen.getByText('Bob')).toBeInTheDocument();
	});

	it('overrides column widths from columnWidths prop and reports them via onColumnWidthsChange', () => {
		const onColumnWidthsChange = jest.fn();

		act(() => {
			render(
				<ResizeTable
					columns={baseColumns}
					dataSource={baseDataSource}
					rowKey="key"
					columnWidths={{ name: 250, value: 180 }}
					onColumnWidthsChange={onColumnWidthsChange}
				/>,
			);
		});

		expect(onColumnWidthsChange).toHaveBeenCalledWith(
			expect.objectContaining({ name: 250, value: 180 }),
		);
	});

	it('reports original column widths via onColumnWidthsChange when columnWidths prop is not provided', () => {
		const onColumnWidthsChange = jest.fn();

		act(() => {
			render(
				<ResizeTable
					columns={baseColumns}
					dataSource={baseDataSource}
					rowKey="key"
					onColumnWidthsChange={onColumnWidthsChange}
				/>,
			);
		});

		expect(onColumnWidthsChange).toHaveBeenCalledWith(
			expect.objectContaining({ name: 100, value: 100 }),
		);
	});

	it('does not call onColumnWidthsChange when it is not provided', () => {
		// Should render without errors and without attempting to call an undefined callback
		expect(() => {
			render(
				<ResizeTable
					columns={baseColumns}
					dataSource={baseDataSource}
					rowKey="key"
				/>,
			);
		}).not.toThrow();
	});

	it('only overrides the column that has a stored width, leaving others at their original width', () => {
		const onColumnWidthsChange = jest.fn();

		act(() => {
			render(
				<ResizeTable
					columns={baseColumns}
					dataSource={baseDataSource}
					rowKey="key"
					columnWidths={{ name: 250 }}
					onColumnWidthsChange={onColumnWidthsChange}
				/>,
			);
		});

		expect(onColumnWidthsChange).toHaveBeenCalledWith(
			expect.objectContaining({ name: 250, value: 100 }),
		);
	});

	it('does not call onColumnWidthsChange on re-render when widths have not changed', () => {
		const onColumnWidthsChange = jest.fn();

		const { rerender } = render(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
				onColumnWidthsChange={onColumnWidthsChange}
			/>,
		);

		expect(onColumnWidthsChange).toHaveBeenCalledTimes(1);
		onColumnWidthsChange.mockClear();

		rerender(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
				onColumnWidthsChange={onColumnWidthsChange}
			/>,
		);

		expect(onColumnWidthsChange).not.toHaveBeenCalled();
	});

	it('does not call onColumnWidthsChange when no column has a defined width', () => {
		const onColumnWidthsChange = jest.fn();

		render(
			<ResizeTable
				columns={[
					{ dataIndex: 'name', title: 'Name' },
					{ dataIndex: 'value', title: 'Value' },
				]}
				dataSource={baseDataSource}
				rowKey="key"
				onColumnWidthsChange={onColumnWidthsChange}
			/>,
		);

		expect(onColumnWidthsChange).not.toHaveBeenCalled();
	});

	it('calls onColumnWidthsChange with the new width after a column is resized', async () => {
		const user = userEvent.setup();
		const onColumnWidthsChange = jest.fn();

		render(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
				onColumnWidthsChange={onColumnWidthsChange}
			/>,
		);

		onColumnWidthsChange.mockClear();

		// Click the first column's resize trigger — mock adds 50px to the current width (100 → 150)
		const [firstResizeTrigger] = screen.getAllByTestId('resize-trigger');
		await user.click(firstResizeTrigger);

		expect(onColumnWidthsChange).toHaveBeenCalledWith(
			expect.objectContaining({ name: 150, value: 100 }),
		);
	});

	it('does not affect other columns when only one column is resized', async () => {
		const user = userEvent.setup();
		const onColumnWidthsChange = jest.fn();

		render(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
				onColumnWidthsChange={onColumnWidthsChange}
			/>,
		);

		onColumnWidthsChange.mockClear();

		// Resize only the second column (value: 100 → 150), name should stay at 100
		const resizeTriggers = screen.getAllByTestId('resize-trigger');
		await user.click(resizeTriggers[1]);

		expect(onColumnWidthsChange).toHaveBeenCalledWith(
			expect.objectContaining({ name: 100, value: 150 }),
		);
	});

	it('wraps column titles in drag handler spans when onDragColumn is provided', () => {
		const onDragColumn = jest.fn();

		render(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
				onDragColumn={onDragColumn}
			/>,
		);

		const dragTitles = screen.getAllByTestId('drag-column-title');
		expect(dragTitles).toHaveLength(baseColumns.length);
		expect(dragTitles[0]).toHaveTextContent('Name');
		expect(dragTitles[1]).toHaveTextContent('Value');
	});
});
