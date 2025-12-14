import './QueryTable.styles.scss';

import cx from 'classnames';
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

import useTableContextMenu from './Drilldown/useTableContextMenu';
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
	widgetId,
	panelType,
	...props
}: QueryTableProps): JSX.Element {
	const { isDownloadEnabled = false, fileName = '' } = downloadOption || {};
	const isQueryTypeBuilder = query.queryType === 'builder';

	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);
	const { loading, enableDrillDown = false, contextLinks } = props;

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
		contextLinks,
		panelType,
		queryRangeRequest: props.queryRangeRequest,
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

	const handleColumnClick = useCallback(
		(
			e: React.MouseEvent,
			record: RowData,
			column: any,
			tableColumns: any,
		): void => {
			if (isQueryTypeBuilder && enableDrillDown) {
				e.stopPropagation();

				onClick({ x: e.clientX, y: e.clientY }, { record, column, tableColumns });
			}
		},
		[isQueryTypeBuilder, enableDrillDown, onClick],
	);

	// Click handler to columns to capture clicked data
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
							role="button"
							className={cx({
								'clickable-cell': isQueryTypeBuilder && enableDrillDown,
							})}
							tabIndex={0}
							onClick={(e): void => {
								handleColumnClick(e, record, column, tableColumns);
							}}
							onKeyDown={(): void => {}}
						>
							{renderedContent}
						</div>
					);
				},
			})),
		[tableColumns, isQueryTypeBuilder, enableDrillDown, handleColumnClick],
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
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
		</>
	);
}
