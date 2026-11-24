jest.mock('../TanStackTable.module.scss', () => ({
	__esModule: true,
	default: {
		tableRow: 'tableRow',
		tableRowActive: 'tableRowActive',
		tableRowExpansion: 'tableRowExpansion',
	},
}));

jest.mock('../TanStackRow', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<td data-testid="mocked-row-cells">mocked cells</td>
	),
}));

const mockSetRowHovered = jest.fn();
const mockClearRowHovered = jest.fn();

jest.mock('../TanStackTableStateContext', () => ({
	useSetRowHovered: (_rowId: string): (() => void) => mockSetRowHovered,
	useClearRowHovered: (_rowId: string): (() => void) => mockClearRowHovered,
}));

import { fireEvent, render, screen } from '@testing-library/react';

import TanStackCustomTableRow from '../TanStackCustomTableRow';
import type { FlatItem, TableRowContext } from '../types';

const makeItem = (id: string): FlatItem<{ id: string }> => ({
	kind: 'row',
	row: { original: { id }, id } as never,
});

const virtuosoAttrs = {
	'data-index': 0,
	'data-item-index': 0,
	'data-known-size': 40,
} as const;

const baseContext: TableRowContext<{ id: string }> = {
	colCount: 1,
	hasSingleColumn: false,
	columnOrderKey: 'col1',
	columnVisibilityKey: 'col1',
};

describe('TanStackCustomTableRow', () => {
	beforeEach(() => {
		mockSetRowHovered.mockClear();
		mockClearRowHovered.mockClear();
	});

	it('renders cells via TanStackRowCells', async () => {
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={makeItem('1')}
						context={baseContext}
					/>
				</tbody>
			</table>,
		);
		await expect(
			screen.findByTestId('mocked-row-cells'),
		).resolves.toBeInTheDocument();
	});

	it('applies active class when isRowActive returns true', () => {
		const ctx: TableRowContext<{ id: string }> = {
			...baseContext,
			isRowActive: (row) => row.id === '1',
		};
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={makeItem('1')}
						context={ctx}
					/>
				</tbody>
			</table>,
		);
		expect(screen.getByRole('row')).toHaveClass('tableRowActive');
	});

	it('does not apply active class when isRowActive returns false', () => {
		const ctx: TableRowContext<{ id: string }> = {
			...baseContext,
			isRowActive: (row) => row.id === 'other',
		};
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={makeItem('1')}
						context={ctx}
					/>
				</tbody>
			</table>,
		);
		expect(screen.getByRole('row')).not.toHaveClass('tableRowActive');
	});

	it('renders expansion row with expansion class', () => {
		const item: FlatItem<{ id: string }> = {
			kind: 'expansion',
			row: { original: { id: '1' }, id: '1' } as never,
		};
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={item}
						context={baseContext}
					/>
				</tbody>
			</table>,
		);
		expect(screen.getByRole('row')).toHaveClass('tableRowExpansion');
	});

	describe('hover state management', () => {
		it('calls setRowHovered on mouse enter', () => {
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={baseContext}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			fireEvent.mouseEnter(row);
			expect(mockSetRowHovered).toHaveBeenCalled();
		});

		it('calls clearRowHovered on mouse leave', () => {
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={baseContext}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			fireEvent.mouseLeave(row);
			expect(mockClearRowHovered).toHaveBeenCalled();
		});
	});

	describe('virtuoso integration', () => {
		it('forwards data-index attribute to tr element', () => {
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={baseContext}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			expect(row).toHaveAttribute('data-index', '0');
		});

		it('forwards data-item-index attribute to tr element', () => {
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={baseContext}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			expect(row).toHaveAttribute('data-item-index', '0');
		});

		it('forwards data-known-size attribute to tr element', () => {
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={baseContext}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			expect(row).toHaveAttribute('data-known-size', '40');
		});
	});

	describe('row interaction', () => {
		it('applies custom style from getRowStyle in context', () => {
			const ctx: TableRowContext<{ id: string }> = {
				...baseContext,
				getRowStyle: () => ({ backgroundColor: 'red' }),
			};
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={ctx}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			expect(row).toHaveStyle({ backgroundColor: 'red' });
		});

		it('applies custom className from getRowClassName in context', () => {
			const ctx: TableRowContext<{ id: string }> = {
				...baseContext,
				getRowClassName: () => 'custom-row-class',
			};
			render(
				<table>
					<tbody>
						<TanStackCustomTableRow
							{...virtuosoAttrs}
							item={makeItem('1')}
							context={ctx}
						/>
					</tbody>
				</table>,
			);
			const row = screen.getByRole('row');
			expect(row).toHaveClass('custom-row-class');
		});
	});
});
