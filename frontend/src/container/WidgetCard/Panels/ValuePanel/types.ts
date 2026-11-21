import type { UseQueryResult } from 'react-query';
import type { ThresholdProps } from 'types/api/widgets/threshold';
import type { ContextLinksData, Widgets } from 'types/api/widgets/widget';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type uPlot from 'uplot';

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
