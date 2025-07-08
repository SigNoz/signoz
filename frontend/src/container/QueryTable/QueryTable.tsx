import './QueryTable.styles.scss';

import { ResizeTable } from 'components/ResizeTable';
import Download from 'container/Download/Download';
import { IServiceName } from 'container/MetricsApplication/Tabs/types';
import {
	createTableColumnsFromQuery,
	RowData,
} from 'lib/query/createTableColumnsFromQuery';
import ContextMenu, { useCoordinates } from 'periscope/components/ContextMenu';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { QueryTableProps } from './QueryTable.intefaces';
import useTableContextMenu from './useTableContextMenu';
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
	widgetId,
	...props
}: QueryTableProps): JSX.Element {
	const { isDownloadEnabled = false, fileName = '' } = downloadOption || {};
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);
	const { loading } = props;

	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
	} = useCoordinates();
	const { menuItemsConfig } = useTableContextMenu({
		widgetId: widgetId || '',
		query,
		clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
	});

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

	// Add click handlers to columns to capture clicked data
	const columnsWithClickHandlers = useMemo(
		() =>
			tableColumns.map((column: any): any => ({
				...column,
				render: (text: any, record: RowData, index: number): JSX.Element => {
					const originalRender = column.render;
					const renderedContent = originalRender
						? originalRender(text, record, index)
						: text;

					return (
						<div
							// have its dimension equal to the column width
							onClick={(e): void => {
								e.stopPropagation();
								onClick(e, { record, column, tableColumns });
							}}
							onKeyDown={(e): void => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									e.stopPropagation();
									onClick(e as any, { record, column, tableColumns });
								}
							}}
							style={{ cursor: 'pointer' }}
							role="button"
							tabIndex={0}
						>
							{renderedContent}
						</div>
					);
				},
			})),
		[tableColumns, onClick],
	);

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
		<>
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
					columns={columnsWithClickHandlers}
					tableLayout="fixed"
					dataSource={filterTable === null ? newDataSource : filterTable}
					scroll={{ x: 'max-content' }}
					pagination={paginationConfig}
					widgetId={widgetId}
					shouldPersistColumnWidths
					sticky={sticky}
					// eslint-disable-next-line react/jsx-props-no-spreading
					{...props}
				/>
			</div>
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
		</>
	);
}
