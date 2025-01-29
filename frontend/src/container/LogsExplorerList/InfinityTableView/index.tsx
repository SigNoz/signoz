import LogDetail from 'components/LogDetail';
import { VIEW_TYPES } from 'components/LogDetail/constants';
import { getLogIndicatorType } from 'components/Logs/LogStateIndicator/utils';
import { useTableView } from 'components/Logs/TableView/useTableView';
import { LOCALSTORAGE } from 'constants/localStorage';
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

import { getInfinityDefaultStyles } from './config';
import { LogsCustomTable } from './LogsCustomTable';
import { TableHeaderCellStyled, TableRowStyled } from './styles';
import TableRow from './TableRow';
import { InfinityTableProps } from './types';

interface CustomTableRowProps {
	activeContextLogId: string;
	activeLogId: string;
}

// eslint-disable-next-line react/function-component-definition
const CustomTableRow: TableComponents<ILog>['TableRow'] = ({
	children,
	context,
	...props
}) => {
	const { isHighlighted } = useCopyLogLink(props.item.id);

	const isDarkMode = useIsDarkMode();

	const logType = getLogIndicatorType(props.item);

	return (
		<TableRowStyled
			$isDarkMode={isDarkMode}
			$isActiveLog={
				isHighlighted ||
				(context as CustomTableRowProps).activeContextLogId === props.item.id ||
				(context as CustomTableRowProps).activeLogId === props.item.id
			}
			$logType={logType}
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
			onAddToQuery: handleAddToQuery,
		} = useActiveLog();
		const {
			activeLog,
			onSetActiveLog,
			onClearActiveLog,
			onAddToQuery,
			onGroupByAttribute,
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

		const itemContent = useCallback(
			(index: number, log: Record<string, unknown>): JSX.Element => (
				<TableRow
					tableColumns={tableColumns}
					index={index}
					log={log}
					handleSetActiveContextLog={handleSetActiveContextLog}
					logs={tableViewProps.logs}
					hasActions
					fontSize={tableViewProps.fontSize}
				/>
			),
			[
				handleSetActiveContextLog,
				tableColumns,
				tableViewProps.fontSize,
				tableViewProps.logs,
			],
		);

		const tableHeader = useCallback(
			() => (
				<tr>
					{tableColumns
						.filter((column) => column.key)
						.map((column) => {
							const isDragColumn = column.key !== 'expand';

							return (
								<TableHeaderCellStyled
									$isLogIndicator={column.key === 'state-indicator'}
									$isDarkMode={isDarkMode}
									$isDragColumn={isDragColumn}
									key={column.key}
									fontSize={tableViewProps?.fontSize}
									// eslint-disable-next-line react/jsx-props-no-spreading
									{...(isDragColumn && { className: 'dragHandler' })}
								>
									{(column.title as string).replace(/^\w/, (c) => c.toUpperCase())}
								</TableHeaderCellStyled>
							);
						})}
				</tr>
			),
			[tableColumns, isDarkMode, tableViewProps?.fontSize],
		);

		const handleClickExpand = (index: number): void => {
			if (!onSetActiveLog) return;

			onSetActiveLog(tableViewProps.logs[index]);
		};

		return (
			<>
				<TableVirtuoso
					ref={ref}
					initialTopMostItemIndex={
						tableViewProps.activeLogIndex !== -1 ? tableViewProps.activeLogIndex : 0
					}
					style={getInfinityDefaultStyles(tableViewProps.fontSize)}
					data={dataSource}
					components={{
						// eslint-disable-next-line react/jsx-props-no-spreading
						Table: LogsCustomTable({ isLoading, handleDragEnd }),
						// TODO: fix it in the future
						// eslint-disable-next-line @typescript-eslint/ban-ts-comment
						// @ts-ignore
						TableRow: (props): any =>
							CustomTableRow({
								...props,
								context: {
									activeContextLogId: activeContextLog?.id,
									activeLogId: activeLog?.id,
								},
							} as any),
					}}
					itemContent={itemContent}
					fixedHeaderContent={tableHeader}
					totalCount={dataSource.length}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...(infitiyTableProps?.onEndReached
						? { endReached: infitiyTableProps.onEndReached }
						: {})}
					onClick={(event: any): void => {
						handleClickExpand(event.target.parentElement.parentElement.dataset.index);
					}}
				/>

				{activeContextLog && (
					<LogDetail
						log={activeContextLog}
						onClose={handleClearActiveContextLog}
						onAddToQuery={handleAddToQuery}
						selectedTab={VIEW_TYPES.CONTEXT}
						onGroupByAttribute={onGroupByAttribute}
					/>
				)}
				<LogDetail
					selectedTab={VIEW_TYPES.OVERVIEW}
					log={activeLog}
					onClose={onClearActiveLog}
					onAddToQuery={onAddToQuery}
					onClickActionItem={onAddToQuery}
					onGroupByAttribute={onGroupByAttribute}
				/>
			</>
		);
	},
);

export default memo(InfinityTable);
