import { TableProps } from 'antd';
import { LogsExplorerTableProps } from 'container/LogsExplorerTable/LogsExplorerTable.interfaces';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export type GridTableComponentProps = { query: Query } & Pick<
	LogsExplorerTableProps,
	'data'
> &
	Omit<TableProps<RowData>, 'columns' | 'dataSource'>;
