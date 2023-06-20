import type { ColumnsType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import dayjs from 'dayjs';
import {
	createTableColumnsFromQuery,
	RowData,
} from 'lib/query/createTableColumnsFromQuery';
import { useMemo } from 'react';

import { QueryTableProps } from './QueryTable.intefaces';

export function QueryTable({
	queryTableData,
	query,
	renderActionCell,
	...props
}: QueryTableProps): JSX.Element {
	const { columns, dataSource } = useMemo(
		() =>
			createTableColumnsFromQuery({
				query,
				queryTableData,
				renderActionCell,
			}),
		[query, queryTableData, renderActionCell],
	);

	const modifiedColumns = useMemo(() => {
		const currentColumns: ColumnsType<RowData> = columns.map((column) =>
			column.key === 'timestamp'
				? {
						...column,
						render: (_, record): string =>
							dayjs(new Date(record.timestamp)).format('MMM DD, YYYY, HH:mm:ss'),
				  }
				: column,
		);

		return currentColumns;
	}, [columns]);

	return (
		<ResizeTable
			columns={modifiedColumns}
			tableLayout="fixed"
			dataSource={dataSource}
			scroll={{ x: true }}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
		/>
	);
}
