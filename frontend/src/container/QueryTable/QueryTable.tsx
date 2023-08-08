import { ResizeTable } from 'components/ResizeTable';
import {
	CreateSorter,
	createTableColumnsFromQuery,
	DynamicColumn,
	RowData,
} from 'lib/query/createTableColumnsFromQuery';
import { useCallback, useMemo } from 'react';

import { QueryTableProps } from './QueryTable.intefaces';

export function QueryTable({
	queryTableData,
	query,
	renderActionCell,
	modifyColumns,
	renderColumnCell,
	sorter,
	...props
}: QueryTableProps): JSX.Element {
	const createSorter: CreateSorter = useCallback(
		(column: DynamicColumn): QueryTableProps['sorter'] => {
			if (sorter) {
				return sorter;
			}

			if (column.dataType === 'number') {
				return (a: RowData, b: RowData): number =>
					(a[column.dataIndex] as number) - (b[column.dataIndex] as number);
			}

			return false;
		},
		[sorter],
	);

	const { columns, dataSource } = useMemo(
		() =>
			createTableColumnsFromQuery({
				query,
				queryTableData,
				renderActionCell,
				renderColumnCell,
				createSorter,
			}),
		[query, queryTableData, renderActionCell, renderColumnCell, createSorter],
	);

	const tableColumns = modifyColumns ? modifyColumns(columns) : columns;

	return (
		<ResizeTable
			columns={tableColumns}
			tableLayout="fixed"
			dataSource={dataSource}
			scroll={{ x: true }}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		/>
	);
}
