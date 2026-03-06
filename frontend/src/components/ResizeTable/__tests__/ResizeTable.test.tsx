import { act } from 'react-dom/test-utils';
import { render, screen } from 'tests/test-utils';

import ResizeTable from '../ResizeTable';

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

	it('renders with drag column support when onDragColumn is provided', () => {
		const onDragColumn = jest.fn();

		render(
			<ResizeTable
				columns={baseColumns}
				dataSource={baseDataSource}
				rowKey="key"
				onDragColumn={onDragColumn}
			/>,
		);

		// When drag is enabled, column titles are wrapped in drag spans
		// The table should still render the columns
		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByText('Value')).toBeInTheDocument();
	});
});
