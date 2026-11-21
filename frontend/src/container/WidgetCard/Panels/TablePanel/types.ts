import type { TableProps } from 'antd';
import type { PrecisionOption } from 'components/Graph/types';
import type { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import type { LogsExplorerTableProps } from 'container/LogsExplorerTable/LogsExplorerTable.interfaces';
import type {
	ThresholdOperators,
	ThresholdProps,
} from 'types/api/widgets/threshold';
import type { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';
import type { ColumnUnit } from 'types/api/widgets/columnUnit';
import type { ContextLinksData } from 'types/api/widgets/widget';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

export type GridTableComponentProps = {
	query: Query;
	thresholds?: ThresholdProps[];
	columnUnits?: ColumnUnit;
	decimalPrecision?: PrecisionOption;
	tableProcessedDataRef?: React.MutableRefObject<RowData[]>;
	sticky?: TableProps<RowData>['sticky'];
	searchTerm?: string;
	openTracesButton?: boolean;
	onOpenTraceBtnClick?: (record: RowData) => void;
	customOnRowClick?: (record: RowData) => void;
	widgetId?: string;
	columnWidths?: Record<string, number>;
	onColumnWidthsChange?: (widths: Record<string, number>) => void;
	renderColumnCell?: QueryTableProps['renderColumnCell'];
	customColTitles?: Record<string, string>;
	enableDrillDown?: boolean;
	contextLinks?: ContextLinksData;
	panelType?: PANEL_TYPES;
	queryRangeRequest?: QueryRangeRequestV5;
	hiddenColumns?: string[];
} & Pick<LogsExplorerTableProps, 'data'> &
	Omit<TableProps<RowData>, 'columns' | 'dataSource'>;

export type RequiredThresholdProps = Omit<
	ThresholdProps,
	'thresholdTableOptions' | 'thresholdOperator' | 'thresholdValue'
> & {
	thresholdTableOptions: string;
	thresholdOperator: ThresholdOperators;
	thresholdValue: number;
};
