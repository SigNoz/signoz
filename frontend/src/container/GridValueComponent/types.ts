import { ThresholdProps } from 'container/NewWidget/RightContainer/Threshold/types';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { ContextLinksData, Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

export type GridValueComponentProps = {
	data: uPlot.AlignedData;
	options?: uPlot.Options;
	title?: React.ReactNode;
	yAxisUnit?: string;
	thresholds?: ThresholdProps[];
	// Context menu related props
	widget?: Widgets;
	queryResponse?: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
	contextLinks?: ContextLinksData;
	enableDrillDown?: boolean;
};
