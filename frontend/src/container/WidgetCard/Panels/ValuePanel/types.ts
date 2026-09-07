import { UseQueryResult } from 'react-query';
import { ThresholdProps } from 'types/api/widgets/threshold';
import { ContextLinksData, Widgets } from 'types/api/widgets/widget';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

export type GridValueComponentProps = {
	data: uPlot.AlignedData;
	options?: uPlot.Options;
	title?: React.ReactNode;
	yAxisUnit?: string;
	thresholds?: ThresholdProps[];
	// Context menu related props
	widget?: Widgets;
	queryResponse?: UseQueryResult<MetricQueryRangeSuccessResponse, Error>;
	contextLinks?: ContextLinksData;
	enableDrillDown?: boolean;
};
