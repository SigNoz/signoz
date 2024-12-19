import './QueryTable.styles.scss';

import { ResizeTable } from 'components/ResizeTable';
import Download from 'container/Download/Download';
import { IServiceName } from 'container/MetricsApplication/Tabs/types';
import {
	createTableColumnsFromQuery,
	RowData,
} from 'lib/query/createTableColumnsFromQuery';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { QueryTableProps } from './QueryTable.intefaces';
import { createDownloadableData } from './utils';

export function QueryTable({
	queryTableData,
	query,
	renderActionCell,
	modifyColumns,
	renderColumnCell,
	downloadOption,
	columns,
	dataSource,
	sticky,
	searchTerm,
	...props
}: QueryTableProps): JSX.Element {
	const { isDownloadEnabled = false, fileName = '' } = downloadOption || {};
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);
	const { loading } = props;
	const { columns: newColumns, dataSource: newDataSource } = useMemo(() => {
		if (columns && dataSource) {
			return { columns, dataSource };
		}
		return createTableColumnsFromQuery({
			query,
			queryTableData,
			renderActionCell,
			renderColumnCell,
		});
	}, [
		columns,
		dataSource,
		query,
		queryTableData,
		renderActionCell,
		renderColumnCell,
	]);

	const downloadableData = createDownloadableData(newDataSource);

	const tableColumns = modifyColumns ? modifyColumns(newColumns) : newColumns;

	const paginationConfig = {
		pageSize: 10,
		showSizeChanger: false,
		hideOnSinglePage: true,
	};

	const [filterTable, setFilterTable] = useState<RowData[] | null>(null);

	const onTableSearch = useCallback(
		(value?: string): void => {
			const filterTable = newDataSource.filter((o) =>
				Object.keys(o).some((k) =>
					String(o[k])
						.toLowerCase()
						.includes(value?.toLowerCase() || ''),
				),
			);

			setFilterTable(filterTable);
		},
		[newDataSource],
	);

	useEffect(() => {
		onTableSearch(searchTerm);
	}, [newDataSource, onTableSearch, searchTerm]);

	return (
		<div className="query-table">
			{isDownloadEnabled && (
				<div className="query-table--download">
					<Download
						data={downloadableData}
						fileName={`${fileName}-${servicename}`}
						isLoading={loading as boolean}
					/>
				</div>
			)}
			<ResizeTable
				columns={tableColumns}
				tableLayout="fixed"
				dataSource={filterTable === null ? newDataSource : filterTable}
				scroll={{ x: true }}
				pagination={paginationConfig}
				sticky={sticky}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</div>
	);
}
