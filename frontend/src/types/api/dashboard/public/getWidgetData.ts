import { MetricRangePayloadProps } from "types/api/metrics/getQueryRange";

export interface PublicDashboardWidgetDataProps {
	data: MetricRangePayloadProps['data'];
}

export type GetPublicDashboardWidgetDataProps = {
	id: string;
	index: number;
	startTime: number;
	endTime: number;
};

export interface PayloadProps {
	data: PublicDashboardWidgetDataProps;
	status: string;
}
