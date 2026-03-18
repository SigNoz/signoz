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
import { TanStackTableRowData } from './types';

type TanStackRowProps = {
	row: TanStackRowModel<TanStackTableRowData>;
	fontSize: InfinityTableProps['tableViewProps']['fontSize'];
	onSetActiveLog?: InfinityTableProps['onSetActiveLog'];
	onClearActiveLog?: InfinityTableProps['onClearActiveLog'];
	isDarkMode: boolean;
	onLogCopy: (logId: string, event: ReactMouseEvent<HTMLElement>) => void;
	isLogsExplorerPage: boolean;
};

function TanStackRow({
	row,
	fontSize,
	onSetActiveLog,
	onClearActiveLog,
	isDarkMode,
	onLogCopy,
	isLogsExplorerPage,
}: TanStackRowProps): JSX.Element {
	const { currentLog } = row.original;
	const isActiveLog = row.getIsSelected();

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

	return (
		<>
			{row.getVisibleCells().map((cell) => {
				const columnKey = cell.column.id;
				return (
					<TableCellStyled
						$isDragColumn={false}
						$isLogIndicator={columnKey === 'state-indicator'}
						$hasSingleColumn={row.getVisibleCells().length <= 2}
						$isDarkMode={isDarkMode}
						key={cell.id}
						fontSize={fontSize}
						onClick={handleShowLogDetails}
						className={columnKey}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCellStyled>
				);
			})}
			{isLogsExplorerPage && (
				<LogLinesActionButtons
					handleShowContext={handleShowContext}
					onLogCopy={(event): void => onLogCopy(currentLog.id, event)}
					customClassName="table-view-log-actions"
				/>
			)}
		</>
	);
}

export default TanStackRow;
