import type {
	Dispatch,
	MutableRefObject,
	ReactNode,
	SetStateAction,
} from 'react';
import type { UseQueryResult } from 'react-query';
import type { ToggleGraphProps } from 'components/Graph/types';
import type { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import type { RowData } from 'lib/query/createTableColumnsFromQuery';
import type { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import type { Widgets } from 'types/api/widgets/widget';
import type {
	MetricQueryRangeSuccessResponse,
	MetricRangePayloadProps,
} from 'types/api/metrics/getQueryRange';
import type { QueryData } from 'types/api/widgets/getQuery';
import type uPlot from 'uplot';

import type { MenuItemKeys } from 'container/WidgetCard/Header/contants';
import type { LegendEntryProps } from 'container/WidgetCard/Card/FullView/types';

export interface GraphVisibilityLegendEntryProps {
	graphVisibilityStates: boolean[];
	legendEntry: LegendEntryProps[];
}

export interface WidgetGraphComponentProps {
	widget: Widgets;
	queryResponse: UseQueryResult<MetricQueryRangeSuccessResponse, Error>;
	errorMessage: string | undefined;
	version?: string;
	threshold?: ReactNode;
	headerMenuList: MenuItemKeys[];
	isWarning: boolean;
	isFetchingResponse: boolean;
	setRequestData?: Dispatch<SetStateAction<GetQueryResultsProps>>;
	onClickHandler?: OnClickPluginOpts['onClick'];
	onDragSelect: (start: number, end: number) => void;
	customOnDragSelect?: (start: number, end: number) => void;
	customTooltipElement?: HTMLDivElement;
	openTracesButton?: boolean;
	onOpenTraceBtnClick?: (record: RowData) => void;
	customSeries?: (data: QueryData[]) => uPlot.Series[];
	customErrorMessage?: string;
	customOnRowClick?: (record: RowData) => void;
	customTimeRangeWindowForCoRelation?: string | undefined;
	enableDrillDown?: boolean;
	/** Hide list-panel pagination controls (e.g. public dashboards, where paging isn't supported). */
	hidePagination?: boolean;
}

export interface GridCardGraphProps {
	widget: Widgets;
	threshold?: ReactNode;
	headerMenuList?: WidgetGraphComponentProps['headerMenuList'];
	onClickHandler?: OnClickPluginOpts['onClick'];
	isQueryEnabled: boolean;
	version?: string;
	onDragSelect: (start: number, end: number) => void;
	customOnDragSelect?: (start: number, end: number) => void;
	customTooltipElement?: HTMLDivElement;
	dataAvailable?: (isDataAvailable: boolean) => void;
	getGraphData?: (graphData?: MetricRangePayloadProps['data']) => void;
	openTracesButton?: boolean;
	onOpenTraceBtnClick?: (record: RowData) => void;
	customSeries?: (data: QueryData[]) => uPlot.Series[];
	customErrorMessage?: string;
	start?: number;
	end?: number;
	analyticsEvent?: string;
	customTimeRange?: {
		startTime: number;
		endTime: number;
	};
	customOnRowClick?: (record: RowData) => void;
	customTimeRangeWindowForCoRelation?: string | undefined;
	enableDrillDown?: boolean;
}

export interface GetGraphVisibilityStateOnLegendClickProps {
	options: uPlot.Options;
	isExpandedName: boolean;
	name: string;
}

export interface ToggleGraphsVisibilityInChartProps {
	graphsVisibilityStates: GraphVisibilityLegendEntryProps['graphVisibilityStates'];
	lineChartRef: MutableRefObject<ToggleGraphProps | undefined>;
}
