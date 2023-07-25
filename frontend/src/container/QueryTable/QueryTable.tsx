import { ResizeTable } from 'components/ResizeTable';
import { createTableColumnsFromQuery } from 'lib/query/createTableColumnsFromQuery';
import { useMemo } from 'react';

import { QueryTableProps } from './QueryTable.intefaces';

export function QueryTable({
	queryTableData,
	query,
	renderActionCell,
	modifyColumns,
	renderColumnCell,
	...props
}: QueryTableProps): JSX.Element {
	const { columns, dataSource } = useMemo(
		() =>
			createTableColumnsFromQuery({
				query,
				queryTableData,
				renderActionCell,
				renderColumnCell,
			}),
		[query, queryTableData, renderColumnCell, renderActionCell],
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
