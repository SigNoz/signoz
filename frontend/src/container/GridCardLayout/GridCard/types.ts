import { GraphOnClickHandler, ToggleGraphProps } from 'components/Graph/types';
import { UplotProps } from 'components/Uplot/Uplot';
import { MutableRefObject, ReactNode } from 'react';
import { UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { MenuItemKeys } from '../WidgetHeader/contants';
import { LegendEntryProps } from './FullView/types';

export interface GraphVisibilityLegendEntryProps {
	graphVisibilityStates: boolean[];
	legendEntry: LegendEntryProps[];
}

export interface WidgetGraphComponentProps extends UplotProps {
	widget: Widgets;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	name: string;
	onDragSelect?: (start: number, end: number) => void;
	onClickHandler?: GraphOnClickHandler;
	threshold?: ReactNode;
	headerMenuList: MenuItemKeys[];
	isWarning: boolean;
}

export interface GridCardGraphProps {
	widget: Widgets;
	name: string;
	onDragSelect?: (start: number, end: number) => void;
	onClickHandler?: GraphOnClickHandler;
	threshold?: ReactNode;
	headerMenuList?: WidgetGraphComponentProps['headerMenuList'];
	isQueryEnabled: boolean;
	variables?: Dashboard['data']['variables'];
}

export interface GetGraphVisibilityStateOnLegendClickProps {
	data: uPlot.AlignedData;
	isExpandedName: boolean;
	name: string;
}

export interface ToggleGraphsVisibilityInChartProps {
	graphsVisibilityStates: GraphVisibilityLegendEntryProps['graphVisibilityStates'];
	lineChartRef: MutableRefObject<ToggleGraphProps | undefined>;
}
