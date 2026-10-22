import { TableProps } from 'antd';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

export const GRID_TABLE_CONFIG: Omit<
	TableProps<RowData>,
	'columns' | 'dataSource'
> = {
	size: 'small',
};
