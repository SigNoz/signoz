import { fireEvent, render, screen } from '@testing-library/react';
import RowHoverContext from 'container/LogsExplorerList/RowHoverContext';
import { FontSize } from 'container/OptionsMenu/types';

import TanStackRowCells from '../TanStackRow';
import type { TanStackTableRowData } from '../types';

jest.mock('../../InfinityTableView/styles', () => ({
	TableCellStyled: 'td',
}));

jest.mock(
	'components/Logs/LogLinesActionButtons/LogLinesActionButtons',
	() => ({
		__esModule: true,
		default: ({
			onLogCopy,
		}: {
			onLogCopy: (e: React.MouseEvent) => void;
		}): JSX.Element => (
			<button type="button" data-testid="copy-btn" onClick={onLogCopy}>
				copy
			</button>
		),
	}),
);

const flexRenderMock = jest.fn((def: unknown, _ctx?: unknown) =>
	typeof def === 'function' ? def({}) : def,
);

jest.mock('@tanstack/react-table', () => ({
	flexRender: (def: unknown, ctx: unknown): unknown => flexRenderMock(def, ctx),
}));

function buildMockRow(
	visibleCells: Array<{ columnId: string }>,
): Parameters<typeof TanStackRowCells>[0]['row'] {
	return {
		original: {
			currentLog: { id: 'log-1' } as TanStackTableRowData['currentLog'],
			log: {},
			rowIndex: 0,
		},
		getVisibleCells: () =>
			visibleCells.map((cell, index) => ({
				id: `cell-${index}`,
				column: {
					id: cell.columnId,
					columnDef: {
						cell: (): string => `content-${cell.columnId}`,
					},
				},
				getContext: (): Record<string, unknown> => ({}),
			})),
	} as never;
}

describe('TanStackRowCells', () => {
	beforeEach(() => {
		flexRenderMock.mockClear();
	});

	it('renders a cell per visible column and calls flexRender', () => {
		const row = buildMockRow([
			{ columnId: 'state-indicator' },
			{ columnId: 'body' },
		]);

		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells
							row={row}
							fontSize={FontSize.SMALL}
							isDarkMode={false}
							onLogCopy={jest.fn()}
							isLogsExplorerPage={false}
						/>
					</tr>
				</tbody>
			</table>,
		);

		expect(screen.getAllByRole('cell')).toHaveLength(2);
		expect(flexRenderMock).toHaveBeenCalled();
	});

	it('applies state-indicator styling class on the indicator cell', () => {
		const row = buildMockRow([{ columnId: 'state-indicator' }]);

		const { container } = render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells
							row={row}
							fontSize={FontSize.SMALL}
							isDarkMode={false}
							onLogCopy={jest.fn()}
							isLogsExplorerPage={false}
						/>
					</tr>
				</tbody>
			</table>,
		);

		expect(container.querySelector('td.state-indicator')).toBeInTheDocument();
	});

	it('renders row actions on logs explorer page after hover', () => {
		const row = buildMockRow([{ columnId: 'body' }]);

		render(
			<RowHoverContext.Provider value>
				<table>
					<tbody>
						<tr>
							<TanStackRowCells
								row={row}
								fontSize={FontSize.SMALL}
								isDarkMode={false}
								onLogCopy={jest.fn()}
								isLogsExplorerPage
							/>
						</tr>
					</tbody>
				</table>
			</RowHoverContext.Provider>,
		);

		expect(screen.getByTestId('copy-btn')).toBeInTheDocument();
	});

	it('click on a data cell calls onSetActiveLog with current log', () => {
		const onSetActiveLog = jest.fn();
		const row = buildMockRow([{ columnId: 'body' }]);

		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells
							row={row}
							fontSize={FontSize.SMALL}
							isDarkMode={false}
							onSetActiveLog={onSetActiveLog}
							onLogCopy={jest.fn()}
							isLogsExplorerPage={false}
						/>
					</tr>
				</tbody>
			</table>,
		);

		fireEvent.click(screen.getAllByRole('cell')[0]);

		expect(onSetActiveLog).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'log-1' }),
		);
	});

	it('when row is active log, click on cell clears active log', () => {
		const onSetActiveLog = jest.fn();
		const onClearActiveLog = jest.fn();
		const row = buildMockRow([{ columnId: 'body' }]);

		render(
			<table>
				<tbody>
					<tr>
						<TanStackRowCells
							row={row}
							fontSize={FontSize.SMALL}
							isDarkMode={false}
							isActiveLog
							onSetActiveLog={onSetActiveLog}
							onClearActiveLog={onClearActiveLog}
							onLogCopy={jest.fn()}
							isLogsExplorerPage={false}
						/>
					</tr>
				</tbody>
			</table>,
		);

		fireEvent.click(screen.getAllByRole('cell')[0]);

		expect(onClearActiveLog).toHaveBeenCalled();
		expect(onSetActiveLog).not.toHaveBeenCalled();
	});
});
