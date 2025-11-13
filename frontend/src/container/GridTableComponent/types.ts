import { TableProps } from 'antd';
import { PrecisionOption } from 'components/Graph/yAxisConfig';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { LogsExplorerTableProps } from 'container/LogsExplorerTable/LogsExplorerTable.interfaces';
import {
	ThresholdOperators,
	ThresholdProps,
} from 'container/NewWidget/RightContainer/Threshold/types';
import { QueryTableProps } from 'container/QueryTable/QueryTable.intefaces';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ColumnUnit, ContextLinksData } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

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
