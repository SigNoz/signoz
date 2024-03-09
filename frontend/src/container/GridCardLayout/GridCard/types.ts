import { ToggleGraphProps } from 'components/Graph/types';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { MenuItemKeys } from '../WidgetHeader/contants';
import { LegendEntryProps } from './FullView/types';

export interface GraphVisibilityLegendEntryProps {
	graphVisibilityStates: boolean[];
	legendEntry: LegendEntryProps[];
}

export interface WidgetGraphComponentProps {
	widget: Widgets;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	errorMessage: string | undefined;
	version?: string;
	threshold?: ReactNode;
	headerMenuList: MenuItemKeys[];
	isWarning: boolean;
	isFetchingResponse: boolean;
	setRequestData?: Dispatch<SetStateAction<GetQueryResultsProps>>;
}

export interface GridCardGraphProps {
	widget: Widgets;
	threshold?: ReactNode;
	headerMenuList?: WidgetGraphComponentProps['headerMenuList'];
	isQueryEnabled: boolean;
	variables?: Dashboard['data']['variables'];
	version?: string;
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
