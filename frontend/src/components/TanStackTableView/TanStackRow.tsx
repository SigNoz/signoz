import {
	MouseEvent as ReactMouseEvent,
	MouseEventHandler,
	useCallback,
} from 'react';
import { flexRender, Row as TanStackRowModel } from '@tanstack/react-table';
import cx from 'classnames';

import { VIEW_TYPES } from '../LogDetail/constants';
import LogLinesActionButtons from '../Logs/LogLinesActionButtons/LogLinesActionButtons';
import { useRowHover } from './RowHoverContext';
import { TanStackTableProps, TanStackTableRowData } from './types';

import tableStyles from './TanStackTable.module.scss';

type TanStackRowCellsProps = {
	row: TanStackRowModel<TanStackTableRowData>;
	fontSize: TanStackTableProps['tableViewProps']['fontSize'];
	onSetActiveLog?: TanStackTableProps['onSetActiveLog'];
	onClearActiveLog?: TanStackTableProps['onClearActiveLog'];
	isActiveLog?: boolean;
	isDarkMode: boolean;
	onLogCopy: (logId: string, event: ReactMouseEvent<HTMLElement>) => void;
	isLogsExplorerPage: boolean;
};

function TanStackRowCells({
	row,
	fontSize,
	onSetActiveLog,
	onClearActiveLog,
	isActiveLog = false,
	isDarkMode,
	onLogCopy,
	isLogsExplorerPage,
}: TanStackRowCellsProps): JSX.Element {
	const { currentLog } = row.original;
	const hasHovered = useRowHover();

	const handleShowContext: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			onSetActiveLog?.(currentLog, VIEW_TYPES.CONTEXT);
		},
		[currentLog, onSetActiveLog],
	);

	const handleShowLogDetails = useCallback(() => {
		if (!currentLog) {
			return;
		}

		if (isActiveLog && onClearActiveLog) {
			onClearActiveLog();
			return;
		}

		onSetActiveLog?.(currentLog);
	}, [currentLog, isActiveLog, onClearActiveLog, onSetActiveLog]);

	const visibleCells = row.getVisibleCells();
	const lastCellIndex = visibleCells.length - 1;
	const hasSingleColumn = visibleCells.length <= 2;

	return (
		<>
			{visibleCells.map((cell, index) => {
				const columnKey = cell.column.id;
				const isLastCell = index === lastCellIndex;
				return (
					<td
						key={cell.id}
						className={cx(tableStyles.tableCell, columnKey)}
						data-dark-mode={isDarkMode}
						data-log-indicator={columnKey === 'state-indicator' || undefined}
						data-timestamp={columnKey === 'timestamp' || undefined}
						data-single-column={hasSingleColumn || undefined}
						data-font-size={fontSize}
						onClick={handleShowLogDetails}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
						{isLastCell && isLogsExplorerPage && hasHovered && (
							<LogLinesActionButtons
								handleShowContext={handleShowContext}
								onLogCopy={(event): void => onLogCopy(currentLog.id, event)}
								customClassName={tableStyles.tableViewLogActions}
							/>
						)}
					</td>
				);
			})}
		</>
	);
}

export default TanStackRowCells;
