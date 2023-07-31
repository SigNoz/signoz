import LogDetail from 'components/LogDetail';
import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { useTableView } from 'components/Logs/TableView/useTableView';
import { LOCALSTORAGE } from 'constants/localStorage';
import LogsExplorerContext from 'container/LogsExplorerContext';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useCopyLogLink } from 'hooks/logs/useCopyLogLink';
import useDragColumns from 'hooks/useDragColumns';
import { getDraggedColumns } from 'hooks/useDragColumns/utils';
import {
	cloneElement,
	forwardRef,
	ReactElement,
	ReactNode,
	useCallback,
	useMemo,
} from 'react';
import {
	TableComponents,
	TableVirtuoso,
	TableVirtuosoHandle,
} from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';

import { infinityDefaultStyles } from './config';
import { LogsCustomTable } from './LogsCustomTable';
import {
	TableCellStyled,
	TableHeaderCellStyled,
	TableRowStyled,
} from './styles';
import { InfinityTableProps } from './types';

// eslint-disable-next-line react/function-component-definition
const CustomTableRow: TableComponents<ILog>['TableRow'] = ({
	children,
	context,
	...props
}) => {
	const { isHighlighted } = useCopyLogLink(props.item.id);

	return (
		<TableRowStyled
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

		const { onEndReached } = infitiyTableProps;
		const { dataSource, columns } = useTableView({
			...tableViewProps,
			onClickExpand: onSetActiveLog,
			onOpenLogsContext: handleSetActiveContextLog,
		});
		const { draggedColumns, onDragColumns } = useDragColumns<
			Record<string, unknown>
		>(LOCALSTORAGE.LOGS_LIST_COLUMNS);

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
				<>
					{tableColumns.map((column) => {
						if (!column.render) return <td>Empty</td>;

						const element: ColumnTypeRender<Record<string, unknown>> = column.render(
							log[column.key as keyof Record<string, unknown>],
							log,
							index,
						);

						const elementWithChildren = element as Exclude<
							ColumnTypeRender<Record<string, unknown>>,
							ReactNode
						>;

						const children = elementWithChildren.children as ReactElement;
						const props = elementWithChildren.props as Record<string, unknown>;

						return (
							<TableCellStyled key={column.key}>
								{cloneElement(children, props)}
							</TableCellStyled>
						);
					})}
				</>
			),
			[tableColumns],
		);

		const tableHeader = useCallback(
			() => (
				<tr>
					{tableColumns.map((column) => {
						const isDragColumn = column.key !== 'expand';

						return (
							<TableHeaderCellStyled
								isDragColumn={isDragColumn}
								key={column.key}
								// eslint-disable-next-line react/jsx-props-no-spreading
								{...(isDragColumn && { className: 'dragHandler' })}
							>
								{column.title as string}
							</TableHeaderCellStyled>
						);
					})}
				</tr>
			),
			[tableColumns],
		);

		return (
			<>
				<TableVirtuoso
					useWindowScroll
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
					endReached={onEndReached}
					totalCount={dataSource.length}
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

export default InfinityTable;
