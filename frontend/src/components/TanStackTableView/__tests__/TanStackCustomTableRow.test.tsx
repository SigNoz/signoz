jest.mock('../TanStackTable.module.scss', () => ({
	__esModule: true,
	default: {
		tableRow: 'tableRow',
		tableRowActive: 'tableRowActive',
		tableRowExpansion: 'tableRowExpansion',
	},
}));

import { render, screen } from '@testing-library/react';

import TanStackCustomTableRow from '../TanStackCustomTableRow';
import type { FlatItem, TableRowContext } from '../types';

const makeItem = (id: string): FlatItem<{ id: string }> => ({
	kind: 'row',
	row: { original: { id } } as never,
});

const virtuosoAttrs = {
	'data-index': 0,
	'data-item-index': 0,
	'data-known-size': 40,
} as const;

describe('TanStackCustomTableRow', () => {
	it('renders children', async () => {
		render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={makeItem('1')}
						context={undefined}
					>
						<td>cell</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);
		expect(await screen.findByText('cell')).toBeInTheDocument();
	});

	it('applies active class when isRowActive returns true', () => {
		const ctx: TableRowContext<{ id: string }> = {
			isRowActive: (row) => row.id === '1',
			colCount: 1,
		};
		const { container } = render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={makeItem('1')}
						context={ctx as never}
					>
						<td>x</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);
		expect(container.querySelector('tr')).toHaveClass('tableRowActive');
	});

	it('does not apply active class when isRowActive returns false', () => {
		const ctx: TableRowContext<{ id: string }> = {
			isRowActive: (row) => row.id === 'other',
			colCount: 1,
		};
		const { container } = render(
			<table>
				<tbody>
					<TanStackCustomTableRow
						{...virtuosoAttrs}
						item={makeItem('1')}
						context={ctx as never}
					>
						<td>x</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);
		expect(container.querySelector('tr')).not.toHaveClass('tableRowActive');
	});

	it('renders expansion row without RowHoverContext when kind is expansion', () => {
		const item: FlatItem<{ id: string }> = {
			kind: 'expansion',
			row: { original: { id: '1' } } as never,
		};
		const { container } = render(
			<table>
				<tbody>
					<TanStackCustomTableRow {...virtuosoAttrs} item={item} context={undefined}>
						<td>expanded content</td>
					</TanStackCustomTableRow>
				</tbody>
			</table>,
		);
		expect(container.querySelector('tr')).toHaveClass('tableRowExpansion');
	});
});
