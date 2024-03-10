import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { Dispatch, SetStateAction } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { ThresholdProps } from './RightContainer/Threshold/types';
import { timePreferance } from './RightContainer/timeItems';

export interface NewWidgetProps {
	selectedGraph: PANEL_TYPES;
	yAxisUnit: Widgets['yAxisUnit'];
	fillSpans: Widgets['fillSpans'];
}

export interface WidgetGraphProps extends NewWidgetProps {
	queryResponse?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	setRequestData?: Dispatch<SetStateAction<GetQueryResultsProps>>;
	selectedTime: timePreferance;
	thresholds: ThresholdProps[];
	softMin: number | null;
	softMax: number | null;
	selectedLogFields: Widgets['selectedLogFields'];
	setSelectedLogFields?: Dispatch<SetStateAction<Widgets['selectedLogFields']>>;
	selectedTracesFields: Widgets['selectedTracesFields'];
	setSelectedTracesFields?: Dispatch<
		SetStateAction<Widgets['selectedTracesFields']>
	>;
	selectedWidget: Widgets;
}

export type WidgetGraphContainerProps = NewWidgetProps & {
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	setRequestData: Dispatch<SetStateAction<GetQueryResultsProps>>;
	selectedTime: timePreferance;
	thresholds: ThresholdProps[];
	softMin: number | null;
	softMax: number | null;
	selectedLogFields: Widgets['selectedLogFields'];
	setSelectedLogFields?: Dispatch<SetStateAction<Widgets['selectedLogFields']>>;
	selectedTracesFields: Widgets['selectedTracesFields'];
	setSelectedTracesFields?: Dispatch<
		SetStateAction<Widgets['selectedTracesFields']>
	>;
	selectedWidget: Widgets;
};
