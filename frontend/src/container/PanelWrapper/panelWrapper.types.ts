import { PANEL_TYPES } from 'constants/queryBuilder';
import { WidgetGraphComponentProps } from 'container/GridCardLayout/GridCard/types';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { Dispatch, SetStateAction } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

export type PanelWrapperProps = {
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
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
	customSeries?: (data: QueryData[]) => uPlot.Series[];
};

export type TooltipData = {
	label: string;
	key: string;
	value: string;
	color: string;
};
