import LogDetail from 'components/LogDetail';
import { useTableView } from 'components/Logs/TableView/useTableView';
import { LOCALSTORAGE } from 'constants/localStorage';
import LogsExplorerContext from 'container/LogsExplorerContext';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import { forwardRef, memo, useCallback, useMemo } from 'react';
import {
	TableComponents,
	TableVirtuoso,
	TableVirtuosoHandle,
} from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';

import { infinityDefaultStyles } from './config';
import { LogsCustomTable } from './LogsCustomTable';
import { TableHeaderCellStyled, TableRowStyled } from './styles';
import TableRow from './TableRow';
import { InfinityTableProps } from './types';

// eslint-disable-next-line react/function-component-definition
const CustomTableRow: TableComponents<ILog>['TableRow'] = ({
	children,
	context,
	...props
}) => {
	const { isHighlighted } = useCopyLogLink(props.item.id);

	const isDarkMode = useIsDarkMode();

	return (
		<TableRowStyled
			$isDarkMode={isDarkMode}
			$isActiveLog={isHighlighted}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		>
			{children}
		</TableRowStyled>
	);
};

const InfinityTable = forwardRef<TableVirtuosoHandle, InfinityTableProps>(
	function InfinityTableView(
		{ isLoading, tableViewProps, infitiyTableProps },
		ref,
	): JSX.Element | null {
		const {
			activeLog: activeContextLog,
			onSetActiveLog: handleSetActiveContextLog,
			onClearActiveLog: handleClearActiveContextLog,
		} = useActiveLog();
		const {
			activeLog,
			onSetActiveLog,
			onClearActiveLog,
			onAddToQuery,
		} = useActiveLog();

		const { dataSource, columns } = useTableView({
			...tableViewProps,
			onClickExpand: onSetActiveLog,
			onOpenLogsContext: handleSetActiveContextLog,
		});
		const { draggedColumns, onDragColumns } = useDragColumns<
			Record<string, unknown>
		>(LOCALSTORAGE.LOGS_LIST_COLUMNS);

		const isDarkMode = useIsDarkMode();

		const tableColumns = useMemo(
			() => getDraggedColumns<Record<string, unknown>>(columns, draggedColumns),
			[columns, draggedColumns],
		);

		const handleDragEnd = useCallback(
			(fromIndex: number, toIndex: number) =>
				onDragColumns(tableColumns, fromIndex, toIndex),
			[tableColumns, onDragColumns],
		);

		// const handleClickExpand = useCallback(
		// 	(log: ILog): void => {
		// 		if (!onSetActiveLog) return;

		// 		onSetActiveLog(log);
		// 	},
		// 	[onSetActiveLog],
		// );

		const itemContent = useCallback(
			(index: number, log: Record<string, unknown>): JSX.Element => (
				<TableRow
					tableColumns={tableColumns}
					index={index}
					log={log}
					handleSetActiveContextLog={handleSetActiveContextLog}
					logs={tableViewProps.logs}
					onSetActiveLog={onSetActiveLog}
				/>
			),
			[
				handleSetActiveContextLog,
				tableColumns,
				tableViewProps.logs,
				onSetActiveLog,
			],
		);

		const tableHeader = useCallback(
			() => (
				<tr>
					{tableColumns.map((column) => {
						const isDragColumn = column.key !== 'expand';

						return (
							<TableHeaderCellStyled
								$isTimestamp={column.key === 'timestamp'}
								$isDarkMode={isDarkMode}
								$isDragColumn={isDragColumn}
								key={column.key}
								// eslint-disable-next-line react/jsx-props-no-spreading
								{...(isDragColumn && { className: 'dragHandler' })}
							>
								{(column.title as string).replace(/^\w/, (c) => c.toUpperCase())}
							</TableHeaderCellStyled>
						);
					})}
				</tr>
			),
			[tableColumns, isDarkMode],
		);

		return (
			<>
				<TableVirtuoso
					ref={ref}
					style={infinityDefaultStyles}
					data={dataSource}
					components={{
						// eslint-disable-next-line react/jsx-props-no-spreading
						Table: LogsCustomTable({ isLoading, handleDragEnd }),
						// TODO: fix it in the future
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						TableRow: CustomTableRow,
					}}
					itemContent={itemContent}
					fixedHeaderContent={tableHeader}
					totalCount={dataSource.length}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...(infitiyTableProps?.onEndReached
						? { endReached: infitiyTableProps.onEndReached }
						: {})}
				/>

				{activeContextLog && (
					<LogsExplorerContext
						log={activeContextLog}
						onClose={handleClearActiveContextLog}
					/>
				)}
				<LogDetail
					log={activeLog}
					onClose={onClearActiveLog}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onAddToQuery}
				/>
			</>
		);
	},
);

export default memo(InfinityTable);
