import { TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaginationProps } from 'antd/lib';
import type { ColumnGroupType, ColumnType } from 'antd/lib/table';
import { LaunchChatSupportProps } from 'components/LaunchChatSupport/LaunchChatSupport';

import { TableDataSource } from './contants';

type ColumnWidths = Record<string, number>;

export interface ResizeTableProps extends TableProps<any> {
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
	/**
	 * Pre-resolved column widths for this table, keyed by column dataIndex.
	 * Use this to apply persisted widths on mount (e.g. from widget.columnWidths).
	 * Do NOT pass a value that updates reactively on every resize — that creates a
	 * feedback loop. Pass only stable / persisted values.
	 */
	columnWidths?: ColumnWidths;
	/**
	 * Called (debounced) whenever the user finishes resizing a column.
	 * The widths object contains all current column widths keyed by dataIndex.
	 * Intended for persisting widths to an external store (e.g. dashboard context
	 * staging buffer). The caller owns the storage; ResizeTable does not read back
	 * whatever is written here.
	 */
	onColumnWidthsChange?: (widths: ColumnWidths) => void;
}
export interface DynamicColumnTableProps extends TableProps<any> {
	tablesource: (typeof TableDataSource)[keyof typeof TableDataSource];
	dynamicColumns: TableProps<any>['columns'];
	onDragColumn?: (fromIndex: number, toIndex: number) => void;
	facingIssueBtn?: LaunchChatSupportProps;
	shouldSendAlertsLogEvent?: boolean;
	pagination?: PaginationProps;
}

export type GetVisibleColumnsFunction = (
	props: GetVisibleColumnProps,
) => (ColumnGroupType<any> | ColumnType<any>)[];

export type GetVisibleColumnProps = {
	tablesource: (typeof TableDataSource)[keyof typeof TableDataSource];
	dynamicColumns?: ColumnsType<any>;
	columnsData?: ColumnsType;
};

export type SetVisibleColumnsProps = {
	checked: boolean;
	index: number;
	tablesource: (typeof TableDataSource)[keyof typeof TableDataSource];
	dynamicColumns?: ColumnsType<any>;
};

type GetNewColumnDataProps = {
	prevColumns?: ColumnsType;
	checked: boolean;
	dynamicColumns?: ColumnsType<any>;
	index: number;
};

export type GetNewColumnDataFunction = (
	props: GetNewColumnDataProps,
) => ColumnsType | undefined;
