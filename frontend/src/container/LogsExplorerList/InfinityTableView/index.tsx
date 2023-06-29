import { ColumnTypeRender } from 'components/Logs/TableView/types';
import { useTableView } from 'components/Logs/TableView/useTableView';
import Spinner from 'components/Spinner';
import { cloneElement, ReactElement, ReactNode, useCallback } from 'react';
import { TableComponents, TableVirtuoso } from 'react-virtuoso';
import { ILog } from 'types/api/logs/log';

import { infinityDefaultStyles } from './config';
import {
	TableCellStyled,
	TableHeaderCellStyled,
	TableRow,
	TableStyled,
} from './styles';
import { InfinityTableProps } from './types';

// eslint-disable-next-line react/function-component-definition
const CustomTable: TableComponents['Table'] = ({ style, children }) => (
	<TableStyled style={style}>{children}</TableStyled>
);

// eslint-disable-next-line react/function-component-definition
const CustomTableRow: TableComponents['TableRow'] = ({
	children,
	context,
	...props
	// eslint-disable-next-line react/jsx-props-no-spreading
}) => <TableRow {...props}>{children}</TableRow>;

function InfinityTable({
	tableViewProps,
	infitiyTableProps,
}: InfinityTableProps): JSX.Element | null {
	const { onEndReached, isLoading } = infitiyTableProps;
	const { dataSource, columns } = useTableView(tableViewProps);

	const itemContent = useCallback(
		(index: number, log: Record<string, string>): JSX.Element => (
			<>
				{columns.map((column) => {
					if (!column.render) return <td>Empty</td>;

					const element: ColumnTypeRender<Record<string, unknown>> = column.render(
						log[column.key as keyof ILog],
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
		[columns],
	);

	const tableHeader = useCallback(
		() => (
			<tr>
				{columns.map((column) => (
					<TableHeaderCellStyled key={column.key}>
						{column.title as string}
					</TableHeaderCellStyled>
				))}
			</tr>
		),
		[columns],
	);

	if (isLoading) {
		return <Spinner height={20} tip="Getting Logs" />;
	}

	return (
		<TableVirtuoso
			style={infinityDefaultStyles}
			data={dataSource}
			components={{
				Table: CustomTable,
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
