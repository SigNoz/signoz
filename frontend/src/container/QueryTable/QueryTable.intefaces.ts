import type { ReactNode } from 'react';
import type { TableColumnsType as ColumnsType, TableProps } from 'antd';
import type { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import type { DownloadOptions } from 'container/Download/Download.types';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';
import type { ContextLinksData } from 'types/api/widgets/widget';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import type { QueryDataV3 } from 'types/api/widgets/getQuery';

export type QueryTableProps = Omit<
	TableProps<RowData>,
	'columns' | 'dataSource'
> & {
	queryTableData: QueryDataV3[];
	query: Query;
	renderActionCell?: (record: RowData) => ReactNode;
	modifyColumns?: (columns: ColumnsType<RowData>) => ColumnsType<RowData>;
	renderColumnCell?: Record<string, (...args: any[]) => ReactNode>;
	downloadOption?: DownloadOptions;
	columns?: ColumnsType<RowData>;
	dataSource?: RowData[];
	sticky?: TableProps<RowData>['sticky'];
	searchTerm?: string;
	widgetId?: string;
	columnWidths?: Record<string, number>;
	onColumnWidthsChange?: (widths: Record<string, number>) => void;
	enableDrillDown?: boolean;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
	queryRangeRequest?: QueryRangeRequestV5;
};
