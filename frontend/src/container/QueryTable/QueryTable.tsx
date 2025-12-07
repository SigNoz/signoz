import './QueryTable.styles.scss';

import { Pagination as AntPagination } from 'antd';
import cx from 'classnames';
import { ResizeTable } from 'components/ResizeTable';
import Download from 'container/Download/Download';
import { IServiceName } from 'container/MetricsApplication/Tabs/types';
import { DEFAULT_PER_PAGE_OPTIONS, Pagination } from 'hooks/queryPagination';
import {
	createTableColumnsFromQuery,
	RowData,
} from 'lib/query/createTableColumnsFromQuery';
import ContextMenu, { useCoordinates } from 'periscope/components/ContextMenu';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import useTableContextMenu from './Drilldown/useTableContextMenu';
import { QueryTableProps } from './QueryTable.intefaces';
import { createDownloadableData, getFormattedTimestamp } from './utils';

// I saw this done in other places
const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

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

	const [pagination, setPagination] = useState<Pagination>({
		limit: 10,
		offset: 0,
	});

	const paginatedData = useMemo(() => {
		const source = filterTable ?? newDataSource;
		return source.slice(pagination.offset, pagination.offset + pagination.limit);
	}, [filterTable, newDataSource, pagination.offset, pagination.limit]);

	const handlePageChange = useCallback(
		(page: number, pageSize: number): void => {
			setPagination({
				limit: pageSize,
				offset: (page - 1) * pageSize,
			});
		},
		[],
	);

	const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
	const totalItems = filterTable?.length ?? newDataSource.length;

	return (
		<>
			<div className="query-table-controls">
				<AntPagination
					current={currentPage}
					pageSize={pagination.limit}
					total={totalItems}
					onChange={handlePageChange}
					showSizeChanger
					pageSizeOptions={PER_PAGE_OPTIONS}
					disabled={loading as boolean}
					showTotal={(total, range): string =>
						`${range[0]}-${range[1]} of ${total} items`
					}
				/>
				{isDownloadEnabled && (
					<Download
						data={downloadableData}
						fileName={`${fileName}-${servicename}-${getFormattedTimestamp()}`}
						isLoading={loading as boolean}
					/>
				)}
			</div>

			<div className="query-table">
				<ResizeTable
					columns={columnsWithClickHandlers}
					tableLayout="fixed"
					dataSource={paginatedData}
					scroll={{ x: 'max-content' }}
					pagination={false}
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
