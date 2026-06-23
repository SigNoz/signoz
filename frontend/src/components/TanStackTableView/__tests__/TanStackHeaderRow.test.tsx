import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TanStackHeaderRow from '../TanStackHeaderRow';
import type { TableColumnDef } from '../types';

jest.mock('@dnd-kit/sortable', () => ({
	useSortable: (): any => ({
		attributes: {},
		listeners: {},
		setNodeRef: jest.fn(),
		setActivatorNodeRef: jest.fn(),
		transform: null,
		transition: null,
		isDragging: false,
	}),
}));

const col = (
	id: string,
	overrides?: Partial<TableColumnDef<unknown>>,
): TableColumnDef<unknown> => ({
	id,
	header: id,
	cell: (): null => null,
	...overrides,
});

const header = {
	id: 'col',
	column: {
		getCanResize: () => true,
		getIsResizing: () => false,
		columnDef: { header: 'col' },
	},
	getResizeHandler: () => jest.fn(),
	getContext: () => ({}),
} as never;

describe('TanStackHeaderRow', () => {
	it('renders column title', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={col('timestamp', { header: 'timestamp' })}
							header={header}
							isDarkMode={false}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);
		expect(screen.getByTitle('Timestamp')).toBeInTheDocument();
	});

	it('shows grip icon when enableMove is not false and pin is not set', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={col('body')}
							header={header}
							isDarkMode={false}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);
		expect(
			screen.getByRole('button', { name: /drag body/i }),
		).toBeInTheDocument();
	});

	it('does NOT show grip icon when pin is set', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={col('indicator', { pin: 'left' })}
							header={header}
							isDarkMode={false}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);
		expect(
			screen.queryByRole('button', { name: /drag/i }),
		).not.toBeInTheDocument();
	});

	it('shows remove button when enableRemove and canRemoveColumn are true', async () => {
		const user = userEvent.setup();
		const onRemoveColumn = jest.fn();
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={col('name', { enableRemove: true })}
							header={header}
							isDarkMode={false}
							hasSingleColumn={false}
							canRemoveColumn
							onRemoveColumn={onRemoveColumn}
						/>
					</tr>
				</thead>
			</table>,
		);
		await user.click(screen.getByRole('button', { name: /column actions/i }));
		await user.click(await screen.findByText(/remove column/i));
		expect(onRemoveColumn).toHaveBeenCalledWith('name');
	});

	it('does NOT show remove button when enableRemove is absent', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={col('name')}
							header={header}
							isDarkMode={false}
							hasSingleColumn={false}
							canRemoveColumn
							onRemoveColumn={jest.fn()}
						/>
					</tr>
				</thead>
			</table>,
		);
		expect(
			screen.queryByRole('button', { name: /column actions/i }),
		).not.toBeInTheDocument();
	});

	describe('sorting', () => {
		const sortableCol = col('sortable', { enableSort: true, header: 'Sortable' });
		const sortableHeader = {
			id: 'sortable',
			column: {
				id: 'sortable',
				getCanResize: (): boolean => true,
				getIsResizing: (): boolean => false,
				columnDef: { header: 'Sortable', enableSort: true },
			},
			getResizeHandler: (): jest.Mock => jest.fn(),
			getContext: (): Record<string, unknown> => ({}),
		} as never;

		it('calls onSort with asc when clicking unsorted column', async () => {
			const user = userEvent.setup();
			const onSort = jest.fn();
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={sortableCol}
								header={sortableHeader}
								isDarkMode={false}
								hasSingleColumn={false}
								onSort={onSort}
							/>
						</tr>
					</thead>
				</table>,
			);
			// Sort button uses the column header as title
			const sortButton = screen.getByTitle('Sortable');
			await user.click(sortButton);
			expect(onSort).toHaveBeenCalledWith({
				columnName: 'sortable',
				order: 'asc',
			});
		});

		it('calls onSort with desc when clicking asc-sorted column', async () => {
			const user = userEvent.setup();
			const onSort = jest.fn();
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={sortableCol}
								header={sortableHeader}
								isDarkMode={false}
								hasSingleColumn={false}
								onSort={onSort}
								orderBy={{ columnName: 'sortable', order: 'asc' }}
							/>
						</tr>
					</thead>
				</table>,
			);
			const sortButton = screen.getByTitle('Sortable');
			await user.click(sortButton);
			expect(onSort).toHaveBeenCalledWith({
				columnName: 'sortable',
				order: 'desc',
			});
		});

		it('calls onSort with null when clicking desc-sorted column', async () => {
			const user = userEvent.setup();
			const onSort = jest.fn();
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={sortableCol}
								header={sortableHeader}
								isDarkMode={false}
								hasSingleColumn={false}
								onSort={onSort}
								orderBy={{ columnName: 'sortable', order: 'desc' }}
							/>
						</tr>
					</thead>
				</table>,
			);
			const sortButton = screen.getByTitle('Sortable');
			await user.click(sortButton);
			expect(onSort).toHaveBeenCalledWith(null);
		});

		it('shows ascending indicator when orderBy matches column with asc', () => {
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={sortableCol}
								header={sortableHeader}
								isDarkMode={false}
								hasSingleColumn={false}
								onSort={jest.fn()}
								orderBy={{ columnName: 'sortable', order: 'asc' }}
							/>
						</tr>
					</thead>
				</table>,
			);
			const sortButton = screen.getByTitle('Sortable');
			expect(sortButton).toHaveAttribute('data-sort', 'ascending');
		});

		it('shows descending indicator when orderBy matches column with desc', () => {
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={sortableCol}
								header={sortableHeader}
								isDarkMode={false}
								hasSingleColumn={false}
								onSort={jest.fn()}
								orderBy={{ columnName: 'sortable', order: 'desc' }}
							/>
						</tr>
					</thead>
				</table>,
			);
			const sortButton = screen.getByTitle('Sortable');
			expect(sortButton).toHaveAttribute('data-sort', 'descending');
		});

		it('does not show sort button when enableSort is false', () => {
			const nonSortableCol = col('nonsort', {
				enableSort: false,
				header: 'Nonsort',
			});
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={nonSortableCol}
								header={header}
								isDarkMode={false}
								hasSingleColumn={false}
							/>
						</tr>
					</thead>
				</table>,
			);
			// When enableSort is false, the header text is rendered as a span, not a button
			// The title 'Nonsort' exists on the span, not on a button
			const titleElement = screen.getByTitle('Nonsort');
			expect(titleElement.tagName.toLowerCase()).not.toBe('button');
		});
	});

	describe('resizing', () => {
		it('shows resize handle when enableResize is not false', () => {
			const resizableCol = col('resizable', { enableResize: true });
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={resizableCol}
								header={header}
								isDarkMode={false}
								hasSingleColumn={false}
							/>
						</tr>
					</thead>
				</table>,
			);
			// Resize handle has title "Drag to resize column"
			expect(screen.getByTitle('Drag to resize column')).toBeInTheDocument();
		});

		it('hides resize handle when enableResize is false', () => {
			const nonResizableCol = col('noresize', { enableResize: false });
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={nonResizableCol}
								header={header}
								isDarkMode={false}
								hasSingleColumn={false}
							/>
						</tr>
					</thead>
				</table>,
			);
			expect(screen.queryByTitle('Drag to resize column')).not.toBeInTheDocument();
		});
	});

	describe('column movement', () => {
		it('does not show grip when enableMove is false', () => {
			const noMoveCol = col('nomove', { enableMove: false });
			render(
				<table>
					<thead>
						<tr>
							<TanStackHeaderRow
								column={noMoveCol}
								header={header}
								isDarkMode={false}
								hasSingleColumn={false}
							/>
						</tr>
					</thead>
				</table>,
			);
			expect(
				screen.queryByRole('button', { name: /drag/i }),
			).not.toBeInTheDocument();
		});
	});
});
