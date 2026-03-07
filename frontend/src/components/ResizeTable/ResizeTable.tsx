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
import { Table } from 'antd';
import type { ColumnsType } from 'antd/lib/table';
import cx from 'classnames';
import { dragColumnParams } from 'hooks/useDragColumns/configs';
import { getColumnWidth, RowData } from 'lib/query/createTableColumnsFromQuery';
import { debounce, set } from 'lodash-es';

import ResizableHeader from './ResizableHeader';
import { DragSpanStyle } from './styles';
import { ResizeTableProps } from './types';

// eslint-disable-next-line sonarjs/cognitive-complexity
function ResizeTable({
	columns,
	onDragColumn,
	pagination,
	columnWidths,
	onColumnWidthsChange,
	...restProps
}: ResizeTableProps): JSX.Element {
	const [columnsData, setColumns] = useState<ColumnsType>([]);
	const onColumnWidthsChangeRef = useRef(onColumnWidthsChange);

	const updateAllColumnWidths = useRef(
		debounce((widthsConfig: Record<string, number>) => {
			if (!onColumnWidthsChangeRef.current) {
				return;
			}
			onColumnWidthsChangeRef.current(widthsConfig);
		}, 1000),
	).current;

	useEffect(() => {
		onColumnWidthsChangeRef.current = onColumnWidthsChange;
	}, [onColumnWidthsChange]);

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
						<DragSpanStyle className="dragHandler" data-testid="drag-column-title">
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
		if (!columns) {
			return;
		}

		const columnsWithStoredWidths = columns.map((col) => {
			const dataIndex = (col as RowData).dataIndex as string;
			if (dataIndex && columnWidths) {
				const width = getColumnWidth(dataIndex, columnWidths);
				if (width) {
					return { ...col, width };
				}
			}
			return col;
		});

		setColumns(columnsWithStoredWidths);
	}, [columns, columnWidths]);

	const lastReportedWidthsRef = useRef<Record<string, number>>({});

	useEffect(() => {
		if (!onColumnWidthsChange) {
			return;
		}

		const newColumnWidths: Record<string, number> = {};

		mergedColumns.forEach((col) => {
			if (col.width && (col as RowData).dataIndex) {
				const dataIndex = (col as RowData).dataIndex as string;
				newColumnWidths[dataIndex] = col.width as number;
			}
		});

		if (Object.keys(newColumnWidths).length === 0) {
			return;
		}

		const last = lastReportedWidthsRef.current;
		const hasChange =
			Object.keys(newColumnWidths).length !== Object.keys(last).length ||
			Object.keys(newColumnWidths).some((k) => newColumnWidths[k] !== last[k]);

		if (hasChange) {
			lastReportedWidthsRef.current = newColumnWidths;
			updateAllColumnWidths(newColumnWidths);
		}
	}, [mergedColumns, updateAllColumnWidths, onColumnWidthsChange]);

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
