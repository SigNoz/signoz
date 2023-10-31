import './QueryTable.styles.scss';

import { ResizeTable } from 'components/ResizeTable';
import Download from 'container/Download/Download';
import { createTableColumnsFromQuery } from 'lib/query/createTableColumnsFromQuery';
import { useMemo } from 'react';

import { QueryTableProps } from './QueryTable.intefaces';

export function QueryTable({
	queryTableData,
	query,
	renderActionCell,
	modifyColumns,
	renderColumnCell,
	downloadOption,
	...props
}: QueryTableProps): JSX.Element {
	const { isDownloadEnabled = false, fileName = '' } = downloadOption || {};
	const { loading } = props;
	const { columns, dataSource } = useMemo(
		() =>
			createTableColumnsFromQuery({
				query,
				queryTableData,
				renderActionCell,
				renderColumnCell,
			}),
		[query, queryTableData, renderActionCell, renderColumnCell],
	);

	const tableColumns = modifyColumns ? modifyColumns(columns) : columns;

	return (
		<div className="query-table">
			{isDownloadEnabled && (
				<div className="query-table--download">
					<Download
						data={(dataSource as unknown) as Record<string, string>[]}
						fileName={fileName}
						isLoading={loading as boolean}
					/>
				</div>
			)}
			<ResizeTable
				columns={tableColumns}
				tableLayout="fixed"
				dataSource={dataSource}
				scroll={{ x: true }}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</div>
	);
}
