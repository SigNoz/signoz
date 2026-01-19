export interface GetMetricMetadataResponse {
	status: string;
	data: {
		description: string;
		type: string;
		unit: string;
		temporality: string;
		isMonotonic: boolean;
	};
}

export interface GetMetricHighlightsResponse {
	status: string;
	data: {
		dataPoints: number;
		lastReceived: number;
		totalTimeSeries: number;
		activeTimeSeries: number;
	};
}

export interface GetMetricAttributesRequest {
	metricName: string;
	start?: number;
	end?: number;
}

export interface GetMetricAttributesResponse {
	status: string;
	data: {
		attributes: {
			key: string;
			values: string[];
			valueCount: number;
		}[];
		totalKeys: number;
	};
}

export interface GetMetricAlertsResponse {
	status: string;
	data: {
		alerts: {
			alertName: string;
			alertId: string;
		}[];
	};
}

export interface GetMetricDashboardsResponse {
	status: string;
	data: {
		dashboards: {
			dashboardName: string;
			dashboardId: string;
			widgetId: string;
			widgetName: string;
		}[];
	};
}

export interface UpdateMetricMetadataRequest {
	type: string;
	description: string;
	temporality: string;
	unit: string;
	isMonotonic: boolean;
}

export interface UpdateMetricMetadataResponse {
	status: string;
}

export interface UseUpdateMetricMetadataProps {
	metricName: string;
	payload: UpdateMetricMetadataRequest;
}
