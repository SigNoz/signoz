import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TanStackRowCells from '../TanStackRow';
import type { TableRowContext } from '../types';

const flexRenderMock = jest.fn((def: unknown) =>
	typeof def === 'function' ? def({}) : def,
);
jest.mock('@tanstack/react-table', () => ({
	flexRender: (def: unknown, _ctx?: unknown): unknown => flexRenderMock(def),
}));

type Row = { id: string };

function buildMockRow(
	cells: { id: string }[],
	rowData: Row = { id: 'r1' },
): Parameters<typeof TanStackRowCells>[0]['row'] {
	return {
		original: rowData,
		getVisibleCells: () =>
			cells.map((c, i) => ({
				id: `cell-${i}`,
				column: {
					id: c.id,
					columnDef: { cell: (): string => `content-${c.id}` },
				},
				getContext: (): Record<string, unknown> => ({}),
				getValue: (): string => `content-${c.id}`,
			})),
	} as never;
}

describe('TanStackRowCells', () => {
	beforeEach(() => flexRenderMock.mockClear());

	it('renders a cell per visible column', () => {
		const row = buildMockRow([{ id: 'col-a' }, { id: 'col-b' }]);
		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells<Row>
							row={row as never}
							context={undefined}
							itemKind="row"
							hasSingleColumn={false}
						/>
					</tr>
				</tbody>
			</table>,
		);
		expect(screen.getAllByRole('cell')).toHaveLength(2);
	});

	it('calls onRowClick when a cell is clicked', async () => {
		const user = userEvent.setup();
		const onRowClick = jest.fn();
		const ctx: TableRowContext<Row> = { colCount: 1, onRowClick };
		const row = buildMockRow([{ id: 'body' }]);
		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells<Row>
							row={row as never}
							context={ctx}
							itemKind="row"
							hasSingleColumn={false}
						/>
					</tr>
				</tbody>
			</table>,
		);
		await user.click(screen.getAllByRole('cell')[0]);
		expect(onRowClick).toHaveBeenCalledWith({ id: 'r1' });
	});

	it('calls onRowDeactivate instead of onRowClick when row is active', async () => {
		const user = userEvent.setup();
		const onRowClick = jest.fn();
		const onRowDeactivate = jest.fn();
		const ctx: TableRowContext<Row> = {
			colCount: 1,
			onRowClick,
			onRowDeactivate,
			isRowActive: () => true,
		};
		const row = buildMockRow([{ id: 'body' }]);
		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells<Row>
							row={row as never}
							context={ctx}
							itemKind="row"
							hasSingleColumn={false}
						/>
					</tr>
				</tbody>
			</table>,
		);
		await user.click(screen.getAllByRole('cell')[0]);
		expect(onRowDeactivate).toHaveBeenCalled();
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('does not render renderRowActions before hover', () => {
		const ctx: TableRowContext<Row> = {
			colCount: 1,
			renderRowActions: () => <button type="button">action</button>,
		};
		const row = buildMockRow([{ id: 'body' }]);

		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells<Row>
							row={row as never}
							context={ctx}
							itemKind="row"
							hasSingleColumn={false}
						/>
					</tr>
				</tbody>
			</table>,
		);
		// Row actions are not rendered until hover (useIsRowHovered returns false by default)
		expect(
			screen.queryByRole('button', { name: 'action' }),
		).not.toBeInTheDocument();
	});

	it('renders cell content when plainTextCellLineClamp is set on context', () => {
		const ctx: TableRowContext<Row> = { colCount: 1, plainTextCellLineClamp: 2 };
		const row = buildMockRow([{ id: 'col-a' }]);
		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells<Row>
							row={row as never}
							context={ctx}
							itemKind="row"
							hasSingleColumn={false}
						/>
					</tr>
				</tbody>
			</table>,
		);
		expect(screen.getByRole('cell')).toHaveTextContent('content-col-a');
	});

	it('renders expansion cell with renderExpandedRow content', () => {
		const row = {
			original: { id: 'r1' },
			getVisibleCells: () => [],
		} as never;
		const ctx: TableRowContext<Row> = {
			colCount: 3,
			renderExpandedRow: (r) => <div>expanded-{r.id}</div>,
		};
		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells<Row>
							row={row as never}
							context={ctx}
							itemKind="expansion"
							hasSingleColumn={false}
						/>
					</tr>
				</tbody>
			</table>,
		);
		expect(screen.getByText('expanded-r1')).toBeInTheDocument();
	});
});
