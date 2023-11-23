import './QueryTable.styles.scss';

import { ResizeTable } from 'components/ResizeTable';
import Download from 'container/Download/Download';
import { IServiceName } from 'container/MetricsApplication/Tabs/types';
import { createTableColumnsFromQuery } from 'lib/query/createTableColumnsFromQuery';
import { useMemo } from 'react';
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
	...props
}: QueryTableProps): JSX.Element {
	const { isDownloadEnabled = false, fileName = '' } = downloadOption || {};
	const { servicename } = useParams<IServiceName>();
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
				dataSource={dataSource}
				scroll={{ x: true }}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</div>
	);
}
