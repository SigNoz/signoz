import { ChartData } from 'chart.js';
import { GraphOnClickHandler, ToggleGraphProps } from 'components/Graph/types';
import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Layout } from 'react-grid-layout';
import { UseQueryResult } from 'react-query';
import { DeleteWidgetProps } from 'store/actions/dashboard/deleteWidget';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { LayoutProps } from '..';
import { LegendEntryProps } from './FullView/types';

export interface GraphVisibilityLegendEntryProps {
	graphVisibilityStates: boolean[];
	legendEntry: LegendEntryProps[];
}

export interface DispatchProps {
	deleteWidget: ({
		widgetId,
	}: DeleteWidgetProps) => (dispatch: Dispatch<AppActions>) => void;
}

export interface WidgetGraphComponentProps extends DispatchProps {
	enableModel: boolean;
	enableWidgetHeader: boolean;
	widget: Widgets;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	data: ChartData;
	name: string;
	yAxisUnit?: string;
	layout?: Layout[];
	setLayout?: Dispatch<SetStateAction<LayoutProps[]>>;
	onDragSelect?: (start: number, end: number) => void;
	onClickHandler?: GraphOnClickHandler;
	allowDelete?: boolean;
	allowClone?: boolean;
	allowEdit?: boolean;
}

export interface GridCardGraphProps {
	widget: Widgets;
	name: string;
	yAxisUnit: string | undefined;
	// eslint-disable-next-line react/require-default-props
	layout?: Layout[];
	// eslint-disable-next-line react/require-default-props
	setLayout?: Dispatch<SetStateAction<LayoutProps[]>>;
	onDragSelect?: (start: number, end: number) => void;
	onClickHandler?: GraphOnClickHandler;
	allowDelete?: boolean;
	allowClone?: boolean;
	allowEdit?: boolean;
	isQueryEnabled?: boolean;
}

export interface GetGraphVisibilityStateOnLegendClickProps {
	data: ChartData;
	isExpandedName: boolean;
	name: string;
}

export interface ToggleGraphsVisibilityInChartProps {
	graphsVisibilityStates: GraphVisibilityLegendEntryProps['graphVisibilityStates'];
	lineChartRef: MutableRefObject<ToggleGraphProps | undefined>;
}
