import {
	MouseEvent as ReactMouseEvent,
	MouseEventHandler,
	useCallback,
} from 'react';
import { flexRender, Row as TanStackRowModel } from '@tanstack/react-table';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import LogLinesActionButtons from 'components/Logs/LogLinesActionButtons/LogLinesActionButtons';

import { TableCellStyled } from '../InfinityTableView/styles';
import { InfinityTableProps } from '../InfinityTableView/types';
import { useRowHover } from '../RowHoverContext';
import { TanStackTableRowData } from './types';

type TanStackRowCellsProps = {
	row: TanStackRowModel<TanStackTableRowData>;
	fontSize: InfinityTableProps['tableViewProps']['fontSize'];
	onSetActiveLog?: InfinityTableProps['onSetActiveLog'];
	onClearActiveLog?: InfinityTableProps['onClearActiveLog'];
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

	return (
		<>
			{visibleCells.map((cell, index) => {
				const columnKey = cell.column.id;
				const isLastCell = index === lastCellIndex;
				return (
					<TableCellStyled
						$isDragColumn={false}
						$isLogIndicator={columnKey === 'state-indicator'}
						$hasSingleColumn={visibleCells.length <= 2}
						$isDarkMode={isDarkMode}
						key={cell.id}
						fontSize={fontSize}
						className={columnKey}
						onClick={handleShowLogDetails}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
						{isLastCell && isLogsExplorerPage && hasHovered && (
							<LogLinesActionButtons
								handleShowContext={handleShowContext}
								onLogCopy={(event): void => onLogCopy(currentLog.id, event)}
								customClassName="table-view-log-actions"
							/>
						)}
					</TableCellStyled>
				);
			})}
		</>
	);
}

export default TanStackRowCells;
