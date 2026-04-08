import type { Header } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { FontSize } from 'container/OptionsMenu/types';

import TanStackHeaderRow from '../TanStackHeaderRow';
import type { OrderedColumn, TanStackTableRowData } from '../types';

jest.mock('../../InfinityTableView/styles', () => ({
	TableHeaderCellStyled: 'th',
}));

const mockUseSortable = jest.fn((_args?: unknown) => ({
	attributes: {},
	listeners: {},
	setNodeRef: jest.fn(),
	setActivatorNodeRef: jest.fn(),
	transform: null,
	transition: undefined,
	isDragging: false,
}));

jest.mock('@dnd-kit/sortable', () => ({
	useSortable: (args: unknown): ReturnType<typeof mockUseSortable> =>
		mockUseSortable(args),
}));

jest.mock('@tanstack/react-table', () => ({
	flexRender: (def: unknown, ctx: unknown): unknown => {
		if (typeof def === 'string') {
			return def;
		}
		if (typeof def === 'function') {
			return (def as (c: unknown) => unknown)(ctx);
		}
		return def;
	},
}));

const column = (key: string): OrderedColumn =>
	({ key, title: key } as OrderedColumn);

const mockHeader = (
	id: string,
	canResize = true,
): Header<TanStackTableRowData, unknown> =>
	(({
		id,
		column: {
			getCanResize: (): boolean => canResize,
			getIsResizing: (): boolean => false,
			columnDef: { header: id },
		},
		getContext: (): unknown => ({}),
		getResizeHandler: (): (() => void) => jest.fn(),
		flexRender: undefined,
	} as unknown) as Header<TanStackTableRowData, unknown>);

describe('TanStackHeaderRow', () => {
	beforeEach(() => {
		mockUseSortable.mockClear();
	});

	it('renders column title when header is undefined', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={column('timestamp')}
							isDarkMode={false}
							fontSize={FontSize.SMALL}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);

		expect(screen.getByText('Timestamp')).toBeInTheDocument();
	});

	it('enables useSortable for draggable columns', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={column('body')}
							header={mockHeader('body')}
							isDarkMode={false}
							fontSize={FontSize.SMALL}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);

		expect(mockUseSortable).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'body',
				disabled: false,
			}),
		);
	});

	it('disables sortable for expand column', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={column('expand')}
							header={mockHeader('expand', false)}
							isDarkMode={false}
							fontSize={FontSize.SMALL}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);

		expect(mockUseSortable).toHaveBeenCalledWith(
			expect.objectContaining({
				disabled: true,
			}),
		);
	});

	it('shows drag grip for draggable columns', () => {
		render(
			<table>
				<thead>
					<tr>
						<TanStackHeaderRow
							column={column('body')}
							header={mockHeader('body')}
							isDarkMode={false}
							fontSize={FontSize.SMALL}
							hasSingleColumn={false}
						/>
					</tr>
				</thead>
			</table>,
		);

		expect(
			screen.getByRole('button', { name: /Drag body column/i }),
		).toBeInTheDocument();
	});
});
