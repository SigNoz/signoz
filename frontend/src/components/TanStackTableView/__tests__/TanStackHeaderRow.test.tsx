import { fireEvent, render, screen } from '@testing-library/react';
import type { TableColumnDef } from '../types';
import TanStackHeaderRow from '../TanStackHeaderRow';

jest.mock('@dnd-kit/sortable', () => ({
	useSortable: () => ({
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
	cell: () => null,
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
		expect(screen.getByRole('button', { name: /drag body/i })).toBeInTheDocument();
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
		expect(screen.queryByRole('button', { name: /drag/i })).not.toBeInTheDocument();
	});

	it('shows remove button when enableRemove and canRemoveColumn are true', () => {
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
		fireEvent.click(screen.getByRole('button', { name: /column actions/i }));
		fireEvent.click(screen.getByText(/remove column/i));
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
});
