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
	...props
}: QueryTableProps): JSX.Element {
	const { isDownloadEnabled = false, fileName = '' } = downloadOption || {};
	const { servicename } = useParams<IServiceName>();
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

	const downloadableData = createDownloadableData(dataSource);

	const tableColumns = modifyColumns ? modifyColumns(columns) : columns;

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
