import { Dispatch, SetStateAction } from 'react';
import { UseQueryResult } from 'react-query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { WidgetGraphComponentProps } from 'container/GridCardLayout/GridCard/types';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

export type PanelWrapperProps = {
	queryResponse: UseQueryResult<MetricQueryRangeSuccessResponse, Error>;
	widget: Widgets;
	setRequestData?: WidgetGraphComponentProps['setRequestData'];
	isFullViewMode?: boolean;
	onToggleModelHandler?: () => void;
	graphVisibility?: boolean[];
	setGraphVisibility?: Dispatch<SetStateAction<boolean[]>>;
	onClickHandler?: OnClickPluginOpts['onClick'];
	onDragSelect: (start: number, end: number) => void;
	selectedGraph?: PANEL_TYPES;
	tableProcessedDataRef?: React.MutableRefObject<RowData[]>;
	searchTerm?: string;
	customTooltipElement?: HTMLDivElement;
	openTracesButton?: boolean;
	onOpenTraceBtnClick?: (record: RowData) => void;
	customOnRowClick?: (record: RowData) => void;
	customSeries?: (data: QueryData[]) => uPlot.Series[];
	enableDrillDown?: boolean;
	panelMode: PanelMode;
};

export type TooltipData = {
	label: string;
	key: string;
	value: string;
	color: string;
};
