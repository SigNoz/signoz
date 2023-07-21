import { TableProps } from 'antd';
import { LogsExplorerTableProps } from 'container/LogsExplorerTable/LogsExplorerTable.interfaces';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

export type GridTableComponentProps = Pick<LogsExplorerTableProps, 'data'> &
	Omit<TableProps<RowData>, 'columns' | 'dataSource'>;
