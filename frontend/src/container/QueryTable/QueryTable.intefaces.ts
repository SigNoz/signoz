import { TableProps } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DownloadOptions } from 'container/Download/Download.types';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';
import { ContextLinksData } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

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
	enableDrillDown?: boolean;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
	queryRangeRequest?: QueryRangeRequestV5;
};
