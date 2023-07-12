import { ColumnsType } from 'antd/es/table';
import {
	ColumnTypeRender,
	UseTableViewResult,
} from 'components/Logs/TableView/types';
import { useTableView } from 'components/Logs/TableView/useTableView';
import useDragColumns from 'hooks/useDragColumns';
import {
	cloneElement,
	ReactElement,
	ReactNode,
	useCallback,
	useState,
} from 'react';
import { TableComponents, TableVirtuoso } from 'react-virtuoso';

import { infinityDefaultStyles } from './config';
import { LogsCustomTable } from './LogsCustomTable';
import {
	TableCellStyled,
	TableHeaderCellStyled,
	TableRowStyled,
} from './styles';
import { InfinityTableProps } from './types';

// eslint-disable-next-line react/function-component-definition
const CustomTableRow: TableComponents['TableRow'] = ({
	children,
	context,
	...props
	// eslint-disable-next-line react/jsx-props-no-spreading
}) => <TableRowStyled {...props}>{children}</TableRowStyled>;

function InfinityTable({
	tableViewProps,
	infitiyTableProps,
	onColumnsChange,
}: InfinityTableProps): JSX.Element | null {
	const { onEndReached } = infitiyTableProps;
	const { dataSource, columns } = useTableView(tableViewProps);
	const handleDragColumn = useDragColumns(columns as ColumnsType);

	const [tableColumn, setTableColumns] = useState(columns);

	const handleDragEnd = useCallback(
		(fromIndex: number, toIndex: number): void => {
			const columns = handleDragColumn(fromIndex, toIndex);

			setTableColumns(columns as UseTableViewResult['columns']);
			onColumnsChange(columns);
		},
		[onColumnsChange, handleDragColumn],
	);

	const itemContent = useCallback(
		(index: number, log: Record<string, unknown>): JSX.Element => (
			<>
				{tableColumn.map((column) => {
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
		[tableColumn],
	);

	const tableHeader = useCallback(
		() => (
			<tr>
				{tableColumn.map((column) => {
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
		[tableColumn],
	);

	return (
		<TableVirtuoso
			style={infinityDefaultStyles}
			data={dataSource}
			components={{
				// eslint-disable-next-line react/jsx-props-no-spreading
				Table: LogsCustomTable({ handleDragEnd }),
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
	);
}

export default InfinityTable;
