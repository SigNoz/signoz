import { QueryRangeResponseV5 } from 'types/api/v5/queryRange';

/**
 * The public dashboard widget API returns V5 format response directly
 */
export type PublicDashboardWidgetDataProps = QueryRangeResponseV5;

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
