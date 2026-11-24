import type { Dispatch, SetStateAction } from 'react';
import type { UseQueryResult } from 'react-query';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import type { PanelMode } from 'lib/visualization/panels/types';
import type { WidgetGraphComponentProps } from 'container/WidgetCard/Card/types';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';
import type { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { Widgets } from 'types/api/widgets/widget';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { QueryData } from 'types/api/widgets/getQuery';

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
	onColumnWidthsChange?: (widths: Record<string, number>) => void;
	groupByPerQuery?: Record<string, BaseAutocompleteData[]>;
	hidePagination?: boolean;
};

export type TooltipData = {
	label: string;
	key: string;
	value: string;
	color: string;
};
