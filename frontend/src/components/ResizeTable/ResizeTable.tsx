/* eslint-disable react/jsx-props-no-spreading */

import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import cx from 'classnames';
import { dragColumnParams } from 'hooks/useDragColumns/configs';
import { getColumnWidth, RowData } from 'lib/query/createTableColumnsFromQuery';
import { debounce, set } from 'lodash-es';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	SyntheticEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import ReactDragListView from 'react-drag-listview';
import { ResizeCallbackData } from 'react-resizable';
import { Widgets } from 'types/api/dashboard/getAll';

import ResizableHeader from './ResizableHeader';
import { DragSpanStyle } from './styles';
import { ResizeTableProps } from './types';

// eslint-disable-next-line sonarjs/cognitive-complexity
function ResizeTable({
	columns,
	onDragColumn,
	pagination,
	widgetId,
	shouldPersistColumnWidths = false,
	...restProps
}: ResizeTableProps): JSX.Element {
	const [columnsData, setColumns] = useState<ColumnsType>([]);
	const { setColumnWidths, selectedDashboard } = useDashboard();

	const columnWidths = shouldPersistColumnWidths
		? (selectedDashboard?.data?.widgets?.find(
				(widget) => widget.id === widgetId,
		  ) as Widgets)?.columnWidths
		: undefined;

	const updateAllColumnWidths = useRef(
		debounce((widthsConfig: Record<string, number>) => {
			if (!widgetId || !shouldPersistColumnWidths) return;
			setColumnWidths?.((prev) => ({
				...prev,
				[widgetId]: widthsConfig,
			}));
		}, 1000),
	).current;

	const handleResize = useCallback(
		(index: number) => (
			e: SyntheticEvent<Element>,
			{ size }: ResizeCallbackData,
		): void => {
			e.preventDefault();
			e.stopPropagation();

			const newColumns = [...columnsData];
			newColumns[index] = {
				...newColumns[index],
				width: size.width,
			};
			setColumns(newColumns);
		},
		[columnsData],
	);

	const mergedColumns = useMemo(
		() =>
			columnsData.map((col, index) => ({
				...col,
				...(onDragColumn && {
					title: (
						<DragSpanStyle className="dragHandler">
							{col?.title?.toString() || ''}
						</DragSpanStyle>
					),
				}),
				onHeaderCell: (column: ColumnsType<unknown>[number]): unknown => ({
					width: column.width,
					onResize: handleResize(index),
				}),
			})) as ColumnsType<any>,
		[columnsData, onDragColumn, handleResize],
	);

	const tableParams = useMemo(() => {
		const props = {
			...restProps,
			components: { header: { cell: ResizableHeader } },
			columns: mergedColumns,
			className: cx('resize-main-table', restProps.className),
		};

		set(
			props,
			'pagination',
			pagination ? { ...pagination, hideOnSinglePage: true } : false,
		);

		return props;
	}, [mergedColumns, pagination, restProps]);

	useEffect(() => {
		if (columns) {
			// Apply stored column widths from widget configuration
			const columnsWithStoredWidths = columns.map((col) => {
				const dataIndex = (col as RowData).dataIndex as string;
				if (dataIndex && columnWidths) {
					const width = getColumnWidth(dataIndex, columnWidths);
					if (width) {
						return {
							...col,
							width, // Apply stored width
						};
					}
				}
				return col;
			});

			setColumns(columnsWithStoredWidths);
		}
	}, [columns, columnWidths]);

	useEffect(() => {
		if (!shouldPersistColumnWidths) return;
		// Collect all column widths in a single object
		const newColumnWidths: Record<string, number> = {};

		mergedColumns.forEach((col) => {
			if (col.width && (col as RowData).dataIndex) {
				const dataIndex = (col as RowData).dataIndex as string;
				newColumnWidths[dataIndex] = col.width as number;
			}
		});

		// Only update if there are actual widths to set
		if (Object.keys(newColumnWidths).length > 0) {
			updateAllColumnWidths(newColumnWidths);
		}
	}, [mergedColumns, updateAllColumnWidths, shouldPersistColumnWidths]);

	return onDragColumn ? (
		<ReactDragListView.DragColumn {...dragColumnParams} onDragEnd={onDragColumn}>
			<Table {...tableParams} />
		</ReactDragListView.DragColumn>
	) : (
		<Table {...tableParams} />
	);
}

ResizeTable.defaultProps = {
	onDragColumn: undefined,
};

export default ResizeTable;
